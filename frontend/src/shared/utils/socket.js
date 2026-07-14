import { io } from 'socket.io-client';
import { SOCKET_URL } from './constants';

let socket = null;

/**
 * Initialize Socket.io connection with JWT authentication
 * @param {String} token - JWT token from localStorage
 * @returns {Socket} Socket.io instance
 */
export const initializeSocket = (token) => {
  // Don't initialize if no token
  if (!token) {
    return null;
  }

  // If socket exists and is connected, return it
  if (socket && socket.connected) {
    return socket;
  }

  // If socket exists but disconnected, disconnect it first
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(SOCKET_URL, {
    auth: {
      token: token,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 3,
    timeout: 10000,
    autoConnect: true,
  });

  socket.on('connect', () => {
    // Only log in development
    if (import.meta.env.DEV) {
      console.log('✅ Socket.io connected');
    }
  });

  socket.on('disconnect', (reason) => {
    // Only log in development and for unexpected disconnects
    if (import.meta.env.DEV && reason !== 'io client disconnect') {
      console.log('⚠️ Socket.io disconnected:', reason);
    }
  });

  socket.on('connect_error', (error) => {
    // Suppress expected errors (backend not running, network issues)
    const isExpectedError = 
      error.message?.includes('ECONNREFUSED') ||
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('xhr poll error') ||
      error.message?.includes('websocket error') ||
      error.type === 'TransportError';
    
    if (!isExpectedError && import.meta.env.DEV) {
      console.warn('Socket.io connection error:', error.message);
    }
    // Silently handle expected errors
  });

  socket.on('error', (error) => {
    // Only log unexpected errors
    if (import.meta.env.DEV && !error.message?.includes('ECONNREFUSED')) {
      console.warn('Socket.io error:', error.message || error);
    }
  });

  return socket;
};

/**
 * Get current socket instance
 * @returns {Socket|null} Socket.io instance or null
 */
export const getSocket = () => {
  return socket;
};

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default {
  initializeSocket,
  getSocket,
  disconnectSocket,
};

