import axios from 'axios';

// Server configuration
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'localhost:8000';  // Server domain

// Base URLs for API and WebSocket
export const API_BASE_URL = `${import.meta.env.VITE_API_PROTOCOL || 'http'}://${SERVER_URL}/api`;
export const WS_BASE_URL = `${import.meta.env.VITE_WS_PROTOCOL || 'ws'}://${SERVER_URL}`;

// Global axios configuration setup
axios.defaults.withCredentials = true;
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.headers.common['Access-Control-Allow-Credentials'] = true;

// API endpoints
export const API_ENDPOINTS = {
  LOGIN: '/login',
  REGISTER: '/register',
  CHECK_SESSION: '/check-session',
  USERS: '/users',
  MESSAGES: (userId: number) => `/messages/${userId}`,
  LOGOUT: '/logout',
  WS_CHAT: (userId: number) => `${WS_BASE_URL}/ws/${userId}`,
};