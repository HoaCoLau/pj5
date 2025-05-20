// src/sockets/socketHandlers.js
const logger = require('../config/logger');

// Map để lưu trữ thông tin người dùng online (ví dụ đơn giản)
// Key: userId, Value: { socketId, username, ... }
// Trong thực tế, bạn có thể muốn dùng Redis hoặc một giải pháp phức tạp hơn
const onlineUsers = new Map();

module.exports = function initializeSocketHandlers(io) {
  io.on('connection', (socket) => {
    // socket.user đã được gắn bởi middleware authenticateSocket
    logger.info(`User connected: ${socket.user.username} (ID: ${socket.user.id}), Socket ID: ${socket.id}`);
    onlineUsers.set(socket.user.id, { socketId: socket.id, username: socket.user.username });

    // Gửi thông báo cho client biết họ đã kết nối thành công
    socket.emit('connection_success', {
      message: `Welcome ${socket.user.displayName || socket.user.username}! You are connected.`,
      userId: socket.user.id,
      socketId: socket.id
    });

    // Thông báo cho các client khác (nếu cần)
    // socket.broadcast.emit('user_connected', { userId: socket.user.id, username: socket.user.username });

    // Xử lý sự kiện ngắt kết nối
    socket.on('disconnect', (reason) => {
      logger.info(`User disconnected: ${socket.user.username} (ID: ${socket.user.id}), Socket ID: ${socket.id}. Reason: ${reason}`);
      onlineUsers.delete(socket.user.id);
      // Thông báo cho các client khác (nếu cần)
      // socket.broadcast.emit('user_disconnected', { userId: socket.user.id, username: socket.user.username });
    });

    // Các sự kiện chat khác sẽ được thêm ở đây (joinRoom, sendMessage, ...)
    // Ví dụ một sự kiện test
    socket.on('client_event_test', (data) => {
        logger.info(`Received 'client_event_test' from ${socket.user.username}:`, data);
        socket.emit('server_response_test', { message: 'Server received your test event!', originalData: data });
    });

  });

  // Có thể thêm các hàm tiện ích liên quan đến io ở đây nếu cần
  // ví dụ: gửi thông báo tới một user cụ thể qua userId
  // function sendMessageToUser(userId, event, data) {
  //   const userInfo = onlineUsers.get(userId);
  //   if (userInfo && io.sockets.sockets.get(userInfo.socketId)) {
  //     io.sockets.sockets.get(userInfo.socketId).emit(event, data);
  //     return true;
  //   }
  //   return false;
  // }
};