import { request } from './api';

export const userService = {
  async getUserProfile(identifier) {
    return request(`/users/${identifier}`);
  },

  async updateUserProfile(userId, formDataOrJson) {
    return request(`/users/${userId}`, {
      method: 'PUT',
      body: formDataOrJson instanceof FormData ? formDataOrJson : JSON.stringify(formDataOrJson),
    });
  },

  async deleteUserAccount(userId) {
    return request(`/users/${userId}`, {
      method: 'DELETE',
    });
  },
};
