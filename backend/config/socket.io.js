import { Server } from 'socket.io';
import { verifyToken } from '../utils/jwt.util.js';
import Admin from '../models/Admin.model.js';
import User from '../models/User.model.js';
import Vendor from '../models/Vendor.model.js';
// import Chat from '../models/Chat.model.js';

let io;

/**
 * Setup Socket.io server
 * 
 * Environment Variables Required:
 * - SOCKET_CORS_ORIGIN: Comma-separated list of allowed CORS origins for Socket.io connections
 *   Example: "http://localhost:5173,http://localhost:3000,https://yourdomain.com"
 *   Default: "http://localhost:5173,http://localhost:3000" (if not set)
 * 
 * Socket.io uses CORS to restrict which frontend origins can connect.
 * The token is passed via auth.token in the socket handshake for authentication.
 * 
 * @param {http.Server} httpServer - HTTP server instance
 * @returns {Server} Socket.io server instance
 */
export const setupSocketIO = (httpServer, allowedOrigins = []) => {
  // Default allowed origins (always included)
  const defaultOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://dealing-india.vercel.app',
    'https://www.dealingindia.com',
    'https://dealingindia.com',
    'https://www.dealingindia.in',
    'https://dealingindia.in'
  ];

  // Merge and deduplicate origins (passed origins + defaults)
  const corsOrigins = [...new Set([...allowedOrigins, ...defaultOrigins])];

  io = new Server(httpServer, {
    cors: {
      origin: corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Socket.io authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify token
      const decoded = verifyToken(token);

      // Attach user info to socket
      socket.user = decoded;

      // Fetch full user document based on role
      if (decoded.role === 'admin' && decoded.adminId) {
        const admin = await Admin.findById(decoded.adminId);
        if (!admin || !admin.isActive) {
          return next(new Error('Admin account not found or inactive'));
        }
        socket.userDoc = admin;
      } else if (decoded.role === 'user' && decoded.userId) {
        const user = await User.findById(decoded.userId);
        if (!user || !user.isActive) {
          return next(new Error('User account not found or inactive'));
        }
        socket.userDoc = user;
      } else if (decoded.role === 'vendor' && decoded.vendorId) {
        const vendor = await Vendor.findById(decoded.vendorId);
        if (!vendor || !vendor.isActive) {
          return next(new Error('Vendor account not found or inactive'));
        }
        socket.userDoc = vendor;
      }

      next();
    } catch (error) {
      next(new Error('Invalid or expired token'));
    }
  });

  // Socket.io connection handler
  io.on('connection', (socket) => {
    const userRole = socket.user.role;
    const userId = socket.user.adminId || socket.user.userId || socket.user.vendorId;

    // Join user's personal room
    socket.join(`${userRole}_${userId}`);
    console.log(`Socket ${socket.id} joined personal room: ${userRole}_${userId}`);

    // Join notification room for real-time notifications
    const notificationRoom = `notifications_${userId}_${userRole}`;
    socket.join(notificationRoom);

    // Admin-specific handlers
    if (userRole === 'admin') {
      // Add admin-specific handlers here if needed
    }

    // User/Vendor handlers
    if (userRole === 'user' || userRole === 'vendor') {
      // Chat event handlers
      // Chat event handlers removed - Chat model functionality disabled

      /*
      socket.on('join_chat_room', async (data) => {
        // ... (removed)
      });
      // ... other chat handlers removed
      */
    }

    // Support ticket event handlers
    socket.on('join_ticket_room', (data) => {
      const { ticketId } = data;
      if (ticketId) {
        socket.join(`ticket_${ticketId}`);
        socket.emit('joined_ticket_room', { ticketId });
      }
    });

    socket.on('leave_ticket_room', (data) => {
      const { ticketId } = data;
      if (ticketId) {
        socket.leave(`ticket_${ticketId}`);
      }
    });

    // Notification event handlers
    socket.on('mark_notification_read', async (data) => {
      try {
        const { notificationId } = data;
        // This will be handled by the API endpoint, but we can emit confirmation
        socket.emit('notification_read_confirmed', { notificationId });
      } catch (error) {
        socket.emit('error', { message: 'Failed to mark notification as read' });
      }
    });

    socket.on('mark_all_read', async (data) => {
      try {
        // This will be handled by the API endpoint, but we can emit confirmation
        socket.emit('all_read_confirmed');
      } catch (error) {
        socket.emit('error', { message: 'Failed to mark all as read' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
};

/**
 * Get Socket.io instance
 * @returns {Server} Socket.io instance
 */
export const getSocket = () => {
  return io;
};

