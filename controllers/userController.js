// File: controllers/userController.js
const db = require('../models');
const { Op } = require('sequelize'); 
// GET /users/profile - Hiển thị trang hồ sơ
exports.getProfile = (req, res) => {
    // req.user đã được cung cấp bởi authMiddleware
    res.render('profile', {
        title: 'Hồ sơ của bạn',
    });
};

// POST /users/profile - Cập nhật hồ sơ
exports.updateProfile = async (req, res) => {
    try {
        const { username, bio } = req.body;
        const userId = req.user.id;

        const userToUpdate = await db.User.findByPk(userId);

        if (userToUpdate) {
            userToUpdate.username = username;
            userToUpdate.bio = bio;

            // Kiểm tra xem có file mới được upload không
            if (req.file) {

                userToUpdate.avatar_url = `/uploads/avatars/${req.file.filename}`;
            }

            await userToUpdate.save();
        }

        res.redirect('/users/profile');

    } catch (error) {
        console.error('Lỗi cập nhật profile:', error);
        res.redirect('/users/profile');
    }
};

exports.listUsers = async (req, res) => {
    try {
        const currentUser = req.user;

        // Lấy tất cả user TRỪ người dùng hiện tại
        let users = await db.User.findAll({
            where: {
                id: { [Op.ne]: currentUser.id }
            }
        });

        // Lấy tất cả mối quan hệ bạn bè hoặc lời mời liên quan đến user hiện tại
        const friendships = await db.Friendship.findAll({
            where: {
                [Op.or]: [
                    { requester_id: currentUser.id },
                    { addressee_id: currentUser.id }
                ]
            }
        });

        // Lấy danh sách ID đã là bạn hoặc đã gửi/nhận lời mời
        const relatedIds = new Set();
        friendships.forEach(f => {
            relatedIds.add(f.requester_id === currentUser.id ? f.addressee_id : f.requester_id);
        });

        // Lọc ra những user chưa có bất kỳ mối quan hệ nào với mình
        users = users.filter(u => !relatedIds.has(u.id));

        res.render('users', {
            title: 'Tìm bạn bè',
            users: users
        });

    } catch (error) {
        console.error('Lỗi lấy danh sách user:', error);
        res.status(500).send('Lỗi server');
    }
};

// POST /users/friends/request/:id - Gửi lời mời kết bạn
exports.sendFriendRequest = async (req, res) => {
    try {
        const requesterId = req.user.id;
        const addresseeId = req.params.id;

        // Không cho phép tự kết bạn với chính mình
        if (requesterId.toString() === addresseeId.toString()) {
            return res.status(400).redirect('/users');
        }

        // Kiểm tra xem đã có mối quan hệ nào giữa 2 người chưa (bất kể trạng thái)
        const existingFriendship = await db.Friendship.findOne({
            where: {
                [Op.or]: [
                    { requester_id: requesterId, addressee_id: addresseeId },
                    { requester_id: addresseeId, addressee_id: requesterId }
                ]
            }
        });

        if (existingFriendship) {
            // Đã tồn tại, không tạo mới
            console.log('Yêu cầu kết bạn đã tồn tại.');
            return res.redirect('/users');
        }

        // Nếu chưa có, tạo một yêu cầu mới với trạng thái 'pending'
        await db.Friendship.create({
            requester_id: requesterId,
            addressee_id: addresseeId,
            status: 'pending'
        });

        res.redirect('/users');

    } catch (error) {
        console.error('Lỗi gửi lời mời kết bạn:', error);
        res.status(500).send('Lỗi server');
    }
};
exports.listFriendsAndRequests = async (req, res) => {
    try {
        const currentUserId = req.user.id;

        // 1. Lấy danh sách lời mời đang chờ mà người khác gửi cho mình
        const pendingRequests = await db.Friendship.findAll({
            where: {
                addressee_id: currentUserId,
                status: 'pending'
            },
            include: [{ // Lấy thông tin của người gửi lời mời
                model: db.User,
                as: 'Requester',
                attributes: ['id', 'username', 'avatar_url']
            }]
        });

        // 2. Lấy danh sách bạn bè đã được chấp nhận
        const acceptedFriendships = await db.Friendship.findAll({
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

        // Xử lý để chỉ lấy ra thông tin của "người bạn", không phải của chính mình
        const friends = acceptedFriendships.map(friendship => {
            return friendship.requester_id === currentUserId ? friendship.Addressee : friendship.Requester;
        });

        res.render('friends', {
            title: 'Bạn bè',
            pendingRequests: pendingRequests,
            friends: friends
        });

    } catch (error) {
        console.error("Lỗi lấy danh sách bạn bè:", error);
        res.status(500).send("Lỗi server");
    }
};

// POST /users/friends/accept/:friendshipId - Chấp nhận lời mời
exports.acceptFriendRequest = async (req, res) => {
    try {
        const { friendshipId } = req.params;
        const currentUserId = req.user.id;

        const request = await db.Friendship.findByPk(friendshipId);

        // Kiểm tra xem lời mời có tồn tại và có đúng là gửi cho mình không
        if (!request || request.addressee_id !== currentUserId) {
            return res.status(404).send("Không tìm thấy lời mời hoặc bạn không có quyền.");
        }

        // Cập nhật trạng thái thành 'accepted'
        request.status = 'accepted';
        await request.save();

        res.redirect('/users/friends');

    } catch (error) {
        console.error("Lỗi chấp nhận lời mời:", error);
        res.status(500).send("Lỗi server");
    }
};