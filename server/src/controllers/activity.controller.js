import * as activityService from '../services/activity.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';

const sendPage = (res, { items, meta }) => sendSuccess(res, items, { meta });

export const listFeed = asyncHandler(async (req, res) => {
  sendPage(res, await activityService.listActivityFeed(req.user, req.query));
});

export const listProjectActivity = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  sendPage(res, await activityService.listProjectActivity(req.user, projectId, req.query));
});

export const listTaskActivity = asyncHandler(async (req, res) => {
  sendPage(res, await activityService.listTaskActivity(req.user, req.params.taskId, req.query));
});
