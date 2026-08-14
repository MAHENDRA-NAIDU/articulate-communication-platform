import { request } from './api';

export const authService = {
  async register(userData) {
    const data = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    if (data.token) {
      localStorage.setItem('articulate_token', data.token);
    }
    return data;
  },

  async login(credentials) {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (data.token) {
      localStorage.setItem('articulate_token', data.token);
    }
    return data;
  },

  async logout() {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('articulate_token');
    }
  },

  async getMe() {
    return request('/auth/me');
  },

  async resetPassword(resetData) {
    return request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(resetData),
    });
  },
};
