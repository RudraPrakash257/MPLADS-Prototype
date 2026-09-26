import { apiClient } from './client';

export const submitReview = async (reviewData) => {
  const response = await apiClient.post('/api/review', reviewData);
  return response.data;
};

export const getReviews = async (workId) => {
  const params = workId ? { work_id: workId } : {};
  const response = await apiClient.get('/api/reviews', { params });
  return response.data;
};
