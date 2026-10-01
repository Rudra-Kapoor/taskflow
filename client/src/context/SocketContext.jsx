import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { API_BASE_URL, recoverRejectedToken, tokenStorage } from '@/api/client';
import { invalidateProjectTasks } from '@/lib/cache';
import { registerRealtimeHandlers } from '@/realtime/handlers';
import { useAuth } from './AuthContext';

/** Socket.IO origin: `VITE_SOCKET_URL`, else the API's (this page's when the API is relative). */
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || new URL(API_BASE_URL, window.location.origin).origin;

const JOIN_ACK_TIMEOUT_MS = 10_000;
/** Delay before retrying a connection the server refused for a reason other than auth. */
const REFUSED_RETRY_DELAY_MS = 5_000;
/**
 * How long a connection the server closed (a password change revoked its token) waits for the
 * replacement token - stored by this tab or another one - before retrying with what it has.
 */
const TOKEN_REPLACEMENT_WAIT_MS = 3_000;
/**
 * Handshake refusals meaning the JWT itself was rejected ("Authentication required",
 * "Invalid or expired token"). A transient "Unable to authenticate" (e.g. database down) does
 * not match: it is retried instead of signing the user out.
 */
const AUTH_ERROR_PATTERN = /authentication required|token/i;
/** `project:join` refusals that are expected: deleted project, lost access, quick open/close. */
const EXPECTED_JOIN_REFUSALS = new Set([
  'Invalid project id',
  'Project not found',
  'You do not have access to this project',
  'Left the project before the join completed',
]);
const NO_VIEWERS = Object.freeze([]);

// Split so that connection-status consumers don't re-render on every presence update.
const SocketContext = createContext(null);
const RoomsContext = createContext(null);

/** Unique users by id (one person with several tabs open is one viewer). */
function uniqueUsers(users) {
  const seen = new Set();
  return (Array.isArray(users) ? users : []).filter((user) => {
    if (!user?._id || seen.has(user._id)) return false;
    seen.add(user._id);
    return true;
  });
}

/**
 * Owns the Socket.IO connection of the signed-in user: connects with the JWT, disconnects on
 * logout, keeps the query cache in sync with server events (see `@/realtime/handlers`), tracks
 * project rooms + presence, and refetches everything after being offline (missed events).
 * The connection outlives token changes of the same account (password change): every handshake
 * sends the current token.
 */
