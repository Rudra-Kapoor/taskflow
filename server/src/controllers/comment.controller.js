import * as commentService from '../services/comment.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendCreated, sendMessage, sendSuccess } from '../utils/response.js';

export const listComments = asyncHandler(async (req, res) => {
  sendSuccess(res, await commentService.listComments(req.user, req.params.taskId));
});

export const addComment = asyncHandler(async (req, res) => {
  sendCreated(res, await commentService.addComment(req.user, req.params.taskId, req.body.body));
});

export const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  sendSuccess(res, await commentService.updateComment(req.user, commentId, req.body.body));
});

export const deleteComment = asyncHandler(async (req, res) => {
  await commentService.deleteComment(req.user, req.params.commentId);
  sendMessage(res, 'Comment deleted');
});
