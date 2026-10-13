const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/register', authController.register);
router.post('/register-seller', authController.registerSeller);
router.post('/login', authController.login);

module.exports = router;
