const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.get('/:id/profile', verifyToken, userController.getProfile);
router.put('/:id/profile', verifyToken, userController.updateProfile);
router.put('/:id/password', verifyToken, userController.updatePassword);

module.exports = router;

