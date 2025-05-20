// src/sockets/socketHandlers.js
const logger = require('../config/logger');
const { User, Room, Message, UserRoom, sequelize } = require('../models'); // Thêm sequelize và các model cần thiết
const { Op } = require('sequelize'); // Cần cho các query phức tạp hơn

const onlineUsers = new Map(); // userId -> { socketId, username, currentRoomId }
const spamTracker = new Map();
const SPAM_MESSAGE_LIMIT = 5; // Gửi > 5 tin
const SPAM_TIMEFRAME_MS = 10000; // trong 10 giây
const SPAM_BLOCK_DURATION_MS = 30000; // block 30 giây

module.exports = function initializeSocketHandlers(io) {
  io.on('connection', (socket) => {
    // ... (connection, joinRoom, leaveRoom, disconnect logic)

    // Sự kiện Send Message
    socket.on('sendMessage', async ({ roomId, content, type = 'text' }, callback) => {
      const { user } = socket;
      const now = Date.now();

      // --- Anti-Spam Logic ---
      if (!spamTracker.has(socket.id)) {
        spamTracker.set(socket.id, { messageTimestamps: [], isBlockedUntil: 0 });
      }
      const socketSpamInfo = spamTracker.get(socket.id);

      if (socketSpamInfo.isBlockedUntil > now) {
        const timeLeft = Math.ceil((socketSpamInfo.isBlockedUntil - now) / 1000);
        logger.warn(`User ${user.username} (Socket: ${socket.id}) tried to send message while spam blocked. Blocked for ${timeLeft}s more.`);
        if (callback) callback({ success: false, message: `You are blocked from sending messages for ${timeLeft} more seconds due to spamming.` });
        return;
      }

      // Xóa các timestamp cũ hơn timeframe
      socketSpamInfo.messageTimestamps = socketSpamInfo.messageTimestamps.filter(
        timestamp => (now - timestamp) < SPAM_TIMEFRAME_MS
      );

      // Thêm timestamp hiện tại
      socketSpamInfo.messageTimestamps.push(now);

      if (socketSpamInfo.messageTimestamps.length > SPAM_MESSAGE_LIMIT) {
        socketSpamInfo.isBlockedUntil = now + SPAM_BLOCK_DURATION_MS;
        socketSpamInfo.messageTimestamps = []; // Reset timestamps sau khi block
        logger.warn(`User ${user.username} (Socket: ${socket.id}) blocked for spamming. Blocked for ${SPAM_BLOCK_DURATION_MS / 1000}s.`);
        spamTracker.set(socket.id, socketSpamInfo);
        if (callback) callback({ success: false, message: `You have been blocked for ${SPAM_BLOCK_DURATION_MS / 1000} seconds due to spamming.` });
        return;
      }
      spamTracker.set(socket.id, socketSpamInfo);
      // --- End Anti-Spam Logic ---

      if (!roomId || !content || content.trim() === '') {
        logger.warn(`Invalid message data from ${user.username}: roomId or content missing.`);
        if (callback) callback({ success: false, message: 'Room ID and message content are required.' });
        return;
      }

      // Kiểm tra xem user có trong phòng này không (qua currentRoomId của socket state)
      const currentUserState = onlineUsers.get(user.id);
      if (!currentUserState || currentUserState.currentRoomId !== parseInt(roomId)) { // parseInt vì roomId từ client có thể là string
        logger.warn(`User ${user.username} tried to send message to room ${roomId} they are not currently in (current: ${currentUserState?.currentRoomId}).`);
        if (callback) callback({ success: false, message: 'You are not in this room or an error occurred.' });
        return;
      }

      try {
        const messageData = {
          userId: user.id,
          roomId: parseInt(roomId),
          content: content.trim(),
          type: ['text', 'icon'].includes(type) ? type : 'text', // Validate type
          timestamp: new Date()
        };

        const newMessage = await Message.create(messageData);

        // Lấy thông tin người gửi để gửi kèm tin nhắn
        const messageToSend = {
          id: newMessage.id,
          content: newMessage.content,
          type: newMessage.type,
          timestamp: newMessage.timestamp,
          roomId: newMessage.roomId,
          sender: { // Gửi thông tin người gửi
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl
          }
        };

        // Gửi tin nhắn tới tất cả client trong phòng đó (bao gồm cả người gửi)
        io.to(roomId.toString()).emit('newMessage', messageToSend);

        logger.info(`Message from ${user.username} in room <span class="math-inline">\{roomId\}\: "</span>{content}"`);
        if (callback) callback({ success: true, message: 'Message sent!', sentMessage: messageToSend });

      } catch (error) {
        logger.error(`Error sending message from ${user.username} to room ${roomId}:`, error);
        if (callback) callback({ success: false, message: 'Error sending message.' });
      }
    });

    // ... (client_event_test)
  });
};