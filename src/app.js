const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const pino = require('pino')();
const jwt = require('jsonwebtoken');
const { sequelize, Message, Room } = require('./models');
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/room');
const messageRoutes = require('./routes/message');
const friendRoutes = require('./routes/friend');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });
const spamMap = new Map();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/rooms', messageRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => res.render('auth'));
app.get('/chat', (req, res) => res.render('chat'));

// Middleware xác thực JWT cho WebSocket
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const user = jwt.verify(token, 'SECRET_KEY');
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

// Logging khi user kết nối
io.on('connection', (socket) => {
  pino.info(`User connected: ${socket.user.username}`);

  socket.on('join', async (roomId) => {
    socket.join(roomId);
    // Gửi 20 tin nhắn gần nhất
    const messages = await Message.findAll({
      where: { roomId },
      order: [['createdAt', 'DESC']],
      limit: 20
    });
    socket.emit('history', messages.reverse());
    socket.to(roomId).emit('notification', `${socket.user.username} đã tham gia vào room`);
  });

  socket.on('message', async ({ roomId, text }) => {
    // Chống spam
    const now = Date.now();
    const key = `${socket.user.id}_${roomId}`;
    if (!spamMap.has(key)) spamMap.set(key, []);
    const times = spamMap.get(key).filter(t => now - t < 10000);
    if (times.length >= 5) {
      socket.emit('blocked', 'Bạn bị block 30s vì spam');
      setTimeout(() => spamMap.set(key, []), 30000);
      return;
    }
    times.push(now);
    spamMap.set(key, times);

    // Lưu tin nhắn
    const msg = await Message.create({ roomId, userId: socket.user.id, text });
    io.to(roomId).emit('message', {
      from: socket.user.username,
      text,
      timestamp: msg.createdAt
    });
  });

  socket.on('leave', (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit('notification', `${socket.user.username} đã rời khỏi room`);
  });

  socket.on('disconnect', () => {
    pino.info(`User disconnected: ${socket.user.username}`);
  });
});

sequelize.sync().then(() => {
  server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
  });
});