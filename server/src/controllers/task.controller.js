import * as taskSearchService from '../services/taskSearch.service.js';
import * as taskService from '../services/task.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendCreated, sendMessage, sendSuccess } from '../utils/response.js';

export const searchTasks = asyncHandler(async (req, res) => {
  const { items, meta } = await taskSearchService.searchTasks(req.user, req.query);
  sendSuccess(res, items, { meta });
});

export const listProjectTasks = asyncHandler(async (req, res) => {
  sendSuccess(res, await taskService.listProjectTasks(req.user, req.params.projectId));
});

export const createTask = asyncHandler(async (req, res) => {
  sendCreated(res, await taskService.createTask(req.user, req.params.projectId, req.body));
});

export const getTask = asyncHandler(async (req, res) => {
  sendSuccess(res, await taskService.getTask(req.user, req.params.taskId));
});

export const updateTask = asyncHandler(async (req, res) => {
  sendSuccess(res, await taskService.updateTask(req.user, req.params.taskId, req.body));
});

export const moveTask = asyncHandler(async (req, res) => {
  sendSuccess(res, await taskService.moveTask(req.user, req.params.taskId, req.body));
});

export const deleteTask = asyncHandler(async (req, res) => {
  await taskService.deleteTask(req.user, req.params.taskId);
  sendMessage(res, 'Task deleted');
});
