import axios from 'axios';
import { MIRURO_API_URL, API_KEY } from './miruro.config';

const client = axios.create({
  baseURL: MIRURO_API_URL,
  headers: {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor for logging
client.interceptors.request.use(
  (config) => {
    console.log(`[Miruro API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error(`[Miruro API Error] ${error.response.status}: ${error.response.statusText}`);
    } else if (error.request) {
      console.error('[Miruro API Error] No response received');
    } else {
      console.error('[Miruro API Error]', error.message);
    }
    return Promise.reject(error);
  }
);

export default client;
