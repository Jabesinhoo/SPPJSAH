const express = require('express');
const router = express.Router();

const stockZeroController = require('../controllers/stockZeroController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/stock-zero', stockZeroController.renderStockZeroPage);

router.get('/api/stock-zero', stockZeroController.listStockZeroEvents);

router.patch('/api/stock-zero/:wooProductId/purchased', stockZeroController.markProductPurchased);

module.exports = router;