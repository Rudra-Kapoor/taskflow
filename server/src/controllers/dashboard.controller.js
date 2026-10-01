import * as dashboardService from '../services/dashboard.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';

export const getDashboard = asyncHandler(async (req, res) => {
  sendSuccess(res, await dashboardService.getDashboard(req.user, req.query));
});
