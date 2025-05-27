const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const Joi = require('joi');
const validate = require('../middlewares/validate');
const roomController = require('../controllers/roomController');

const roomSchema = Joi.object({
  name: Joi.string().min(2).max(50).required()
});

router.post('/', auth, validate(roomSchema), roomController.createRoom);
router.get('/:room/messages', auth, roomController.getRoomMessages);

module.exports = router;