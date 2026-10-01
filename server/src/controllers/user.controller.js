import * as userService from '../services/user.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';

export const searchUsers = asyncHandler(async (req, res) => {
  sendSuccess(res, await userService.searchUsers(req.user, req.query));
});
