const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middlewares/auth');
const userController = require('../controllers/userController');

const upload = multer({ dest: 'uploads/' });

router.put('/profile', auth, upload.single('avatar'), userController.updateProfile);

module.exports = router;