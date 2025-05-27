// middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authenticateToken = async (req, res, next) => {
    let token;
    const authHeader = req.headers['authorization'];

    // 1. Ưu tiên token từ Authorization header (cho API calls)
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }
    // 2. Nếu không có, thử lấy từ cookie (cho web navigation)
    else if (req.cookies && req.cookies.chatAuthToken) {
        token = req.cookies.chatAuthToken;
    }

    if (token == null) {
        req.user = null; // Không có token, user chưa đăng nhập
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id, {
            attributes: ['id', 'username', 'email', 'role', 'avatar']
        });

        if (!user) {
            req.user = null; // User không tìm thấy (token hợp lệ nhưng user đã bị xóa?)
        } else {
            req.user = user.get({ plain: true }); // Gắn user vào request
        }
        next();
    } catch (err) {
        // Nếu token không hợp lệ (hết hạn, sai chữ ký), coi như user chưa đăng nhập
        // Xóa cookie nếu nó không hợp lệ để tránh lỗi lặp lại
        if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
            // Sử dụng logger của bạn ở đây nếu có, ví dụ:
            // multiLogger.info('authenticateToken: Clearing invalid/expired cookie chatAuthToken due to error:', err.name);
            console.log('authenticateToken: Clearing invalid/expired cookie chatAuthToken due to error:', err.name);
            res.clearCookie('chatAuthToken', { path: '/' }); // <--- THÊM { path: '/' } VÀO ĐÂY
        }
        req.user = null;
        next();
    }
};

// ... (authorizeRole, setViewLocals giữ nguyên)
// setViewLocals sẽ tự động sử dụng req.user đã được authenticateToken thiết lập
const setViewLocals = (req, res, next) => {
    if (req.user) {
        res.locals.currentUser = req.user;
    } else {
        res.locals.currentUser = null;
    }
    // ... (flash messages nếu có)
    next();
};


module.exports = {
    authenticateToken,
    // authorizeRole, // Chưa dùng nên có thể comment nếu muốn
    setViewLocals
};