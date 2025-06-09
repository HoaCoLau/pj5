// File: middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const db = require('../models');

const authMiddleware = async (req, res, next) => {
    const token = req.cookies.jwt;

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const currentUser = await db.User.findByPk(decoded.id, {
                attributes: { exclude: ['password_hash'] } // Không lấy mật khẩu
            });

            if (currentUser) {
                req.user = currentUser;
                res.locals.user = currentUser; // Giúp truy cập user trong mọi view EJS
                next();
            } else {
                res.redirect('/auth/login');
            }
        } catch (err) {
            res.redirect('/auth/login');
        }
    } else {
        res.redirect('/auth/login');
    }
};

module.exports = { authMiddleware };