// File: controllers/chatController.js
const db = require('../models');
const { Op } = require('sequelize');
// Hiển thị trang chat chi tiết
exports.getChatRoom = async (req, res) => {
    try {
        const chatId = req.params.id;
        const currentUserId = req.user.id;

        // 1. Kiểm tra xem user có phải là thành viên không
        const member = await db.ChatMember.findOne({
            where: { chat_id: chatId, user_id: currentUserId }
        });

        if (!member) {
            return res.status(403).send("<h1>403 - Bạn không phải là thành viên của phòng chat này.</h1>");
        }

        const chat = await db.Chat.findByPk(chatId);
        if (!chat) {
            return res.status(404).send("<h1>404 - Không tìm thấy phòng chat.</h1>");
        }

        // 2. Lấy danh sách ID của các thành viên hiện tại
        const currentMembers = await db.ChatMember.findAll({ where: { chat_id: chatId }, attributes: ['user_id'] });
        const memberIds = currentMembers.map(m => m.user_id);

        // --- PHẦN BỊ THIẾU CỦA BẠN NẰM Ở ĐÂY ---
        // 3. Lấy danh sách tất cả bạn bè của người dùng hiện tại
        const friendships = await db.Friendship.findAll({
            where: {
                status: 'accepted',
                [Op.or]: [
                    { requester_id: currentUserId },
                    { addressee_id: currentUserId }
                ]
            },
            include: [
                { model: db.User, as: 'Requester', attributes: ['id', 'username', 'avatar_url'] },
                { model: db.User, as: 'Addressee', attributes: ['id', 'username', 'avatar_url'] }
            ]
        });
        // ------------------------------------------

        // Dòng này sẽ không còn lỗi vì biến `friendships` đã được định nghĩa ở trên
        const allFriends = friendships.map(f => f.requester_id === currentUserId ? f.Addressee : f.Requester);

        // 4. Lọc ra những bạn bè chưa có trong phòng để hiển thị trong danh sách mời
        const friendsToInvite = allFriends.filter(friend => !memberIds.includes(friend.id));

        const token = req.cookies.jwt;
        res.render('chat', {
            title: chat.name || 'Phòng Chat',
            chat: chat,
            token: token,
            friendsToInvite: friendsToInvite
        });

    } catch (error) {
        console.error("Lỗi vào phòng chat:", error);
        res.status(500).send("Lỗi server");
    }
};


// Xử lý tạo phòng chat mới
exports.createChatRoom = async (req, res) => {
    try {
        const { name, invited_friends } = req.body;
        if (!name) { return res.status(400).redirect('/'); }

        const newChat = await db.Chat.create({ name, is_group: true, created_by: req.user.id });

        // Tạo danh sách thành viên, bao gồm người tạo và những người được mời
        const memberIds = [req.user.id];
        if (invited_friends) {
            // Đảm bảo invited_friends luôn là một mảng
            const friends = Array.isArray(invited_friends) ? invited_friends : [invited_friends];
            memberIds.push(...friends);
        }

        const chatMembers = memberIds.map(id => ({ chat_id: newChat.id, user_id: id }));
        await db.ChatMember.bulkCreate(chatMembers);

        res.redirect(`/chats/${newChat.id}`);


    } catch (error) {
        console.error(error);
        res.status(500).send('Lỗi server');
    }
};
exports.sendImageInChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user.id;
        const io = req.app.get('io');

        // 1. Kiểm tra file và quyền thành viên
        if (!req.file) return res.status(400).json({ error: 'Không có file nào được tải lên.' });
        const member = await db.ChatMember.findOne({ where: { chat_id: chatId, user_id: userId } });
        if (!member) return res.status(403).json({ error: 'Bạn không phải là thành viên của phòng chat này.' });

        // 2. Tạo tin nhắn loại 'image'
        const message = await db.Message.create({
            sender_id: userId,
            chat_id: chatId,
            message_type: 'image',
            content: `/uploads/chat_images/${req.file.filename}` // Lưu đường dẫn vào content
        });

        // 3. Lấy lại thông tin tin nhắn để gửi qua socket
        const fullMessage = await db.Message.findByPk(message.id, {
            include: [{ model: db.User, as: 'Sender', attributes: ['id', 'username', 'avatar_url'] }]
        });

        // 4. Gửi tin nhắn ảnh qua Socket.IO đến mọi người trong phòng
        io.to(chatId).emit('message', fullMessage);

        res.status(200).json({ success: true, message: fullMessage });
    } catch (error) {
        console.error("Lỗi gửi ảnh trong chat:", error);
        res.status(500).json({ error: 'Lỗi server' });
    }
};

