// routes/roomRoutes.js
const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController'); // Sẽ tạo ở bước sau
const { authenticateToken, authorizeRole } = require('../middlewares/authMiddleware'); // Đảm bảo user đã đăng nhập
const { validateRoomCreation } = require('../middlewares/validationMiddleware'); // Sẽ cập nhật validationMiddleware

// @route   GET /rooms
// @desc    Hiển thị danh sách tất cả các phòng chat
// @access  Private (cần đăng nhập)
router.get('/', authenticateToken, roomController.listRooms);

// @route   GET /rooms/new
// @desc    Hiển thị form tạo phòng mới
// @access  Private (cần đăng nhập)
router.get('/new', authenticateToken, roomController.showCreateRoomForm);

// @route   POST /rooms
// @desc    Xử lý việc tạo phòng mới
// @access  Private (cần đăng nhập)
router.post('/', authenticateToken, validateRoomCreation, roomController.createRoom);

// @route   GET /rooms/:roomId
// @desc    Hiển thị một phòng chat cụ thể (chi tiết phòng và tin nhắn)
// @access  Private (cần đăng nhập)
// Chúng ta sẽ làm chi tiết route này sau, khi tích hợp giao diện chat
router.get('/:roomId', authenticateToken, roomController.showRoom);


module.exports = router;