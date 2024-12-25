export const API_BASE_URL = 'http://127.0.0.1:8001/api/v1';

export const config = {
  apiBaseUrl: API_BASE_URL,
  endpoints: {
    interviews: '/interviews',
    questions: '/questions',
    recordings: '/recordings'
  },
  avatar: {
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
    fallbackVideos: {
      default: 'https://d-id-public-bucket.s3.us-west-2.amazonaws.com/sample-videos/anna-welcome.mp4',
      intro: 'https://d-id-public-bucket.s3.us-west-2.amazonaws.com/sample-videos/anna-intro.mp4',
      question: 'https://d-id-public-bucket.s3.us-west-2.amazonaws.com/sample-videos/anna-discussion.mp4',
      closing: 'https://d-id-public-bucket.s3.us-west-2.amazonaws.com/sample-videos/anna-closing.mp4'
    }
  },
  recording: {
    maxDuration: 300, // 5 minutes
    minDuration: 5, // 5 seconds
    videoBitsPerSecond: 1000000, // 1 Mbps (reduced from 2.5 Mbps)
    mimeType: 'video/webm;codecs=vp8,opus',
    constraints: {
      video: {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 30 },
        facingMode: 'user',
        aspectRatio: 16/9
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100,
        channelCount: 1
      }
    }
  }
};

export const axiosConfig = {
  withCredentials: true,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  },
  validateStatus: (status: number) => status < 500
};