import * as authService from '../services/auth.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendCreated, sendSuccess } from '../utils/response.js';

export const register = asyncHandler(async (req, res) => {
  sendCreated(res, await authService.registerUser(req.body));
});

export const login = asyncHandler(async (req, res) => {
  sendSuccess(res, await authService.loginUser(req.body));
});

export const getMe = (req, res) => {
  sendSuccess(res, { user: req.user });
};

export const updateMe = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user, req.body);
  sendSuccess(res, { user });
});

/** Every existing session is revoked, so the response carries a new token for this one. */
export const changePassword = asyncHandler(async (req, res) => {
  const session = await authService.changePassword(req.user._id, req.body);
  sendSuccess(res, session, { message: 'Password updated successfully' });
});
