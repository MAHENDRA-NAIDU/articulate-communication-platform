import { request } from './api';

export const commentService = {
  async getVideoComments(videoId) {
    return request(`/comments/video/${videoId}`);
  },

  async createComment(videoId, content) {
    return request(`/comments/video/${videoId}`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  async deleteComment(commentId) {
    return request(`/comments/${commentId}`, {
      method: 'DELETE',
    });
  },
};
