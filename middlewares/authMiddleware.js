// middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Sử dụng console.log để đảm bảo log xuất hiện.
// Bạn có thể thay thế bằng multiLogger nếu đã cấu hình đúng.
const logger = {
    info: (...args) => console.log('[INFO]', ...args),
    warn: (...args) => console.warn('[WARN]', ...args),
    error: (...args) => console.error('[ERROR]', ...args)
};

const authenticateToken = async (req, res, next) => {
    logger.info(`AuthenticateToken Middleware: Pathヒット: ${req.path}`); // Log đường dẫn đang được xử lý
    logger.info('AuthenticateToken Middleware: Cookies received:', req.cookies); // Log toàn bộ cookies server nhận được

    let token;
    const authHeader = req.headers['authorization'];

    // 1. Ưu tiên token từ Authorization header
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
        logger.info('AuthenticateToken: Token found in Authorization header.');
    }
    // 2. Nếu không có, thử lấy từ cookie
    else if (req.cookies && req.cookies.chatAuthToken) {
        token = req.cookies.chatAuthToken;
        logger.info('AuthenticateToken: Token found in cookie "chatAuthToken". Value (first 20 chars):', token.substring(0,20));
    } else {
        logger.info('AuthenticateToken: No token found in header or cookie.');
    }

    if (token == null) {
        req.user = null;
        logger.info('AuthenticateToken: No token available, req.user set to null.');
        return next();
    }

    try {
        logger.info('AuthenticateToken: Attempting to verify token:', token.substring(0,20));
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        logger.info('AuthenticateToken: Token decoded successfully:', decoded);

        const user = await User.findByPk(decoded.id, {
            attributes: ['id', 'username', 'email', 'role', 'avatar']
        });

        if (!user) {
            req.user = null;
            logger.warn(`AuthenticateToken: User not found in DB for ID: ${decoded.id} (from token). req.user set to null.`);
        } else {
            req.user = user.get({ plain: true });
            logger.info(`AuthenticateToken: User "${req.user.username}" (ID: ${req.user.id}) found and set to req.user.`);
        }
        next();
    } catch (err) {
        logger.error('AuthenticateToken: Error verifying token:', err.name, '-', err.message);
        if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
            logger.info('AuthenticateToken: Clearing invalid/expired cookie "chatAuthToken" due to error:', err.name);
            res.clearCookie('chatAuthToken', { path: '/' });
        }
        req.user = null;
        logger.info('AuthenticateToken: Due to error, req.user set to null.');
        next();
    }
};

const setViewLocals = (req, res, next) => {
    if (req.user) {
        logger.info(`SetViewLocals: req.user ("${req.user.username}") found, setting res.locals.currentUser.`);
        res.locals.currentUser = req.user;
    } else {
        logger.info('SetViewLocals: req.user IS NULL, setting res.locals.currentUser to null.');
        res.locals.currentUser = null;
    }
    next();
};

module.exports = {
    authenticateToken,
    setViewLocals
};