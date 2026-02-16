import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_API_URL || (import.meta.env.PROD 
  ? window.location.origin 
  : 'http://localhost:3001');

const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 500,
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('🔌 Socket connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Socket disconnected:', reason);
});

socket.on('connect_error', (err) => {
  console.error('🔌 Socket connection error:', err.message);
});

export default socket;
