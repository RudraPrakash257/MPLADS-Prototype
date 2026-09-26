import { apiClient } from './client';

export const getDetectors = async () => {
  const response = await apiClient.get('/api/detectors');
  return response.data;
};
