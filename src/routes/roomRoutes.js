// src/routes/roomRoutes.js
const express = require('express');
const roomController = require('../controllers/roomController');
const { protect } = require('../middlewares/authMiddleware'); // Middleware xác thực

const router = express.Router();

// Tất cả các route trong file này đều yêu cầu xác thực (đăng nhập)
router.use(protect);

router.post('/', roomController.createRoom);           // POST /api/rooms - Tạo phòng mới
router.get('/', roomController.getAllRooms);           // GET /api/rooms - Lấy danh sách phòng
router.get('/:roomId', roomController.getRoomById);    // GET /api/rooms/:roomId - Lấy chi tiết phòng
router.post('/:roomId/join', roomController.joinRoom); // POST /api/rooms/:roomId/join - Tham gia phòng
router.post('/:roomId/leave', roomController.leaveRoom);// POST /api/rooms/:roomId/leave - Rời phòng
router.get('/:roomId/messages', roomController.getMessagesForRoom); // GET /api/rooms/:roomId/messages

module.exports = router;