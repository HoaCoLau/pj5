// src/controllers/userController.js
const { User } = require('../models');
const logger = require('../config/logger');

// Lấy thông tin người dùng hiện tại (đã được xác thực)
exports.getMe = async (req, res) => {
  try {
    // req.user đã được middleware `protect` gắn vào
    const user = req.user;
    if (!user) { // Kiểm tra này có thể hơi thừa vì protect đã kiểm tra
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    logger.info(`Workspaceing profile for user: ${user.username}`);
    // User object đã được toJSON() trong model để loại bỏ password
    return res.status(200).json({ success: true, user });
  } catch (error) {
    logger.error('Error fetching current user profile:', error);
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
};