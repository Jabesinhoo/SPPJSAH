const express = require('express');
const router = express.Router();

const stockZeroWebhookController = require('../controllers/stockZeroWebhookController');

router.post('/stock-zero', stockZeroWebhookController.receiveStockZeroEvent);

module.exports = router;