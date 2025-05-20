const express = require('express');
const userController = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware'); // Import middleware

const router = express.Router();

// GET /api/users/me - Lấy thông tin người dùng hiện tại (đã đăng nhập)
router.get('/me', protect, userController.getMe);

module.exports = router;
