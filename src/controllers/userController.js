// src/controllers/userController.js
const { User } = require('../models');
const logger = require('../config/logger');
const Joi = require('joi'); // Thêm Joi

// Joi Schema để validate cập nhật hồ sơ
const updateUserSchema = Joi.object({
  displayName: Joi.string().min(1).max(50).optional().allow(null, ''),
  // email: Joi.string().email().optional(), // Cẩn thận khi cho phép đổi email, cần xác minh lại
  // Thêm các trường khác bạn muốn cho phép user tự cập nhật
}).min(1); // Yêu cầu ít nhất một trường được cung cấp để cập nhật

// Lấy thông tin người dùng hiện tại (đã được xác thực)
exports.getMe = async (req, res) => {
  // ... (code đã có từ trước)
};

// Cập nhật thông tin người dùng hiện tại
exports.updateMe = async (req, res) => {
  try {
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
      const errors = error.details.map((detail) => detail.message);
      logger.warn(`Update profile validation failed for user ${req.user.id}:`, errors);
      return res.status(400).json({ success: false, errors });
    }

    // Các trường được phép cập nhật
    const allowedUpdates = ['displayName']; // Thêm 'email' vào đây nếu bạn cho phép
    const updates = {};

    for (const key in value) {
      if (allowedUpdates.includes(key) && value[key] !== undefined) {
        updates[key] = value[key];
      }
    }

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, message: 'No valid fields provided for update.' });
    }

    // req.user là instance của User model, đã được middleware `protect` lấy từ DB
    const user = req.user;

    // Cập nhật các trường
    Object.assign(user, updates);
    await user.save(); // Sequelize sẽ tự động chạy hook beforeUpdate nếu có (ví dụ hash password nếu password thay đổi)

    logger.info(`Profile updated successfully for user: ${user.username} (ID: ${user.id})`);
    // User object đã được toJSON() trong model để loại bỏ password
    return res.status(200).json({ success: true, message: 'Profile updated successfully!', user });

  } catch (error) {
    logger.error(`Error updating profile for user ${req.user.id}:`, error);
    if (error.name === 'SequelizeUniqueConstraintError') { // Nếu email bị trùng (khi cho phép đổi email)
        return res.status(409).json({ success: false, message: error.errors[0].message });
    }
    return res.status(500).json({ success: false, message: 'Server error updating profile.', error: error.message });
  }
};
exports.updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      logger.warn(`Avatar update attempt without file by user ${req.user.id}`);
      return res.status(400).json({ success: false, message: 'No avatar file uploaded.' });
    }

    const user = req.user;
    // Đường dẫn tương đối để lưu vào DB và phục vụ từ client
    // Ví dụ: /uploads/avatars/userId-timestamp.png
    // Cần loại bỏ phần `public` nếu thư mục `public` được serve tĩnh ở root
    const relativeAvatarPath = `/uploads/avatars/${req.file.filename}`;

    // (Tùy chọn) Xóa avatar cũ nếu có
    if (user.avatarUrl && user.avatarUrl !== relativeAvatarPath) { // Kiểm tra khác nhau để tránh xóa nếu upload lại cùng file
      const oldAvatarPath = path.join(__dirname, '../../public', user.avatarUrl);
      if (fs.existsSync(oldAvatarPath)) {
        try {
          fs.unlinkSync(oldAvatarPath);
          logger.info(`Old avatar deleted: ${oldAvatarPath}`);
        } catch (unlinkError) {
          logger.error(`Error deleting old avatar ${oldAvatarPath}:`, unlinkError);
        }
      }
    }

    user.avatarUrl = relativeAvatarPath;
    await user.save();

    logger.info(`Avatar updated successfully for user: ${user.username}. New avatar: ${user.avatarUrl}`);
    return res.status(200).json({
      success: true,
      message: 'Avatar updated successfully!',
      user: user // Đã toJSON()
    });

  } catch (error) {
    logger.error(`Error updating avatar for user ${req.user.id}:`, error);
    // Nếu có lỗi từ multer (ví dụ file quá lớn), nó sẽ được xử lý bởi error handler của express
    // nếu bạn không có error handler riêng cho multer.
    // Hoặc, bạn có thể bắt lỗi cụ thể của multer ở đây.
    if (error instanceof multer.MulterError) {
        return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: 'Server error updating avatar.', error: error.message });
  }
};