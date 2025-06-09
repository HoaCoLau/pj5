// File: routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { uploadChatImage } = require('../middleware/uploadMiddleware');

// Tất cả các route trong file này đều yêu cầu đăng nhập
router.use(authMiddleware);

// GET /chats/:id - Vào phòng chat
router.get('/:id', chatController.getChatRoom);
router.post('/:chatId/image', uploadChatImage.single('chatImage'), chatController.sendImageInChat);
// POST /chats - Tạo phòng chat mới
router.post('/', chatController.createChatRoom);
router.post('/:chatId/invite', chatController.inviteFriendsToChat);
router.post('/:chatId/leave', chatController.leaveChatRoom);

module.exports = router;