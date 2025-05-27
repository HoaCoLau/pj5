// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRegistration, validateLogin } = require('../middlewares/validationMiddleware');
const { authenticateToken } = require('../middlewares/authMiddleware'); // Sẽ tạo ở bước sau

// GET: Hiển thị form đăng ký
router.get('/register', authController.showRegisterForm);
// POST: Xử lý đăng ký
router.post('/register', validateRegistration, authController.register);

// GET: Hiển thị form đăng nhập
router.get('/login', authController.showLoginForm);
// POST: Xử lý đăng nhập
router.post('/login', validateLogin, authController.login);

// GET hoặc POST: Xử lý đăng xuất
router.get('/logout', authController.logout); // Hoặc POST nếu muốn
// router.post('/logout', authController.logout);

// Ví dụ route cần xác thực (sẽ cần middleware `authenticateToken`)
// router.get('/profile', authenticateToken, (req, res) => {
//     res.json({ message: `Chào mừng ${req.user.username} đến trang cá nhân!` });
// });

module.exports = router;