exports.inviteFriendsToChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        let { friendsToInvite } = req.body; // Đây là mảng ID của bạn bè được chọn
        const io = req.app.get('io');
        const currentUser = req.user;

        // Nếu không mời ai thì thôi
        if (!friendsToInvite) {
            return res.redirect(`/chats/${chatId}`);
        }
        
        // Đảm bảo friendsToInvite luôn là một mảng
        if (!Array.isArray(friendsToInvite)) {
            friendsToInvite = [friendsToInvite];
        }

        // Tạo các bản ghi thành viên mới
        const newMembersData = friendsToInvite.map(friendId => ({
            chat_id: chatId,
            user_id: friendId
        }));

        await db.ChatMember.bulkCreate(newMembersData, { ignoreDuplicates: true });

        // Lấy tên của những người bạn vừa được mời để tạo thông báo
        const invitedUsers = await db.User.findAll({
            where: { id: { [Op.in]: friendsToInvite } },
            attributes: ['username']
        });
        const invitedUsernames = invitedUsers.map(u => u.username).join(', ');

        // Gửi thông báo real-time tới phòng chat
        const notification = {
            message_type: 'system',
            content: `${currentUser.username} đã mời ${invitedUsernames} vào phòng.`
        };
        io.to(chatId).emit('message', notification);
        
        res.redirect(`/chats/${chatId}`);
    } catch (error) {
        console.error("Lỗi mời bạn bè:", error);
        res.redirect(`/chats/${req.params.chatId}`);
    }
};

// POST /chats/:chatId/leave - Người dùng rời phòng
// Phiên bản hoàn chỉnh
exports.leaveChatRoom = async (req, res) => {
    try {
        // 1. Lấy các thông tin cần thiết
        const { chatId } = req.params;
        const userId = req.user.id;
        const username = req.user.username;
        const io = req.app.get('io');

        // 2. Xóa bản ghi thành viên của người dùng trong phòng chat này
        const result = await db.ChatMember.destroy({
            where: {
                chat_id: chatId,
                user_id: userId
            }
        });

        // 3. Nếu xóa thành công (result > 0), gửi thông báo cho các thành viên còn lại
        if (result > 0) {
            const notification = {
                message_type: 'system',
                content: `${username} đã rời khỏi phòng.`
            };
            io.to(chatId).emit('message', notification);
        }

        // 4. Chuyển hướng người dùng về trang chủ
        res.redirect('/');

    } catch (error) {
        console.error("Lỗi khi rời phòng:", error);
        res.status(500).send("Đã có lỗi xảy ra.");
    }
};

exports.deleteChatRoom = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        // Lấy phòng chat
        const chat = await db.Chat.findByPk(chatId);

        // Chỉ cho phép người tạo hoặc admin xóa
        if (!chat || (chat.created_by !== userId && userRole !== 'admin')) {
            return res.status(403).send('Bạn không có quyền xóa phòng này.');
        }

        // Xóa các bản ghi liên quan (ChatMember, Message, ...)
        await db.ChatMember.destroy({ where: { chat_id: chatId } });
        await db.Message.destroy({ where: { chat_id: chatId } });

        // Xóa phòng chat
        await chat.destroy();

        res.redirect('/');
    } catch (error) {
        console.error('Lỗi xóa phòng chat:', error);
        res.status(500).send('Lỗi server');
    }
};