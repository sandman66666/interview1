import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: '/api', // This will be proxied to the backend
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // You can add auth headers or other request modifications here
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle specific error cases
    if (error.response) {
      switch (error.response.status) {
        case 404:
          console.error('Resource not found:', error.response.data);
          break;
        case 500:
          console.error('Server error:', error.response.data);
          break;
        default:
          console.error('API error:', error.response.data);
      }
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const InterviewAPI = {
  getByUrlId: (urlId: string) => 
    api.get(`/interviews/url/${urlId}`),
  
  uploadRecording: (questionId: string, recording: Blob) => {
    const formData = new FormData();
    formData.append('recording', recording);
    return api.post(`/interviews/questions/${questionId}/recording`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  getAvatarStatus: (questionId: string) =>
    api.get(`/interviews/questions/${questionId}/avatar-status`),
  
  completeInterview: (interviewId: string) =>
    api.post(`/interviews/${interviewId}/complete`),
};

export default api;