import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

/** Signs the user out, then lands on the login page (used by the sidebar and the user menu). */
export function useLogout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return useCallback(async () => {
    await logout();
    navigate('/login', { replace: true });
    toast.success('You have been signed out', { id: 'signed-out' });
  }, [logout, navigate]);
}
