const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const friendController = require('../controllers/friendController');

router.post('/invite', auth, friendController.invite);
router.post('/accept', auth, friendController.accept);
router.get('/', auth, friendController.list);

module.exports = router;