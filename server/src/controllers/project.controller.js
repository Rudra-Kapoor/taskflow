import * as projectService from '../services/project.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendCreated, sendMessage, sendSuccess } from '../utils/response.js';

export const listProjects = asyncHandler(async (req, res) => {
  sendSuccess(res, await projectService.listProjects(req.user, req.query));
});

export const createProject = asyncHandler(async (req, res) => {
  sendCreated(res, await projectService.createProject(req.user, req.body));
});

export const getProject = asyncHandler(async (req, res) => {
  sendSuccess(res, await projectService.getProject(req.user, req.params.projectId));
});

export const updateProject = asyncHandler(async (req, res) => {
  sendSuccess(res, await projectService.updateProject(req.user, req.params.projectId, req.body));
});

export const deleteProject = asyncHandler(async (req, res) => {
  await projectService.deleteProject(req.user, req.params.projectId);
  sendMessage(res, 'Project deleted');
});
