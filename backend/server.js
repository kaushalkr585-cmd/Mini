require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

const allowedOrigins = [
  // Support comma-separated CLIENT_URL for multiple origins (e.g. "https://prod.vercel.app,https://preview.vercel.app")
  ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(u => u.trim()) : []),
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174'
].filter(Boolean);

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST', 'PATCH', 'DELETE'] },
});

// ── Middleware ────────────────────────────────────────────
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach io to every request so routes can emit
app.use((req, _res, next) => { req.io = io; next(); });

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/memories',   require('./routes/memories'));
app.use('/api/notes',      require('./routes/notes'));
app.use('/api/messages',   require('./routes/messages'));
app.use('/api/spotify',    require('./routes/spotify'));
app.use('/api/timeline',   require('./routes/timeline'));
app.use('/api/letters',    require('./routes/letters'));
app.use('/api/lovenote',   require('./routes/lovenote'));

app.get('/', (_req, res) => res.send('MINI Backend 💖 Running'));

// ── Socket.io Hub ─────────────────────────────────────────
const onlineUsers = new Map(); // socketId → { userId, name }
const activeCalls  = new Map(); // socketId → partnerSocketId (both directions stored)


// ── Streaming Room State ───────────────────────────────────
// Single private room for the couple. Tracks who is currently streaming.
const STREAM_ROOM = 'couple-stream-room';
const streamRoomState = {
  peers: new Set(),        // socketIds currently in the stream room
  streaming: null,         // socketId of the active streamer (or null)
  streamStartedAt: null,   // Date when stream started
  hasAudio: false,         // Whether the active stream includes an audio track
};

/**
 * Verify that a socket belongs to a known authenticated user.
 * Since this is a private 2-person app, only users in onlineUsers are valid.
 */
