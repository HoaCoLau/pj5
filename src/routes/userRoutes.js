// src/routes/userRoutes.js
const express = require('express');
const userController = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');
const { uploadAvatar } = require('../middlewares/uploadMiddleware'); // Import middleware upload

const router = express.Router();

router.get('/me', protect, userController.getMe);
router.put('/me', protect, userController.updateMe);

// PUT /api/users/me/avatar - Upload avatar (yêu cầu đăng nhập)
// `uploadAvatar.single('avatar')` 'avatar' là tên field trong form-data
router.put('/me/avatar', protect, uploadAvatar.single('avatar'), userController.updateAvatar);

module.exports = router;