// sockets/chatHandler.js
const { Message, User, Room, UserRoom } = require('../models'); // Đảm bảo UserRoom được import nếu dùng
const { Op } = require('sequelize');

// --- Cấu trúc lưu trữ tạm thời ---
// roomMembers: { roomId: Set(userId1, userId2, ...), ... }
const roomMembers = {};
// socketRooms: { socketId: roomId, ... }
const socketRooms = {};
// spamTracker: { userId: { count: 0, firstMessageTime: 0, blockedUntil: 0 } }
const spamTracker = {};

module.exports = (io, socket, logger) => {
    const userId = socket.user.id; // socket.user được gán từ middleware xác thực Socket.IO
    const username = socket.user.username;
    const userAvatar = socket.user.avatar;

    logger.info(`Chat handler initialized for user: ${username} (ID: ${userId}, Socket: ${socket.id})`);

    // --- Sự kiện JOIN ROOM ---
    socket.on('joinRoom', async ({ roomId }) => {
        if (!roomId) {
            logger.warn(`User ${username} tried to join room with invalid roomId.`);
            socket.emit('error', { message: 'Room ID không hợp lệ.' });
            return;
        }

        logger.info(`User ${username} attempting to join room ID: ${roomId}`);

        try {
            const room = await Room.findByPk(roomId);
            if (!room) {
                logger.warn(`Room with ID ${roomId} not found for user ${username}.`);
                socket.emit('error', { message: `Không tìm thấy phòng với ID: ${roomId}.` });
                return;
            }

            // (Tùy chọn) Kiểm tra xem user có phải là thành viên của phòng không (từ bảng UserRooms)
            // const isMember = await UserRoom.findOne({ where: { userId: userId, roomId: roomId } });
            // if (!isMember) {
            //     // Nếu muốn giới hạn chỉ thành viên mới được join hẳn vào (ngoài việc xem)
            //     // logger.warn(`User ${username} is not a member of room ${roomId}. Join denied.`);
            //     // socket.emit('error', { message: 'Bạn không phải là thành viên của phòng này.' });
            //     // return;
            //     // Hoặc tự động thêm user vào UserRooms khi họ join lần đầu qua socket
            //     await UserRoom.findOrCreate({ where: { userId: userId, roomId: roomId }});
            //     logger.info(`User ${username} added to UserRooms for room ${roomId} upon socket join.`);
            // }


            // Rời phòng cũ (nếu có) mà socket này đang tham gia
            const oldRoomId = socketRooms[socket.id];
            if (oldRoomId && oldRoomId !== roomId) {
                socket.leave(oldRoomId);
                if (roomMembers[oldRoomId]) {
                    roomMembers[oldRoomId].delete(userId);
                    // Thông báo cho phòng cũ và cập nhật thành viên phòng cũ
                    io.to(oldRoomId).emit('userLeft', { userId, username });
                    const membersInOldRoom = await getUsersInRoom(oldRoomId, roomMembers[oldRoomId]);
                    io.to(oldRoomId).emit('roomMembersUpdate', membersInOldRoom);
                    logger.info(`User ${username} left old room ${oldRoomId}`);
                }
            }

            // Tham gia phòng mới
            socket.join(roomId);
            socketRooms[socket.id] = roomId;

            if (!roomMembers[roomId]) {
                roomMembers[roomId] = new Set();
            }
            roomMembers[roomId].add(userId);

            logger.info(`User ${username} (Socket: ${socket.id}) successfully joined room ${roomId} (${room.name})`);

            // Gửi thông báo cho những người khác trong phòng
            socket.to(roomId).emit('userJoined', { userId, username, avatar: userAvatar });

            // Gửi danh sách thành viên cập nhật cho tất cả mọi người trong phòng
            const membersInCurrentRoom = await getUsersInRoom(roomId, roomMembers[roomId]);
            io.to(roomId).emit('roomMembersUpdate', membersInCurrentRoom);

            // Gửi 20 tin nhắn gần nhất cho client vừa join
            const messages = await Message.findAll({
                where: { roomId: roomId },
                order: [['createdAt', 'ASC']], // Lấy theo thứ tự ASC để hiển thị đúng
                limit: 20, // Giới hạn 20 tin nhắn
                include: [{ model: User, as: 'sender', attributes: ['id', 'username', 'avatar'] }]
            });
            socket.emit('loadMessages', messages); // Gửi cho user vừa join
            logger.info(`Sent ${messages.length} old messages to ${username} for room ${roomId}`);

            // Gửi thông báo join thành công cho client hiện tại
            socket.emit('joinSuccess', { roomId: roomId, roomName: room.name });

        } catch (error) {
            logger.error(`Error joining room ${roomId} for user ${username}:`, error);
            socket.emit('error', { message: 'Không thể tham gia phòng. Đã có lỗi xảy ra.' });
        }
    });

    // --- Sự kiện SEND MESSAGE ---
    socket.on('sendMessage', async ({ roomId, text }) => {
        if (!roomId || !text || text.trim() === '') {
            logger.warn(`Invalid sendMessage attempt from ${username}: roomId or text missing.`);
            return; // Không gửi gì nếu thiếu thông tin
        }

        // Kiểm tra user có trong phòng này không (theo `roomMembers`)
        if (!roomMembers[roomId] || !roomMembers[roomId].has(userId)) {
            logger.warn(`User ${username} (ID: ${userId}) tried to send message to room ${roomId} but is not a member according to roomMembers.`);
            socket.emit('error', { message: 'Bạn không ở trong phòng này để gửi tin nhắn.' });
            return;
        }


        const now = Date.now();
        // Anti-spam logic
        if (!spamTracker[userId]) {
            spamTracker[userId] = { count: 0, firstMessageTime: 0, blockedUntil: 0 };
        }

        if (spamTracker[userId].blockedUntil > now) {
            const timeLeft = Math.ceil((spamTracker[userId].blockedUntil - now) / 1000);
            logger.warn(`User ${username} is spam-blocked. Time left: ${timeLeft}s`);
            socket.emit('spamWarning', { message: `Bạn đang gửi tin nhắn quá nhanh. Vui lòng thử lại sau ${timeLeft} giây.` });
            return;
        }

        // Reset bộ đếm spam sau 10 giây kể từ tin nhắn đầu tiên trong chuỗi
        if (now - (spamTracker[userId].firstMessageTime || 0) > 10000) {
            spamTracker[userId].count = 1;
            spamTracker[userId].firstMessageTime = now;
        } else {
            spamTracker[userId].count++;
            if (spamTracker[userId].count > 5) { // Gửi > 5 tin trong 10s
                spamTracker[userId].blockedUntil = now + 30000; // Block 30s
                // Reset count và firstMessageTime sau khi block
                spamTracker[userId].count = 0;
                spamTracker[userId].firstMessageTime = 0;
                logger.warn(`User ${username} (ID: ${userId}) blocked for 30s due to spamming in room ${roomId}.`);
                socket.emit('spamWarning', { message: `Bạn đã bị chặn gửi tin nhắn trong 30 giây do spam.` });
                return;
            }
        }


        try {
            const messageData = {
                text: text,
                userId: userId,
                roomId: roomId,
                // timestamp sẽ tự tạo bởi Sequelize (createdAt)
            };

            const message = await Message.create(messageData);

            // Lấy lại message với thông tin user để gửi đi (Sequelize không tự populate sau create)
            const messageToSend = {
                id: message.id,
                text: message.text,
                timestamp: message.createdAt, // Sử dụng createdAt từ DB
                user: { // Thông tin người gửi từ socket.user
                    id: userId,
                    username: username,
                    avatar: userAvatar
                },
                roomId: roomId
            };

            io.to(roomId).emit('newMessage', messageToSend);
            logger.info(`Message from ${username} in room ${roomId} (ID: ${message.id}): "${text}"`);
        } catch (error) {
            logger.error(`Error sending/saving message from ${username} in room ${roomId}:`, error);
            socket.emit('error', { message: 'Không thể gửi tin nhắn. Đã có lỗi xảy ra.' });
        }
    });


    // --- Sự kiện DISCONNECT ---
    socket.on('disconnect', async (reason) => {
        logger.info(`User ${username} (Socket: ${socket.id}) disconnected. Reason: ${reason}`);
        const roomId = socketRooms[socket.id];

        if (roomId && roomMembers[roomId]) {
            roomMembers[roomId].delete(userId); // Xóa user khỏi danh sách thành viên của phòng
            delete socketRooms[socket.id];     // Xóa mapping socketId -> roomId

            logger.info(`User ${username} removed from room ${roomId} members list due to disconnect.`);

            // Thông báo cho những người khác trong phòng
            io.to(roomId).emit('userLeft', { userId, username });

            // Cập nhật danh sách thành viên cho phòng đó
            if (roomMembers[roomId].size > 0) {
                const membersInRoom = await getUsersInRoom(roomId, roomMembers[roomId]);
                io.to(roomId).emit('roomMembersUpdate', membersInRoom);
            } else {
                // Nếu không còn ai trong phòng, xóa phòng khỏi roomMembers
                delete roomMembers[roomId];
                logger.info(`Room ${roomId} is now empty and removed from active roomMembers list.`);
            }
        }
    });

    // (Tùy chọn) Xử lý lỗi chung từ socket
    socket.on('error', (error) => { // Đây là lỗi từ phía client socket, không phải lỗi emit từ server
        logger.error(`Socket reported error for user ${username} (Socket: ${socket.id}):`, error.message || error);
    });
};

// Hàm helper để lấy thông tin user từ ID
async function getUsersInRoom(roomId, userIdsSet) {
    if (!userIdsSet || userIdsSet.size === 0) {
        return [];
    }
    try {
        const users = await User.findAll({
            where: { id: { [Op.in]: Array.from(userIdsSet) } },
            attributes: ['id', 'username', 'avatar']
        });
        return users.map(u => u.get({ plain: true }));
    } catch (error) {
        console.error(`[Helper] Error fetching users for room ${roomId}:`, error);
        return [];
    }
}