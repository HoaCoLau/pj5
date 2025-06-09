// File: controllers/authController.js
const bcrypt = require('bcryptjs');
const db = require('../models');
const { generateToken } = require('../utils/token');

// GET /auth/register - Hiển thị form đăng ký
exports.getRegister = (req, res) => {
    res.render('auth/register', {
        title: 'Đăng Ký',
        layout: 'layouts/main' // Chúng ta sẽ tạo layout này sau
    });
};

// POST /auth/register - Xử lý đăng ký
exports.postRegister = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Kiểm tra user đã tồn tại chưa
        const userExists = await db.User.findOne({ where: { email } });
        if (userExists) {
            return res.status(400).render('auth/register', {
                title: 'Đăng Ký',
                error: 'Email đã được sử dụng.'
            });
        }

        // Mã hóa mật khẩu
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Tạo user mới
        const user = await db.User.create({
            username,
            email,
            password_hash
        });

        // Tạo token và cookie, sau đó chuyển hướng
        const token = generateToken(user.id, user.role);
        res.cookie('jwt', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
        res.redirect('/');

    } catch (error) {
        console.error(error);
        res.status(500).render('auth/register', {
            title: 'Đăng Ký',
            error: 'Đã có lỗi xảy ra. Vui lòng thử lại.'
        });
    }
};

exports.getLogin = (req, res) => {
    res.render('auth/login', { title: 'Đăng Nhập' });
};

// POST /auth/login - Xử lý đăng nhập
exports.postLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await db.User.findOne({ where: { email } });

        // Kiểm tra user và mật khẩu
        if (user && (await bcrypt.compare(password, user.password_hash))) {
            const token = generateToken(user.id, user.role);
            res.cookie('jwt', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
            res.redirect('/');
        } else {
            res.status(400).render('auth/login', {
                title: 'Đăng Nhập',
                error: 'Email hoặc mật khẩu không chính xác.'
            });
        }
    } catch (error) {
        res.status(500).send('Lỗi server');
    }
};

// GET /auth/logout - Xử lý đăng xuất
exports.logout = (req, res) => {
    res.cookie('jwt', '', { maxAge: 1 }); // Xóa cookie
    res.redirect('/auth/login');
};