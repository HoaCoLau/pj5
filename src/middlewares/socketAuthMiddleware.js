// src/middlewares/socketAuthMiddleware.js
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../config/logger');

const authenticateSocket = async (socket, next) => {
    // Client nên gửi token trong handshake query hoặc auth object
    // Ví dụ: const socket = io({ auth: { token: 'YOUR_JWT_TOKEN' } });
    // Hoặc: const socket = io({ query: { token: 'YOUR_JWT_TOKEN' } });
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
        logger.warn('Socket connection attempt without token.');
        return next(new Error('Authentication error: No token provided.'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id, {
            attributes: { exclude: ['password'] }
        });

        if (!user) {
            logger.warn(`Socket authentication failed: User with ID ${decoded.id} not found.`);
            return next(new Error('Authentication error: User not found.'));
        }

        // Gắn thông tin user vào socket object để sử dụng sau này
        socket.user = user;
        logger.info(`Socket authenticated for user: ${user.username} (ID: ${user.id}), Socket ID: ${socket.id}`);
        next(); // Cho phép kết nối
    } catch (error) {
        logger.error('Socket JWT verification failed:', error.message);
        if (error.name === 'TokenExpiredError') {
            return next(new Error('Authentication error: Token expired.'));
        }
        return next(new Error('Authentication error: Token verification failed.'));
    }
};

module.exports = { authenticateSocket };