export function SocketProvider({ children }) {
  const { token, user, isAuthenticated } = useAuth();
  const userId = user?._id;
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [presence, setPresence] = useState({}); // projectId -> UserPublic[]

  const socketRef = useRef(null);
  const roomsRef = useRef(new Map()); // projectId -> number of mounted `useProjectRoom` callers
  const joinedRef = useRef(new Set()); // rooms the server confirmed for the current connection
  const resumeRef = useRef(null); // reconnects a connection waiting for a replacement token
  const navigateRef = useRef(navigate);
  const userRef = useRef(user);

  useEffect(() => {
    navigateRef.current = navigate;
    userRef.current = user;
  }, [navigate, user]);

  const setViewers = useCallback((projectId, users) => {
    setPresence((current) => ({ ...current, [projectId]: uniqueUsers(users) }));
  }, []);

  const requestJoin = useCallback(
    (instance, projectId) => {
      instance.timeout(JOIN_ACK_TIMEOUT_MS).emit('project:join', projectId, (error, response) => {
        // No ack (e.g. the connection dropped): the room is joined again on the next connect.
        if (error || !roomsRef.current.has(projectId)) return;
        if (response?.ok) {
          joinedRef.current.add(projectId);
          setViewers(projectId, response.users);
        } else if (!EXPECTED_JOIN_REFUSALS.has(response?.message)) {
          console.warn(`[socket] Could not join project ${projectId}: ${response?.message}`);
        }
      });
    },
    [setViewers],
  );

  useEffect(() => {
    if (!isAuthenticated || !userId) return undefined;

    let handshakeToken = null; // token sent by the latest connection attempt
    let resyncOnConnect = false; // set while offline: the next connect refetches everything
    let awaitingToken = false; // closed by the server until a replacement token arrives
    let disposed = false;
    let retryTimer;

    const instance = io(SOCKET_URL, {
      // Called before every (re)connection attempt, so the latest stored token is always sent.
      auth: (send) => {
        handshakeToken = tokenStorage.get();
        send({ token: handshakeToken });
      },
      reconnectionDelayMax: 5000,
    });
    const joinedRooms = joinedRef.current;
    socketRef.current = instance;
    setSocket(instance);

    /** Connects right away, skipping socket.io's reconnection backoff. */
    const connectNow = () => {
      awaitingToken = false;
      clearTimeout(retryTimer);
      instance.disconnect().connect();
    };
    const connectLater = (delay) => {
      clearTimeout(retryTimer);
      retryTimer = setTimeout(connectNow, delay);
    };
    resumeRef.current = () => {
      if (awaitingToken) connectNow();
    };

    const handleConnect = () => {
      setIsConnected(true);
      // Joins rooms requested while offline and re-joins them after a reconnect.
      roomsRef.current.forEach((_count, projectId) => requestJoin(instance, projectId));
      if (resyncOnConnect) queryClient.invalidateQueries(); // recover events missed meanwhile
      resyncOnConnect = false;
    };

    const handleDisconnect = (reason) => {
      setIsConnected(false);
      setPresence({});
      joinedRooms.clear();
      resyncOnConnect = true;
      if (reason !== 'io server disconnect') return; // socket.io reconnects by itself
      // The server ended the session: a password change revoked its token. Reconnect with the
      // new token (now, if it is already stored) instead of retrying the revoked one; when none
      // arrives - the password was changed on another device - the late retry fails
      // authentication and ends the session.
      if (tokenStorage.get() !== handshakeToken) {
        connectNow();
      } else {
        awaitingToken = true;
        connectLater(TOKEN_REPLACEMENT_WAIT_MS);
      }
    };

    const handleConnectError = (error) => {
      resyncOnConnect = true;
      if (instance.active) return; // temporary failure: socket.io keeps retrying
      if (!AUTH_ERROR_PATTERN.test(error?.message ?? '')) {
        connectLater(REFUSED_RETRY_DELAY_MS);
        return;
      }
      // Rejected token: retry if it was replaced meanwhile, otherwise the session ends.
      recoverRejectedToken(handshakeToken).then((retry) => {
        if (retry && !disposed) connectNow();
      });
    };

    const handlePresence = ({ projectId, users } = {}) => {
      if (projectId && roomsRef.current.has(projectId)) setViewers(projectId, users);
    };

    // The browser knows about a lost network long before a ping times out.
    const handleOffline = () => setIsConnected(false);
    // Back online: reconnect at once (rooms are re-joined and everything is refetched).
    const handleOnline = () => {
      if (!awaitingToken) connectNow();
    };

    instance.on('connect', handleConnect);
    instance.on('disconnect', handleDisconnect);
    instance.on('connect_error', handleConnectError);
    instance.on('presence:update', handlePresence);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    const unregisterHandlers = registerRealtimeHandlers(instance, {
      queryClient,
      navigate: (...args) => navigateRef.current(...args),
      getUser: () => userRef.current,
      isWatchingProject: (projectId) => joinedRooms.has(projectId),
    });

    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      resumeRef.current = null;
      unregisterHandlers();
      instance.off('connect', handleConnect);
      instance.off('disconnect', handleDisconnect);
      instance.off('connect_error', handleConnectError);
      instance.off('presence:update', handlePresence);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      instance.disconnect();
      socketRef.current = null;
      joinedRooms.clear();
      setSocket(null);
      setIsConnected(false);
      setPresence({});
    };
  }, [isAuthenticated, userId, queryClient, requestJoin, setViewers]);

  // A replacement token (password change, here or in another tab) resumes a closed connection.
  useEffect(() => {
    if (token) resumeRef.current?.();
  }, [token]);

  const joinProject = useCallback(
    (projectId) => {
      const rooms = roomsRef.current;
      const count = rooms.get(projectId) ?? 0;
      rooms.set(projectId, count + 1);
      const instance = socketRef.current;
      // While offline, the connect handler sends the join.
      if (count === 0 && instance?.connected) requestJoin(instance, projectId);
    },
    [requestJoin],
  );

  const leaveProject = useCallback(
    (projectId) => {
      const rooms = roomsRef.current;
      const count = rooms.get(projectId) ?? 0;
      if (count > 1) {
        rooms.set(projectId, count - 1);
        return;
      }
      rooms.delete(projectId);
      joinedRef.current.delete(projectId);
      const instance = socketRef.current;
      if (instance?.connected) instance.emit('project:leave', projectId);
      setPresence((current) => {
        if (!(projectId in current)) return current;
        const { [projectId]: _left, ...rest } = current;
        return rest;
      });
      // Its updates stop arriving now: make the next visit refetch the project's tasks.
      invalidateProjectTasks(queryClient, projectId, { refetchType: 'none' });
    },
    [queryClient],
  );

  const socketValue = useMemo(() => ({ socket, isConnected }), [socket, isConnected]);
  const roomsValue = useMemo(
    () => ({ presence, joinProject, leaveProject }),
    [presence, joinProject, leaveProject],
  );

  return (
    <SocketContext.Provider value={socketValue}>
      <RoomsContext.Provider value={roomsValue}>{children}</RoomsContext.Provider>
    </SocketContext.Provider>
  );
}

function useRequiredContext(context, hookName) {
  const value = useContext(context);
  if (!value) throw new Error(`${hookName} must be used within a SocketProvider`);
  return value;
}

/** @returns {{ socket: import('socket.io-client').Socket | null, isConnected: boolean }} */
// eslint-disable-next-line react-refresh/only-export-components
export function useSocket() {
  return useRequiredContext(SocketContext, 'useSocket');
}

/**
 * Subscribes the calling component to a project's real-time room while it is mounted
 * (ref-counted across components, re-joined after reconnects).
 * @returns {{ viewers: object[] }} users currently viewing the project (live)
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useProjectRoom(projectId) {
  const rooms = useRequiredContext(RoomsContext, 'useProjectRoom');
  const { presence, joinProject, leaveProject } = rooms;

  useEffect(() => {
    if (!projectId) return undefined;
    joinProject(projectId);
    return () => leaveProject(projectId);
  }, [projectId, joinProject, leaveProject]);

  return { viewers: (projectId && presence[projectId]) || NO_VIEWERS };
}
