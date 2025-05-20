// src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const { User } = require('../models'); // Lấy User model từ models/index.js
const logger = require('../config/logger');

const protect = async (req, res, next) => {
  let token;

  // Kiểm tra xem token có trong header 'Authorization' và bắt đầu bằng 'Bearer' không
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Lấy token từ header (loại bỏ 'Bearer ')
      token = req.headers.authorization.split(' ')[1];

      // Xác minh token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Lấy thông tin user từ token (không bao gồm password) và gắn vào request
      // Bạn có thể muốn chỉ lấy ID và query lại DB để đảm bảo user vẫn tồn tại và thông tin là mới nhất
      req.user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] } // Loại bỏ trường password
      });

      if (!req.user) {
        logger.warn(`Authentication failed: User with ID ${decoded.id} not found.`);
        return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      }

      logger.info(`User authenticated: ${req.user.username} (ID: ${req.user.id}) for ${req.method} ${req.originalUrl}`);
      next(); // Chuyển sang middleware/controller tiếp theo
    } catch (error) {
      logger.error('JWT verification failed:', error.message);
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Not authorized, token expired' });
      }
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    logger.warn('No token provided for a protected route.');
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};

// Middleware để kiểm tra vai trò Admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    logger.info(`Admin access granted for user: ${req.user.username} (ID: ${req.user.id})`);
    next();
  } else {
    logger.warn(`Unauthorized admin access attempt by user: ${req.user ? req.user.username : 'Unknown'}`);
    return res.status(403).json({ success: false, message: 'Not authorized as an admin' }); // 403 Forbidden
  }
};

module.exports = { protect, isAdmin };