import { request } from './api';

export const videoService = {
  async getVideos(params = {}) {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.search) query.append('search', params.search);
    if (params.sort) query.append('sort', params.sort);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.userId) query.append('userId', params.userId);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request(`/videos${queryString}`);
  },

  async getVideoById(id) {
    return request(`/videos/${id}`);
  },

  async createVideo(formData) {
    return request('/videos', {
      method: 'POST',
      body: formData,
    });
  },

  async updateVideo(id, videoData) {
    return request(`/videos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(videoData),
    });
  },

  async deleteVideo(id) {
    return request(`/videos/${id}`, {
      method: 'DELETE',
    });
  },

  async getCategories() {
    return request('/videos/categories');
  },
};
