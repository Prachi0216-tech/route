import { io } from 'socket.io-client';

// Connect to backend Socket.IO server on port 5000 or current origin
const SOCKET_URL = window.location.port === '5173' ? 'http://localhost:5000' : window.location.origin;

const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

export default socket;
