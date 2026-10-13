const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');

router.get('/conversation/:user1/:user2', messageController.getMessages);
router.post('/', messageController.sendMessage);

module.exports = router;
