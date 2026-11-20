const express = require('express');
const router = express.Router();

const stockZeroController = require('../controllers/stockZeroController');
const { requireAuth, authorize } = require('../middleware/authMiddleware');

router.use(requireAuth);

const requireAdmin = authorize('admin');

router.get('/stock-zero', requireAdmin, stockZeroController.renderStockZeroPage);

router.get('/api/stock-zero', requireAdmin, stockZeroController.listStockZeroEvents);

router.patch('/api/stock-zero/:wooProductId/purchased', requireAdmin, stockZeroController.markProductPurchased);

module.exports = router;
