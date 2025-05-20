// src/routes/friendshipRoutes.js
const express = require('express');
const friendshipController = require('../controllers/friendshipController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect); // Tất cả route này cần đăng nhập

router.post('/request', friendshipController.sendFriendRequest); // Body: { targetUserId }
router.put('/accept/:targetUserId', friendshipController.acceptFriendRequest); // targetUserId là ID người đã gửi
router.put('/decline/:targetUserId', friendshipController.declineFriendRequest); // targetUserId là ID người đã gửi
router.delete('/unfriend/:targetUserId', friendshipController.unfriendUser); // targetUserId là ID của bạn bè

router.get('/list', friendshipController.getFriends); // Lấy danh sách bạn bè
router.get('/requests/pending', friendshipController.getPendingRequests); // Lời mời nhận được
router.get('/requests/sent', friendshipController.getSentRequests);     // Lời mời đã gửi

module.exports = router;