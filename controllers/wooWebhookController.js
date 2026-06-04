// controllers/wooWebhookController.js
const crypto = require('crypto');
const logger = require('../utils/logger');
const {
  processWooProductStock,
  getBogotaDateOnly
} = require('../services/woocommerceStockService');

function verifyWooSignature(rawBody, signature, secret) {
  if (!secret) return true;
  if (!signature) return false;

  const digest = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('base64');

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch {
    return false;
  }
}

exports.handleProductUpdated = async (req, res) => {
  try {
    const rawBody = req.body;
    const signature = req.get('x-wc-webhook-signature');
    const secret = process.env.WC_WEBHOOK_SECRET;

    if (!verifyWooSignature(rawBody, signature, secret)) {
      return res.status(401).json({
        success: false,
        error: 'Firma de webhook no válida'
      });
    }

    const product = JSON.parse(rawBody.toString('utf8'));

    const eventDate = product.date_modified
      ? getBogotaDateOnly(new Date(product.date_modified))
      : getBogotaDateOnly();

    const result = await processWooProductStock(product, {
      eventDate,
      includeInitialZero: process.env.STOCK_ZERO_INCLUDE_INITIAL_ZERO_BY_DAY === 'true',
      sourceHint: 'transition_to_zero'
    });

    logger.info('✅ Webhook product.updated procesado', {
      productId: product.id,
      sku: product.sku,
      result
    });

    res.json({
      success: true,
      result
    });
  } catch (error) {
    logger.error('❌ Error procesando webhook WooCommerce:', error);
    res.status(500).json({
      success: false,
      error: 'Error procesando webhook'
    });
  }
};