const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const isAdmin = require('../middlewares/isAdmin');
const adminController = require('../controllers/adminController');

router.get('/', auth, isAdmin, adminController.dashboard);
router.post('/user/:id/delete', auth, isAdmin, adminController.deleteUser);
router.post('/room/:id/delete', auth, isAdmin, adminController.deleteRoom);

module.exports = router;