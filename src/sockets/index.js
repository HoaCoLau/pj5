const jwt = require('jsonwebtoken');
const pino = require('pino')();
const { Message, Room, User } = require('../models');
const canSend = require('../utils/antiSpam');

module.exports = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = user;
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    pino.info(`User ${socket.user.username} connected`);

    // Tham gia phòng
    socket.on('join', async (roomId) => {
      socket.join(roomId);
      pino.info(`User ${socket.user.username} joined room ${roomId}`);

      // Gửi 20 tin nhắn gần nhất cho user vừa join
      const messages = await Message.findAll({
        where: { roomId },
        order: [['timestamp', 'DESC']],
        limit: 20,
        include: [{ model: User, attributes: ['username', 'avatar'] }]
      });
      socket.emit('history', messages.reverse());

      // Thông báo cho các thành viên khác
      socket.to(roomId).emit('notice', {
        text: `${socket.user.username} đã tham gia vào room.`,
        timestamp: new Date()
      });
    });

    // Rời phòng
    socket.on('leave', (roomId) => {
      socket.leave(roomId);
      socket.to(roomId).emit('notice', {
        text: `${socket.user.username} đã rời khỏi room.`,
        timestamp: new Date()
      });
    });

    // Nhận và gửi tin nhắn
    socket.on('message', async ({ roomId, text }) => {
      if (!canSend(socket.user.id)) {
        socket.emit('blocked', { message: 'Bạn bị block 30s do spam!' });
        return;
      }
      const msg = await Message.create({
        roomId,
        userId: socket.user.id,
        text,
        timestamp: new Date()
      });
      const user = await User.findByPk(socket.user.id);
      io.to(roomId).emit('message', {
        from: user.username,
        avatar: user.avatar,
        text,
        timestamp: msg.timestamp
      });
      pino.info(`User ${socket.user.username} sent message to room ${roomId}`);
    });

    socket.on('disconnecting', () => {
      // Gửi thông báo rời phòng cho từng phòng user đang ở
      for (const roomId of socket.rooms) {
        if (roomId !== socket.id) {
          socket.to(roomId).emit('notice', {
            text: `${socket.user.username} đã rời khỏi room.`,
            timestamp: new Date()
          });
        }
      }
    });

    socket.on('disconnect', () => {
      pino.info(`User ${socket.user.username} disconnected`);
    });
  });
};