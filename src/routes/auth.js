const express = require('express');
const multer = require('multer');
const auth = require('../middlewares/auth');
const Joi = require('joi');
const validate = require('../middlewares/validate');
const authController = require('../controllers/authController');
const router = express.Router();

const upload = multer({ dest: 'uploads/' });

router.get('/login', (req, res) => res.render('login', { title: 'Đăng nhập' }));
router.get('/register', (req, res) => res.render('register', { title: 'Đăng ký' }));

const registerSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  password: Joi.string().min(6).required()
});

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', authController.login);

router.get('/profile', auth, authController.profileGet);
router.post('/profile', auth, upload.single('avatar'), authController.profilePost);

router.post('/friend/:id', auth, authController.addFriend);
router.post('/friend/:id/accept', auth, authController.acceptFriend);
router.get('/friends', auth, authController.friends);

module.exports = router;