const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const admin = require('../middlewares/admin');
const adminController = require('../controllers/adminController');

router.get('/users', auth, admin, adminController.getUsers);
router.get('/rooms', auth, admin, adminController.getRooms);

module.exports = router;