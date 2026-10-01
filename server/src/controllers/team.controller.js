import * as teamService from '../services/team.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendCreated, sendMessage, sendSuccess } from '../utils/response.js';

export const listTeams = asyncHandler(async (req, res) => {
  sendSuccess(res, await teamService.listTeams(req.user));
});

export const createTeam = asyncHandler(async (req, res) => {
  sendCreated(res, await teamService.createTeam(req.user, req.body));
});

export const getTeam = asyncHandler(async (req, res) => {
  sendSuccess(res, await teamService.getTeam(req.user, req.params.teamId));
});

export const updateTeam = asyncHandler(async (req, res) => {
  sendSuccess(res, await teamService.updateTeam(req.user, req.params.teamId, req.body));
});

export const deleteTeam = asyncHandler(async (req, res) => {
  await teamService.deleteTeam(req.user, req.params.teamId);
  sendMessage(res, 'Team deleted');
});

export const addMember = asyncHandler(async (req, res) => {
  sendCreated(res, await teamService.addMember(req.user, req.params.teamId, req.body));
});

export const updateMemberRole = asyncHandler(async (req, res) => {
  const { teamId, userId } = req.params;
  sendSuccess(res, await teamService.updateMemberRole(req.user, teamId, userId, req.body.role));
});

export const removeMember = asyncHandler(async (req, res) => {
  const { teamId, userId } = req.params;
  const { left } = await teamService.removeMember(req.user, teamId, userId);
  sendMessage(res, left ? 'You left the team' : 'Member removed');
});
