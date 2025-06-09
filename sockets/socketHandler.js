// File: sockets/socketHandler.js

const jwt = require('jsonwebtoken');
const db = require('../models');
const logger = require('../utils/logger');

// Cơ chế chống spam (in-memory, có thể thay bằng Redis trong production)
const messageTimestamps = new Map();
const blockedUsers = new Map();
module.exports = (io) => {
    // 1. Middleware xác thực token cho MỌI kết nối socket
    io.use(async (socket, next) => {
        try {
            // Lấy token từ handshake mà client gửi lên
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication error: Token not provided'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await db.User.findByPk(decoded.id, {
                attributes: ['id', 'username', 'avatar_url']
            });

            if (!user) {
                return next(new Error('Authentication error: User not found'));
            }

            // Gắn thông tin user vào đối tượng socket để dùng ở các bước sau
            socket.user = user;
            next(); // Cho phép kết nối
        } catch (err) {
            logger.error(err.message);
            next(new Error('Authentication error: Invalid token'));
        }
    });

    // 2. Xử lý khi có một kết nối thành công (đã qua middleware)
    io.on('connection', async (socket) => {
        logger.info(`⚡: User đã kết nối: ${socket.user.username} (ID: ${socket.id})`);

        // Cập nhật trạng thái online và ghi log
        db.User.update({ is_online: true }, { where: { id: socket.user.id } });
        db.UserLog.create({ user_id: socket.user.id, action: 'connect' });

        // 3. Lắng nghe sự kiện "joinRoom" từ client
        socket.on('joinRoom', async ({ roomId }) => {
            socket.join(roomId); // Cho socket tham gia vào một phòng
            logger.info(`${socket.user.username} đã tham gia phòng ${roomId}`);

            // Gửi 20 tin nhắn gần nhất trong phòng cho người vừa vào
            const messages = await db.Message.findAll({
                where: { chat_id: roomId },
                order: [['created_at', 'DESC']],
                limit: 20,
                include: [{ model: db.User, as: 'Sender', attributes: ['id', 'username', 'avatar_url'] }]
            });

            // Gửi lại cho chính client vừa yêu cầu
            socket.emit('loadHistory', messages.reverse());

            // Gửi thông báo cho các thành viên khác trong phòng
            socket.to(roomId).emit('message', {
                message_type: 'system',
                content: `${socket.user.username} đã tham gia phòng.`
            });
        });

        // 4. Lắng nghe sự kiện "chatMessage" từ client
        socket.on('chatMessage', async ({ roomId, content }) => {
                const userId = socket.user.id;
            if (blockedUsers.has(userId) && Date.now() < blockedUsers.get(userId)) {
                const timeLeft = Math.ceil((blockedUsers.get(userId) - Date.now()) / 1000);
                socket.emit('spamWarning', `Bạn đang bị khóa. Vui lòng chờ ${timeLeft} giây.`);
                return;
            }
            // Logic chống spam
            const now = Date.now();
            const userTimestamps = messageTimestamps.get(socket.user.id) || [];
            const recentTimestamps = userTimestamps.filter(ts => now - ts < 10000); // 10 giây

            if (recentTimestamps.length >= 5) { // Gửi > 5 tin trong 10s
                logger.warn(`SPAM DETECTED from ${socket.user.username}`);
                const blockUntil = Date.now() + 30000;
                blockedUsers.set(userId, blockUntil);
                socket.emit('spamWarning', 'Bạn đang gửi tin nhắn quá nhanh. Vui lòng chờ một lát.');
                return;
            }
            recentTimestamps.push(now);
            messageTimestamps.set(socket.user.id, recentTimestamps);

            // Lưu tin nhắn vào DB
            const message = await db.Message.create({
                sender_id: socket.user.id,
                chat_id: roomId,
                content: content,
            });

            // Gửi tin nhắn đến tất cả mọi người trong phòng
            io.to(roomId).emit('message', {
                id: message.id,
                content: message.content,
                message_type: 'text',
                created_at: message.created_at,
                Sender: socket.user // Gửi kèm thông tin người gửi
            });
        });

        // 5. Xử lý khi một user ngắt kết nối
        socket.on('disconnect', () => {
            logger.info(`🔥: User đã ngắt kết nối: ${socket.user.username}`);
            db.User.update({ is_online: false, last_seen_at: new Date() }, { where: { id: socket.user.id } });
            db.UserLog.create({ user_id: socket.user.id, action: 'disconnect' });

            // Gửi thông báo rời phòng tới tất cả các phòng user đang tham gia
            socket.rooms.forEach(room => {
                if (room !== socket.id) {
                    socket.to(room).emit('message', {
                        message_type: 'system',
                        content: `${socket.user.username} đã rời khỏi phòng.`
                    });
                }
            });
        });
    });
};