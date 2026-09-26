import { apiClient } from './client';

export const getWorks = async (params) => {
  const response = await apiClient.get('/api/works', { params });
  return response.data;
};

export const getWorkById = async (id, rowId) => {
  const params = rowId != null && rowId !== '' ? { row_id: rowId } : {};
  const response = await apiClient.get(`/api/works/${id}`, { params });
  return response.data;
};

export const getAnomalies = async (params) => {
  const response = await apiClient.get('/api/anomalies', { params });
  return response.data;
};
