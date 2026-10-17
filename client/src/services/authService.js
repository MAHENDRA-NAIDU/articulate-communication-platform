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

  async changePassword(passwordData) {
    const data = await request('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });
    if (data.token) {
      localStorage.setItem('articulate_token', data.token);
    }
    return data;
  },

  async verifyEmail({ email, otp }) {
    return request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  },

  async resendOTP(email) {
    return request('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async googleSignIn(idToken) {
    const data = await request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
    if (data.token) {
      localStorage.setItem('articulate_token', data.token);
    }
    return data;
  },

  async forgotPassword(email) {
    return request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(resetData) {
    return request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(resetData),
    });
  },
};
