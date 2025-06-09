// File: middleware/uploadMiddleware.js

const multer = require('multer');
const path = require('path');

// Cấu hình nơi lưu trữ cho AVATAR
const avatarStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/avatars/');
    },
    filename: function (req, file, cb) {
        // Tên file cho avatar
        const uniqueSuffix = req.user.id + '-' + Date.now();
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Cấu hình nơi lưu trữ cho ẢNH CHAT
const chatImageStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/chat_images/');
    },
    filename: function (req, file, cb) {
        // Tên file cho ảnh chat
        const uniqueSuffix = req.user.id + '-' + Date.now();
        cb(null, 'image-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Hàm kiểm tra loại file, dùng chung cho cả hai
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
        return cb(null, true);
    }
    cb(new Error('Lỗi: Chỉ chấp nhận file ảnh (jpeg, jpg, png, gif)!'));
};

// Xuất ra 2 middleware khác nhau với cấu hình storage tương ứng
module.exports = {
    uploadAvatar: multer({
        storage: avatarStorage, // Dùng storage cho avatar
        fileFilter: fileFilter,
        limits: { fileSize: 5 * 1024 * 1024 }
    }),
    uploadChatImage: multer({
        storage: chatImageStorage, // Dùng storage cho ảnh chat
        fileFilter: fileFilter,
        limits: { fileSize: 10 * 1024 * 1024 }
    })
};