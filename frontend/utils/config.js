// API Configuration
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Determine if we're in development or production
const isDevelopment = __DEV__;

// Function to resolve host based on environment
const resolveHost = () => {
  // Check for custom API URL first (allows override for local development)
  const customApiUrl = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL;
  if (customApiUrl) {
    return customApiUrl;
  }
  
  // Default to production backend URL
  // For local development, set EXPO_PUBLIC_API_URL in .env file
  return 'https://symbihelp.onrender.com';
};

const resolvedHost = resolveHost();

// Base API URL - single source of truth
export const API_URL = resolvedHost;

// Common fetch configuration
export const fetchConfig = (token, method = 'GET', body = null) => {
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include', // Important for cookies/CORS with credentials
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  return config;
};

// Helper function for API calls with error handling
export const apiRequest = async (endpoint, token, options = {}) => {
  const { method = 'GET', body, ...rest } = options;
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...fetchConfig(token, method, body),
      ...rest,
    });

    const data = await response.json();
    
    if (response.status === 401) {
      throw new Error('Your session has expired. Please log in again.');
    }

    if (response.status === 403) {
      throw new Error('You do not have permission to access this resource.');
    }

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }

    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

// Add timeout and retry configuration
export const API_CONFIG = {
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

// Add other configuration constants as needed
export const APP_CONFIG = {
  VERSION: '1.0.0',
  ENV: isDevelopment ? 'development' : 'production'
};