function isAuthorizedSocket(socketId) {
  return onlineUsers.has(socketId);
}

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // User comes online
  socket.on('user:online', ({ userId, name }) => {
    onlineUsers.set(socket.id, { userId, name });
    io.emit('user:online', { userId, name, socketId: socket.id });
    io.emit('users:online', [...onlineUsers.values()]);
    console.log(`🟢 ${name} is online`);
  });

  // Typing indicator in chat
  socket.on('user:typing', (data) => {
    socket.broadcast.emit('user:typing', data);
  });

  // Activity broadcast (page changes, etc.)
  socket.on('activity:update', (data) => {
    socket.broadcast.emit('activity:update', data);
  });

  // ── Voice / Video Call Signaling ───────────────────────────────
  // Simple 2-person app: find the other connected socket and relay directly.

  /**
   * call:invite — Caller initiates a call to the partner.
   * Payload: { callType: 'voice' | 'video' }
   */
  socket.on('call:invite', ({ callType }) => {
    const caller = onlineUsers.get(socket.id);
    if (!caller) return;

    // Find the partner socket (the other online user)
    let partnerSocketId = null;
    for (const [sid, user] of onlineUsers) {
      if (sid !== socket.id) { partnerSocketId = sid; break; }
    }
    if (!partnerSocketId) {
      socket.emit('call:no-answer', { reason: 'Partner is offline' });
      return;
    }

    // Check if partner is already in a call
    if (activeCalls.has(partnerSocketId) || activeCalls.has(socket.id)) {
      socket.emit('call:busy');
      return;
    }

    io.to(partnerSocketId).emit('call:invite', {
      from: socket.id,
      callerName: caller.name,
      callType,
    });
    console.log(`📞 ${caller.name} calling partner (${callType})`);
  });

  /**
   * call:accept — Callee accepts the incoming call.
   * Payload: { to: callerSocketId }
   */
  socket.on('call:accept', ({ to }) => {
    const callee = onlineUsers.get(socket.id);
    if (!callee) return;

    activeCalls.set(socket.id, to);
    activeCalls.set(to, socket.id);

    const callerSocket = io.sockets.sockets.get(to);
    if (callerSocket) {
      callerSocket.emit('call:accepted', { from: socket.id });
    }
    console.log(`✅ Call accepted by ${callee.name}`);
  });

  /**
   * call:decline — Callee declines the incoming call.
   * Payload: { to: callerSocketId }
   */
  socket.on('call:decline', ({ to }) => {
    const callee = onlineUsers.get(socket.id);
    const callerSocket = io.sockets.sockets.get(to);
    if (callerSocket) {
      callerSocket.emit('call:declined', { from: socket.id });
    }
    console.log(`❌ Call declined by ${callee?.name}`);
  });

  /**
   * call:end — Either party ends the active call.
   * Payload: { to: partnerSocketId }
   */
  socket.on('call:end', ({ to }) => {
    activeCalls.delete(socket.id);
    activeCalls.delete(to);

    const endingUser = onlineUsers.get(socket.id);
    const partnerSocket = io.sockets.sockets.get(to);
    if (partnerSocket) {
      partnerSocket.emit('call:ended', { from: socket.id });
    }
    console.log(`📴 Call ended by ${endingUser?.name}`);
  });

  /**
   * call:offer — Relay WebRTC SDP offer to the specific call partner.
   * Payload: { offer: RTCSessionDescriptionInit, to: socketId }
   */
  socket.on('call:offer', ({ offer, to }) => {
    const targetSocket = io.sockets.sockets.get(to);
    if (targetSocket) {
      targetSocket.emit('call:offer', { offer, from: socket.id });
    }
  });

  /**
   * call:answer — Relay WebRTC SDP answer back to the caller.
   * Payload: { answer: RTCSessionDescriptionInit, to: socketId }
   */
  socket.on('call:answer', ({ answer, to }) => {
    const targetSocket = io.sockets.sockets.get(to);
    if (targetSocket) {
      targetSocket.emit('call:answer', { answer, from: socket.id });
    }
  });

  /**
   * call:ice-candidate — Relay ICE candidate to the call partner.
   * Payload: { candidate: RTCIceCandidateInit, to: socketId }
   */
  socket.on('call:ice-candidate', ({ candidate, to }) => {
    const targetSocket = io.sockets.sockets.get(to);
    if (targetSocket) {
      targetSocket.emit('call:ice-candidate', { candidate, from: socket.id });
    }
  });

  // ── Streaming Signaling ────────────────────────────────────

  /**
   * stream:join — User enters the streaming room.
   * Validates the socket is a known authenticated user, then joins the
   * private room and notifies the other participant.
   */
  socket.on('stream:join', ({ userId }) => {
    if (!isAuthorizedSocket(socket.id)) {
      socket.emit('stream:error', { message: 'Unauthorized' });
      return;
    }

    // Prevent joining the room twice
    if (streamRoomState.peers.has(socket.id)) return;

    socket.join(STREAM_ROOM);
    streamRoomState.peers.add(socket.id);

    const user = onlineUsers.get(socket.id);
    console.log(`📺 ${user?.name} joined stream room`);

    // Notify all others in the room that this peer joined
    socket.to(STREAM_ROOM).emit('stream:peer-joined', {
      socketId: socket.id,
      userId: user?.userId,
      name: user?.name,
    });

    // Send the current stream state back to the joiner so they can
    // immediately know if someone is already streaming
    socket.emit('stream:room-state', {
      peersInRoom: streamRoomState.peers.size,
      streaming: streamRoomState.streaming,
      streamStartedAt: streamRoomState.streamStartedAt,
      hasAudio: streamRoomState.hasAudio,
      streamerName: streamRoomState.streaming
        ? onlineUsers.get(streamRoomState.streaming)?.name
        : null,
    });
  });

  /**
   * stream:leave — User leaves the streaming room.
   * Cleans up room state and notifies the other participant.
   */
  socket.on('stream:leave', () => {
    handleStreamLeave(socket);
  });

  /**
   * stream:started — Streamer signals they have begun sharing.
   * Stores the streamer's socket in room state and broadcasts to peers.
   */
  socket.on('stream:started', ({ hasAudio }) => {
    if (!isAuthorizedSocket(socket.id)) return;

    streamRoomState.streaming = socket.id;
    streamRoomState.streamStartedAt = new Date().toISOString();
    streamRoomState.hasAudio = !!hasAudio;

    const user = onlineUsers.get(socket.id);
    console.log(`📡 ${user?.name} started streaming (audio: ${hasAudio})`);

    socket.to(STREAM_ROOM).emit('stream:started', {
      streamerId: socket.id,
      streamerName: user?.name,
      hasAudio: !!hasAudio,
      startedAt: streamRoomState.streamStartedAt,
    });
  });

  /**
   * stream:stopped — Streamer signals they stopped sharing.
   * Clears stream state and notifies peers.
   */
  socket.on('stream:stopped', () => {
    if (!isAuthorizedSocket(socket.id)) return;

    const user = onlineUsers.get(socket.id);
    console.log(`⏹️  ${user?.name} stopped streaming`);

    // Only the active streamer (or any cleanup) can clear this
    if (streamRoomState.streaming === socket.id) {
      streamRoomState.streaming = null;
      streamRoomState.streamStartedAt = null;
      streamRoomState.hasAudio = false;
    }

    socket.to(STREAM_ROOM).emit('stream:stopped', {
      stoppedBy: socket.id,
    });
  });

  /**
   * stream:offer — Relay WebRTC SDP offer to the other participant.
   * Never forward to sender; validate sender is in the stream room.
   */
  socket.on('stream:offer', ({ offer }) => {
    if (!isAuthorizedSocket(socket.id)) return;

    socket.to(STREAM_ROOM).emit('stream:offer', {
      offer,
      from: socket.id,
    });
  });

  /**
   * stream:answer — Relay WebRTC SDP answer back to the offerer.
   */
  socket.on('stream:answer', ({ answer, to }) => {
    if (!isAuthorizedSocket(socket.id)) return;

    // Relay directly to the specific peer who sent the offer
    const targetSocket = io.sockets.sockets.get(to);
    if (targetSocket) {
      targetSocket.emit('stream:answer', {
        answer,
        from: socket.id,
      });
    }
  });

  /**
   * stream:ice-candidate — Relay ICE candidate to the other participant.
   */
  socket.on('stream:ice-candidate', ({ candidate, to }) => {
    if (!isAuthorizedSocket(socket.id)) return;

    if (to) {
      // Targeted relay (preferred)
      const targetSocket = io.sockets.sockets.get(to);
      if (targetSocket) {
        targetSocket.emit('stream:ice-candidate', {
          candidate,
          from: socket.id,
        });
      }
    } else {
      // Broadcast to room (fallback)
      socket.to(STREAM_ROOM).emit('stream:ice-candidate', {
        candidate,
        from: socket.id,
      });
    }
  });

  /**
   * stream:request-status — Client asks for current stream room state.
   * Useful after reconnection.
   */
  socket.on('stream:request-status', () => {
    if (!isAuthorizedSocket(socket.id)) return;

    socket.emit('stream:room-state', {
      peersInRoom: streamRoomState.peers.size,
      streaming: streamRoomState.streaming,
      streamStartedAt: streamRoomState.streamStartedAt,
      hasAudio: streamRoomState.hasAudio,
      streamerName: streamRoomState.streaming
        ? onlineUsers.get(streamRoomState.streaming)?.name
        : null,
    });
  });

  // ── Disconnect ─────────────────────────────────────────────
  socket.on('disconnect', () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      onlineUsers.delete(socket.id);
      io.emit('user:offline', { userId: user.userId });
      io.emit('users:online', [...onlineUsers.values()]);
      console.log(`🔴 ${user.name} went offline`);
    }

    // If this socket was in an active call, notify the partner
    if (activeCalls.has(socket.id)) {
      const partnerSocketId = activeCalls.get(socket.id);
      activeCalls.delete(socket.id);
      activeCalls.delete(partnerSocketId);
      const partnerSocket = io.sockets.sockets.get(partnerSocketId);
      if (partnerSocket) {
        partnerSocket.emit('call:ended', { from: socket.id, reason: 'disconnected' });
      }
    }

    // Clean up streaming room if the disconnected socket was in it
    if (streamRoomState.peers.has(socket.id)) {
      handleStreamLeave(socket);
    }
  });
});

/**
 * Shared cleanup logic for when a peer leaves the streaming room,
 * either intentionally (stream:leave) or via disconnect.
 */
function handleStreamLeave(socket) {
  if (!streamRoomState.peers.has(socket.id)) return;

  streamRoomState.peers.delete(socket.id);
  socket.leave(STREAM_ROOM);

  const user = onlineUsers.get(socket.id);
  console.log(`📺 ${user?.name || socket.id} left stream room`);

  // If the streamer left, clear the stream state
  if (streamRoomState.streaming === socket.id) {
    streamRoomState.streaming = null;
    streamRoomState.streamStartedAt = null;
    streamRoomState.hasAudio = false;
    io.to(STREAM_ROOM).emit('stream:stopped', { stoppedBy: socket.id });
  }

  io.to(STREAM_ROOM).emit('stream:peer-left', {
    socketId: socket.id,
    userId: user?.userId,
    name: user?.name,
  });
}

// ── Database + Start ──────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    // Seed default users on first run
    const seed = require('./seed');
    await seed();
    server.listen(PORT, () => console.log(`🚀 MINI backend on port ${PORT}`));
  })
  .catch((err) => console.error('❌ MongoDB error:', err));
