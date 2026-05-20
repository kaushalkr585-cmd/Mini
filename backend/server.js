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

app.get('/', (_req, res) => res.send('MINI Backend 💖 Running'));

// ── Socket.io Hub ─────────────────────────────────────────
const onlineUsers = new Map(); // socketId → { userId, name }

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

  socket.on('disconnect', () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      onlineUsers.delete(socket.id);
      io.emit('user:offline', { userId: user.userId });
      io.emit('users:online', [...onlineUsers.values()]);
      console.log(`🔴 ${user.name} went offline`);
    }
  });
});

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
