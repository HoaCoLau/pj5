// src/controllers/authController.js
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { User } = require('../models'); // Lấy User model từ models/index.js
const logger = require('../config/logger');

// Joi Schemas để validate input
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  displayName: Joi.string().min(3).max(50).optional().allow(null, ''), // Cho phép null hoặc rỗng
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// Hàm tạo token JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// Đăng ký
exports.register = async (req, res) => {
  try {
    // 1. Validate request body
    const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
    if (error) {
      const errors = error.details.map((detail) => detail.message);
      logger.warn('Registration validation failed:', errors);
      return res.status(400).json({ success: false, errors });
    }

    const { username, email, password, displayName } = value;

    // 2. Kiểm tra User/Email đã tồn tại chưa (Sequelize unique constraint cũng sẽ báo lỗi, nhưng báo sớm thân thiện hơn)
    const existingUserByEmail = await User.findOne({ where: { email } });
    if (existingUserByEmail) {
      logger.warn(`Registration attempt with existing email: ${email}`);
      return res.status(409).json({ success: false, message: 'Email already registered.' }); // 409 Conflict
    }
    const existingUserByUsername = await User.findOne({ where: { username } });
    if (existingUserByUsername) {
      logger.warn(`Registration attempt with existing username: ${username}`);
      return res.status(409).json({ success: false, message: 'Username already exists.' });
    }

    // 3. Tạo User mới (mật khẩu đã được hash bởi hook trong Model)
    const newUser = await User.create({
      username,
      email,
      password, // Mật khẩu thô, hook sẽ hash
      displayName: displayName || username, // Nếu displayName rỗng, dùng username
    });

    logger.info(`User registered successfully: ${newUser.username} (ID: ${newUser.id})`);

    // 4. Tạo Token
    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully!',
      user: newUser, // newUser.toJSON() sẽ được gọi tự động
      token,
    });

  } catch (err) {
    // Xử lý lỗi từ Sequelize (ví dụ: nếu không check duplicate trước, unique constraint sẽ throw lỗi ở đây)
    if (err.name === 'SequelizeUniqueConstraintError') {
        const field = err.errors[0].path;
        const value = err.errors[0].value;
        const message = `The <span class="math-inline">\{field\} '</span>{value}' is already taken. Constraint: ${err.fields ? Object.keys(err.fields).join(', ') : 'N/A'}`;
        logger.error('Registration SequelizeUniqueConstraintError:', { field, value, originalError: err });
        return res.status(409).json({ success: false, message });
    }
    logger.error('Server error during registration:', err);
    return res.status(500).json({ success: false, message: 'Server error during registration.', error: err.message });
  }
};

// Đăng nhập
exports.login = async (req, res) => {
  try {
    // 1. Validate request body
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      const errors = error.details.map((detail) => detail.message);
      logger.warn('Login validation failed:', errors);
      return res.status(400).json({ success: false, errors });
    }

    const { email, password } = value;

    // 2. Tìm User bằng email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      logger.warn(`Login attempt failed for email (not found): ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid email or password.' }); // Thông báo chung chung
    }

    // 3. So sánh mật khẩu
    const isMatch = await user.isValidPassword(password);
    if (!isMatch) {
      logger.warn(`Login attempt failed for user (wrong password): ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    logger.info(`User logged in successfully: ${user.username} (ID: ${user.id})`);

    // 4. Tạo Token
    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully!',
      user: user, // user.toJSON() được gọi tự động
      token,
    });

  } catch (err) {
    logger.error('Server error during login:', err);
    return res.status(500).json({ success: false, message: 'Server error during login.', error: err.message });
  }
};