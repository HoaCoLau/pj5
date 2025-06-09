// File: utils/token.js
const jwt = require('jsonwebtoken');

// Hàm để tạo token
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: '1d', // Token hết hạn sau 1 ngày
    });
};

module.exports = { generateToken };