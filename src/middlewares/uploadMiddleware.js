// src/middlewares/uploadMiddleware.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../config/logger');

// Đảm bảo thư mục uploads/avatars tồn tại
const avatarUploadPath = path.join(__dirname, '../../public/uploads/avatars');
if (!fs.existsSync(avatarUploadPath)) {
  fs.mkdirSync(avatarUploadPath, { recursive: true });
}

// Cấu hình lưu trữ cho avatar
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarUploadPath);
  },
  filename: (req, file, cb) => {
    // Tạo tên file duy nhất: userId-timestamp.extension
    const uniqueSuffix = `<span class="math-inline">\{req\.user\.id\}\-</span>{Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueSuffix);
  }
});

// Kiểm tra loại file (chỉ cho phép ảnh)
const avatarFileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    logger.warn(`Upload attempt with invalid file type: ${file.mimetype} by user ${req.user.id}`);
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WEBP images are allowed.'), false);
  }
};

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: avatarFileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5 // Giới hạn 5MB
  }
});

module.exports = { uploadAvatar };