const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roomController = require('../controllers/roomController');

router.post('/', auth, roomController.createRoom);
router.get('/', auth, roomController.getRooms);

module.exports = router;