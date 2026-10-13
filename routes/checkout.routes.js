const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkout.controller');

router.post('/confirm', checkoutController.confirmOrder);

module.exports = router;
