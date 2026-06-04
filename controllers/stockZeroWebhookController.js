const { StockZeroEvent, WooStockSnapshot } = require('../models');
const logger = require('../utils/logger');

function getBogotaDateOnly(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

exports.receiveStockZeroEvent = async (req, res) => {
  try {
    const receivedSecret = req.get('x-sppjsah-secret');
    const expectedSecret = process.env.WC_WEBHOOK_SECRET;

    if (expectedSecret && receivedSecret !== expectedSecret) {
      return res.status(401).json({
        success: false,
        error: 'Secreto inválido'
      });
    }

    const {
      wooProductId,
      sku,
      name,
      price,
      imageUrl,
      permalink,
      currentStock,
      stockStatus,
      dateModified,
      eventDate
    } = req.body;

    if (!wooProductId || !sku || !name) {
      return res.status(400).json({
        success: false,
        error: 'Faltan datos obligatorios: wooProductId, sku o name'
      });
    }

    const finalEventDate = eventDate || getBogotaDateOnly();

    const [event, created] = await StockZeroEvent.findOrCreate({
      where: {
        wooProductId,
        eventDate: finalEventDate
      },
      defaults: {
        wooProductId,
        sku,
        name,
        previousStock: null,
        currentStock: Number(currentStock ?? 0),
        stockStatus: stockStatus || 'outofstock',
        eventDate: finalEventDate,
        status: 'pending',
        source: 'transition_to_zero',
        imageUrl: imageUrl || null,
        permalink: permalink || null,
        price: price !== undefined && price !== null ? String(price) : null,
        dateModified: dateModified ? new Date(dateModified) : new Date(),
        notes: 'Detectado automáticamente desde WooCommerce al cambiar a agotado.'
      }
    });

    if (!created) {
      await event.update({
        sku,
        name,
        currentStock: Number(currentStock ?? 0),
        stockStatus: stockStatus || 'outofstock',
        imageUrl: imageUrl || event.imageUrl,
        permalink: permalink || event.permalink,
        price: price !== undefined && price !== null ? String(price) : event.price,
        dateModified: dateModified ? new Date(dateModified) : event.dateModified
      });
    }

    const snapshot = await WooStockSnapshot.findOne({
      where: { wooProductId }
    });

    if (snapshot) {
      await snapshot.update({
        sku,
        name,
        lastStock: Number(currentStock ?? 0),
        lastStockStatus: stockStatus || 'outofstock',
        lastCheckedAt: new Date()
      });
    } else {
      await WooStockSnapshot.create({
        wooProductId,
        sku,
        name,
        lastStock: Number(currentStock ?? 0),
        lastStockStatus: stockStatus || 'outofstock',
        lastCheckedAt: new Date()
      });
    }

    logger.info('✅ Producto agotado recibido desde WooCommerce', {
      wooProductId,
      sku,
      eventDate: finalEventDate,
      created
    });

    return res.json({
      success: true,
      created,
      eventId: event.id
    });
  } catch (error) {
    logger.error('❌ Error recibiendo stock zero desde WooCommerce:', error);

    return res.status(500).json({
      success: false,
      error: 'Error procesando producto agotado'
    });
  }
};