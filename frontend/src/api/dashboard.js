import { apiClient } from './client';

export const getDashboardData = async () => {
  const response = await apiClient.get('/api/dashboard');
  return response.data;
};
