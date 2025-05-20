// src/controllers/friendshipController.js
const { User, Friendship, sequelize } = require('../models');
const { Op } = require('sequelize');
const logger = require('../config/logger');
const Joi = require('joi');

const targetUserSchema = Joi.object({
    targetUserId: Joi.number().integer().required(),
});

// 1. Gửi lời mời kết bạn
exports.sendFriendRequest = async (req, res) => {
    const { error, value } = targetUserSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const requesterId = req.user.id; // Từ middleware protect
    const { targetUserId: receiverId } = value;

    if (requesterId === receiverId) {
        return res.status(400).json({ success: false, message: 'You cannot send a friend request to yourself.' });
    }

    try {
        const targetUser = await User.findByPk(receiverId);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: 'Target user not found.' });
        }

        // Đảm bảo thứ tự ID để tránh trùng lặp (user1Id < user2Id)
        const userOneId = Math.min(requesterId, receiverId);
        const userTwoId = Math.max(requesterId, receiverId);

        // Kiểm tra xem đã có mối quan hệ nào giữa 2 user này chưa
        let friendship = await Friendship.findOne({
            where: { userOneId, userTwoId }
        });

        if (friendship) {
            if (friendship.status === 'accepted') {
                return res.status(400).json({ success: false, message: 'You are already friends.' });
            }
            if (friendship.status === 'pending') {
                // Nếu lời mời trước đó là do người kia gửi (receiverId là userOneId trong DB)
                if (friendship.userOneId === receiverId && friendship.userTwoId === requesterId) {
                     return res.status(400).json({ success: false, message: 'This user has already sent you a friend request. Please check your pending requests.' });
                }
                // Nếu lời mời trước đó là do mình gửi
                return res.status(400).json({ success: false, message: 'Friend request already sent.' });
            }
            if (friendship.status === 'blocked') { // Giả sử block 1 chiều
                if ((friendship.userOneId === requesterId && friendship.userTwoId === receiverId) || (friendship.userOneId === receiverId && friendship.userTwoId === requesterId)){
                     return res.status(403).json({ success: false, message: 'Cannot send request, user is blocked or has blocked you.' });
                }
            }
            // Nếu là 'declined', có thể cho gửi lại bằng cách cập nhật
            if (friendship.status === 'declined') {
                friendship.status = 'pending';
                // Quan trọng: xác định ai là người gửi mới
                if (requesterId === userOneId) { // Nếu người request hiện tại có ID nhỏ hơn
                    // giữ nguyên userOneId, userTwoId
                } else { // Nếu người request hiện tại có ID lớn hơn, tức là receiverId là userOneId cũ
                    // Cần đảo ngược nếu logic của bạn là userOneId luôn là người gửi request
                    // Tuy nhiên, với quy ước userOneId < userTwoId, chúng ta chỉ cần cập nhật status.
                    // Ai là action user sẽ phức tạp hơn nếu không có cột actionUserId
                }
                // Để đơn giản, cứ update status
                await friendship.save();
                 // TODO: Gửi thông báo socket tới receiverId
                logger.info(`Friend request re-sent from ${requesterId} to ${receiverId}`);
                return res.status(200).json({ success: true, message: 'Friend request re-sent.', friendship });
            }
        }

        // Tạo request mới với quy ước userOneId < userTwoId
        // Và cần một cách để biết ai là người chủ động gửi lời mời.
        // Cách đơn giản: khi status là 'pending', mặc định userOneId là người đã gửi lời mời TỚI userTwoId
        // Tuy nhiên, với quy ước userOneId < userTwoId, điều này không đúng.
        // => Cần thêm cột `actionUserId` hoặc logic dựa trên ai gọi API này.
        // Giải pháp tạm: ai gọi API là người gửi, người còn lại là người nhận.
        // Lưu ý: Quy ước userOneId < userTwoId giúp tránh (A,B) và (B,A) trong DB, nhưng làm phức tạp việc xác định ai gửi lời mời.

        // Cách tiếp cận khác: Không ép userOneId < userTwoId, mà (requesterId, receiverId) là duy nhất.
        // Và (receiverId, requesterId) cũng được coi là cùng một mối quan hệ.
        // Điều này cần kiểm tra 2 chiều.

        // Cách đơn giản nhất cho bây giờ:
        const existingRequest = await Friendship.findOne({
            where: {
                [Op.or]: [
                    { userOneId: requesterId, userTwoId: receiverId },
                    { userOneId: receiverId, userTwoId: requesterId }
                ]
            }
        });

        if (existingRequest) {
             if (existingRequest.status === 'accepted') return res.status(400).json({ success: false, message: 'You are already friends.' });
             if (existingRequest.status === 'pending') return res.status(400).json({ success: false, message: 'A friend request already exists between you two.' });
             if (existingRequest.status === 'blocked') return res.status(403).json({ success: false, message: 'Action blocked.' });
             // Nếu declined, cho gửi lại.
             existingRequest.userOneId = requesterId; // Người gửi request
             existingRequest.userTwoId = receiverId;
             existingRequest.status = 'pending';
             await existingRequest.save();
             // TODO: Gửi thông báo socket tới receiverId
             logger.info(`Friend request (re-sent after decline) from ${requesterId} to ${receiverId}`);
             return res.status(200).json({ success: true, message: 'Friend request sent.', friendship: existingRequest });
        }


        const newFriendship = await Friendship.create({
            userOneId: requesterId, // Người gửi là userOneId
            userTwoId: receiverId,  // Người nhận là userTwoId
            status: 'pending'
        });

        // TODO: Gửi thông báo socket tới receiverId (`targetUser.id`)
        // io.to(targetUserSocketId).emit('new_friend_request', { from: req.user });

        logger.info(`Friend request sent from ${requesterId} to ${receiverId}`);
        return res.status(201).json({ success: true, message: 'Friend request sent.', friendship: newFriendship });

    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            logger.warn(`Attempt to create duplicate friendship: ${requesterId} and ${receiverId}`);
            return res.status(409).json({ success: false, message: 'A friendship or request already exists.' });
        }
        logger.error('Error sending friend request:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};


// 2. Chấp nhận lời mời kết bạn
// Người dùng hiện tại (req.user.id) là userTwoId (người nhận lời mời)
// targetUserId (trong params) là userOneId (người đã gửi lời mời)
exports.acceptFriendRequest = async (req, res) => {
    const { error, value } = targetUserSchema.validate(req.params, { context: { isParam: true }}); // Hoặc req.body nếu gửi qua body
     if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const receiverId = req.user.id; // Người chấp nhận
    const { targetUserId: requesterId } = value; // Người đã gửi lời mời

    try {
        const friendship = await Friendship.findOne({
            where: {
                userOneId: requesterId, // Người gửi lời mời
                userTwoId: receiverId,  // Người nhận (là user hiện tại)
                status: 'pending'
            }
        });

        if (!friendship) {
            return res.status(404).json({ success: false, message: 'Friend request not found or already actioned.' });
        }

        friendship.status = 'accepted';
        await friendship.save();

        // TODO: Gửi thông báo socket tới requesterId
        // io.to(requesterSocketId).emit('friend_request_accepted', { by: req.user });

        logger.info(`Friend request from ${requesterId} to ${receiverId} accepted.`);
        return res.status(200).json({ success: true, message: 'Friend request accepted.', friendship });
    } catch (error) {
        logger.error('Error accepting friend request:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// 3. Từ chối lời mời kết bạn
exports.declineFriendRequest = async (req, res) => {
    const { error, value } = targetUserSchema.validate(req.params);
     if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const receiverId = req.user.id;
    const { targetUserId: requesterId } = value;

    try {
        const friendship = await Friendship.findOne({
            where: {
                userOneId: requesterId,
                userTwoId: receiverId,
                status: 'pending'
            }
        });

        if (!friendship) {
            return res.status(404).json({ success: false, message: 'Friend request not found.' });
        }

        // Có thể xóa bản ghi, hoặc đánh dấu là declined để tránh gửi lại liên tục
        // friendship.status = 'declined';
        // await friendship.save();
        await friendship.destroy(); // Xóa luôn lời mời

        // TODO: Gửi thông báo socket tới requesterId (tùy chọn)
        logger.info(`Friend request from ${requesterId} to ${receiverId} declined/deleted.`);
        return res.status(200).json({ success: true, message: 'Friend request declined.' });
    } catch (error) {
        logger.error('Error declining friend request:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// 4. Hủy kết bạn (hoặc Unfriend)
// User hiện tại muốn hủy kết bạn với targetUserId
exports.unfriendUser = async (req, res) => {
    const { error, value } = targetUserSchema.validate(req.params);
    if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message });
    }
    const currentUserId = req.user.id;
    const { targetUserId: friendId } = value;

    try {
        const result = await Friendship.destroy({
            where: {
                status: 'accepted',
                [Op.or]: [
                    { userOneId: currentUserId, userTwoId: friendId },
                    { userOneId: friendId, userTwoId: currentUserId }
                ]
            }
        });

        if (result === 0) {
            return res.status(404).json({ success: false, message: 'Friendship not found.' });
        }
        // TODO: Gửi thông báo socket cho friendId
        logger.info(`User ${currentUserId} unfriended user ${friendId}.`);
        return res.status(200).json({ success: true, message: 'Successfully unfriended.' });
    } catch (error) {
        logger.error('Error unfriending user:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};


// 5. Lấy danh sách bạn bè (status = 'accepted')
exports.getFriends = async (req, res) => {
    const userId = req.user.id;
    try {
        const friendships = await Friendship.findAll({
            where: {
                status: 'accepted',
                [Op.or]: [
                    { userOneId: userId },
                    { userTwoId: userId }
                ]
            },
            include: [ // Lấy thông tin của người bạn, không phải người gửi/nhận request
                {
                    model: User,
                    as: 'requester', // User là userOneId
                    attributes: ['id', 'username', 'displayName', 'avatarUrl']
                },
                {
                    model: User,
                    as: 'receiver', // User là userTwoId
                    attributes: ['id', 'username', 'displayName', 'avatarUrl']
                }
            ]
        });

        const friends = friendships.map(f => {
            // Trả về thông tin của người kia, không phải user hiện tại
            if (f.userOneId === userId) return f.receiver;
            return f.requester;
        }).filter(friend => friend != null); // Lọc ra các null nếu có lỗi dữ liệu

        logger.info(`Workspaceed friends for user ID: ${userId}`);
        return res.status(200).json({ success: true, friends });
    } catch (error) {
        logger.error('Error fetching friends:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// 6. Lấy danh sách lời mời đang chờ (người dùng hiện tại là người nhận - userTwoId)
exports.getPendingRequests = async (req, res) => {
    const userId = req.user.id; // User hiện tại là người nhận lời mời
    try {
        const requests = await Friendship.findAll({
            where: {
                userTwoId: userId,
                status: 'pending'
            },
            include: [{ // Lấy thông tin của người gửi lời mời
                model: User,
                as: 'requester', // User là userOneId
                attributes: ['id', 'username', 'displayName', 'avatarUrl']
            }]
        });
        logger.info(`Workspaceed pending friend requests for user ID: ${userId}`);
        return res.status(200).json({ success: true, requests });
    } catch (error) {
        logger.error('Error fetching pending requests:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// 7. Lấy danh sách lời mời đã gửi (người dùng hiện tại là người gửi - userOneId)
exports.getSentRequests = async (req, res) => {
    const userId = req.user.id; // User hiện tại là người gửi lời mời
    try {
        const requests = await Friendship.findAll({
            where: {
                userOneId: userId,
                status: 'pending'
            },
            include: [{ // Lấy thông tin của người nhận lời mời
                model: User,
                as: 'receiver', // User là userTwoId
                attributes: ['id', 'username', 'displayName', 'avatarUrl']
            }]
        });
        logger.info(`Workspaceed sent friend requests for user ID: ${userId}`);
        return res.status(200).json({ success: true, requests });
    } catch (error) {
        logger.error('Error fetching sent requests:', error);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};