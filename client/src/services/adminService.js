import { request } from './api';

export const adminService = {
  async getStats() {
    return request('/admin/stats');
  },

  async getUsers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/users${query ? `?${query}` : ''}`);
  },

  async toggleUserStatus(userId) {
    return request(`/admin/users/${userId}/status`, {
      method: 'PATCH',
    });
  },

  async deleteUser(userId) {
    return request(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },

  async getVideos(params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/videos${query ? `?${query}` : ''}`);
  },

  async deleteVideo(videoId) {
    return request(`/admin/videos/${videoId}`, {
      method: 'DELETE',
    });
  },

  async getComments(params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/comments${query ? `?${query}` : ''}`);
  },

  async deleteComment(commentId) {
    return request(`/admin/comments/${commentId}`, {
      method: 'DELETE',
    });
  },
};
