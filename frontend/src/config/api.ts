export const API_BASE_URL = 'http://localhost:8001/api/v1';

export const endpoints = {
  interviews: {
    getByUrl: (urlId: string) => `${API_BASE_URL}/interviews/url/${urlId}`,
    getAvatarStatus: (questionId: string) => `${API_BASE_URL}/questions/${questionId}/avatar-status`,
    uploadRecording: (questionId: string) => `${API_BASE_URL}/interviews/questions/${questionId}/recording`,
    invokeAvatar: (questionId: string) => `${API_BASE_URL}/questions/${questionId}/invoke-avatar`,
  },
};

export const axiosConfig = {
  validateStatus: (status: number) => status < 500,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // Added to ensure cookies are sent with requests
};