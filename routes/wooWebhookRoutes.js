// routes/wooWebhookRoutes.js
const express = require('express');
const router = express.Router();
const wooWebhookController = require('../controllers/wooWebhookController');

router.post(
  '/woocommerce/product-updated',
  express.raw({ type: 'application/json' }),
  wooWebhookController.handleProductUpdated
);

module.exports = router;