// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models'); // User model từ Sequelize
const { Op } = require('sequelize'); // Để dùng OR trong query

// --- Logger (Sử dụng console.log nếu multiLogger chưa được truyền vào đây) ---
// Nếu bạn có một instance logger chung (ví dụ multiLogger từ app.js) và muốn dùng ở đây,
// bạn cần có cách để truyền nó vào (ví dụ: thông qua một object services hoặc khởi tạo logger riêng).
// Để đơn giản, ví dụ này sẽ dùng console.log.
const logger = {
    info: console.log,
    warn: console.warn,
    error: console.error
};
// Thay thế logger ở trên bằng multiLogger của bạn nếu có.

// GET /auth/register - Hiển thị form đăng ký
exports.showRegisterForm = (req, res) => {
    res.render('auth/register', {
        title: 'Đăng ký',
        errors: [],
        formData: {},
        // user: req.user // đã có currentUser từ setViewLocals
    });
};

// POST /auth/register - Xử lý đăng ký
exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        logger.info(`Register attempt for username: ${username}, email: ${email}`);

        const existingUser = await User.findOne({
            where: {
                [Op.or]: [{ email: email }, { username: username }]
            }
        });

        if (existingUser) {
            const errors = [];
            if (existingUser.email === email) {
                errors.push({ field: 'email', message: 'Email này đã được sử dụng.' });
                logger.warn(`Registration failed: Email ${email} already exists.`);
            }
            if (existingUser.username === username) {
                errors.push({ field: 'username', message: 'Username này đã tồn tại.' });
                logger.warn(`Registration failed: Username ${username} already exists.`);
            }
            return res.status(400).render('auth/register', {
                title: 'Đăng ký',
                errors: errors,
                formData: req.body
            });
        }

        const newUser = await User.create({
            username,
            email,
            password // Hook `beforeCreate` trong model User sẽ hash mật khẩu này
        });

        logger.info(`User registered successfully: ${newUser.username} (ID: ${newUser.id})`);
        res.status(201).json({
            message: 'Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ.',
            userId: newUser.id
        });

    } catch (error) {
        logger.error("Register error:", error.message, error.stack);
        const errors = (error.errors || []).map(err => ({ field: err.path, message: err.message }));
        if (errors.length === 0 && error.message) {
            errors.push({ field: 'general', message: 'Đã có lỗi xảy ra trong quá trình đăng ký.' });
        }
        res.status(500).render('auth/register', {
            title: 'Đăng ký',
            errors: errors.length > 0 ? errors : [{ message: 'Lỗi server, vui lòng thử lại.' }],
            formData: req.body
        });
    }
};

// GET /auth/login - Hiển thị form đăng nhập
exports.showLoginForm = (req, res) => {
    // Nếu đã có cookie token hợp lệ và user đã được set (ví dụ F5 trang login)
    // thông qua middleware authenticateToken và setViewLocals
    if (res.locals.currentUser) { // Kiểm tra qua res.locals.currentUser
        logger.info(`User ${res.locals.currentUser.username} already logged in, redirecting to /`);
        return res.redirect('/');
    }
    res.render('auth/login', {
        title: 'Đăng nhập',
        errors: [],
        formData: {}
    });
};

// POST /auth/login - Xử lý đăng nhập
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        logger.info(`Login attempt for email: ${email}`);

        const user = await User.findOne({ where: { email } });

        if (!user) {
            logger.warn(`Login failed: Email ${email} not found.`);
            return res.status(401).render('auth/login', {
                title: 'Đăng nhập',
                errors: [{ field: 'email', message: 'Email không tồn tại.' }],
                formData: req.body
            });
        }

        const isMatch = await user.validPassword(password);

        if (!isMatch) {
            logger.warn(`Login failed: Incorrect password for email ${email}.`);
            return res.status(401).render('auth/login', {
                title: 'Đăng nhập',
                errors: [{ field: 'password', message: 'Mật khẩu không chính xác.' }],
                formData: req.body
            });
        }

        logger.info(`User ${user.username} credentials validated successfully.`);
        const payload = {
            id: user.id,
            username: user.username,
            role: user.role
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRATION }
        );

        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: parseInt(process.env.JWT_EXPIRATION_MILLISECONDS || 3600000), // default 1 hour
            path: '/'
        };

        logger.info(`Login: Setting cookie 'chatAuthToken' for user: ${user.username} with options:`, cookieOptions);
        res.cookie('chatAuthToken', token, cookieOptions);

        res.status(200).json({
            message: 'Đăng nhập thành công!',
            token: token, // Vẫn gửi token cho client JS sử dụng (Socket.IO, API calls)
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                avatar: user.avatar
            }
        });

    } catch (error) {
        logger.error("Login error:", error.message, error.stack);
        res.status(500).render('auth/login', {
            title: 'Đăng nhập',
            errors: [{ message: 'Lỗi server, vui lòng thử lại.' }],
            formData: req.body
        });
    }
};

// GET /auth/logout - Xử lý đăng xuất
exports.logout = (req, res) => {
    const username = req.user ? req.user.username : 'Unknown user'; // Lấy username từ req.user nếu có
    logger.info(`Logout attempt for user: ${username}`);

    // Xóa HTTPOnly cookie
    // Quan trọng: phải có path khi clear, giống như khi set
    res.clearCookie('chatAuthToken', { path: '/' });
    logger.info(`Logout: Cleared cookie 'chatAuthToken' for user: ${username}`);

    // Client-side cũng nên xóa token từ localStorage
    // Trả về JSON để client-side xử lý (ví dụ: redirect)
    res.status(200).json({ message: 'Đăng xuất thành công.' });
};