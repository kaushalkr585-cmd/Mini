import { io, Socket } from 'socket.io-client';

const URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(URL, { autoConnect: false, transports: ['websocket', 'polling'] });
  }
  return socket;
}

export function connectSocket(userId: string, name: string) {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  
  // Re-emit user:online every time the socket connects (or reconnects)
  s.off('connect');
  s.on('connect', () => {
    s.emit('user:online', { userId, name });
  });

  if (s.connected) {
     s.emit('user:online', { userId, name });
  }

  return s;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
