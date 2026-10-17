import { request } from './api';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

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

  /**
   * Upload video with real-time byte progress reporting
   * Supports large video files up to 500MB with extended timeout
   */
  createVideo(formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE_URL}/videos`);
      xhr.withCredentials = true;

      // Attach auth token if available
      const token = localStorage.getItem('articulate_token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress({
              loaded: event.loaded,
              total: event.total,
              percent,
            });
          }
        };
      }

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText || '{}');
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data);
          } else {
            const err = new Error(data.message || `Upload failed with status ${xhr.status}`);
            err.status = xhr.status;
            err.data = data;
            reject(err);
          }
        } catch (e) {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({ success: true });
          } else {
            reject(new Error(`Server response error (${xhr.status}). Please try again.`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error: Unable to complete video upload. Please check your connection.'));
      };

      xhr.ontimeout = () => {
        reject(new Error('Video upload timed out. Please verify your network speed and try again.'));
      };

      // 30-minute timeout for large HD / 4K video uploads up to 2GB
      xhr.timeout = 30 * 60 * 1000;

      xhr.send(formData);
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
