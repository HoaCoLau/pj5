const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const messageController = require('../controllers/messageController');

router.get('/:roomId/messages', auth, messageController.getRoomMessages);

module.exports = router;