import { apiClient } from './client';
import { User, AuthResponse } from '@/types';

export const authApi = {
  async register(email: string, password: string, name: string) {
    const response = await apiClient.post<AuthResponse>('/auth/register', {
      email,
      password,
      name,
    });

    if (response.success && response.data) {
      apiClient.setTokens(response.data.accessToken, response.data.refreshToken);
    }

    return response;
  },

  async login(email: string, password: string) {
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      email,
      password,
    });

    if (response.success && response.data) {
      apiClient.setTokens(response.data.accessToken, response.data.refreshToken);
    }

    return response;
  },

  async logout() {
    const refreshToken = localStorage.getItem('refreshToken');
    await apiClient.post('/auth/logout', { refreshToken });
    apiClient.clearTokens();
  },

  async getCurrentUser() {
    return apiClient.get<User>('/auth/me');
  },

  async changePassword(currentPassword: string, newPassword: string) {
    return apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
  },
};
