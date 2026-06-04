// services/woocommerceStockService.js
const { StockZeroEvent, WooStockSnapshot } = require('../models');
const logger = require('../utils/logger');

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || '').replace(/\/+$/, '');
}

function getBogotaDateOnly(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getDateRangeForBogotaDay(dateOnly) {
  // Para Colombia UTC-5 fijo.
  const startUtc = new Date(`${dateOnly}T05:00:00.000Z`);
  const endUtc = addDays(startUtc, 1);

  return {
    startUtc,
    endUtc,
    startIso: startUtc.toISOString(),
    endIso: endUtc.toISOString()
  };
}

function getWooConfig() {
  const baseUrl = normalizeBaseUrl(process.env.WC_BASE_URL);
  const consumerKey = process.env.WC_CONSUMER_KEY;
  const consumerSecret = process.env.WC_CONSUMER_SECRET;
  const apiVersion = process.env.WC_API_VERSION || 'wc/v3';

  if (!baseUrl || !consumerKey || !consumerSecret) {
    throw new Error('Faltan variables WC_BASE_URL, WC_CONSUMER_KEY o WC_CONSUMER_SECRET en .env');
  }

  return { baseUrl, consumerKey, consumerSecret, apiVersion };
}

function buildAuthHeader(consumerKey, consumerSecret) {
  const token = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  return `Basic ${token}`;
}

function parseStock(product) {
  if (product.stock_status === 'outofstock') return 0;

  if (product.stock_quantity !== null && product.stock_quantity !== undefined) {
    const stock = parseInt(product.stock_quantity, 10);
    return Number.isNaN(stock) ? null : stock;
  }

  return null;
}

function normalizeProduct(product) {
  const firstImage = Array.isArray(product.images) && product.images.length > 0
    ? product.images[0]?.src
    : null;

  return {
    wooProductId: product.id,
    sku: product.sku || String(product.id),
    name: product.name || 'Producto sin nombre',
    currentStock: parseStock(product),
    stockStatus: product.stock_status || null,
    price: product.price || product.regular_price || product.sale_price || null,
    imageUrl: firstImage,
    permalink: product.permalink || null,
    dateModified: product.date_modified ? new Date(product.date_modified) : null
  };
}

async function fetchOutOfStockProductsByDate(dateOnly) {
  const { baseUrl, consumerKey, consumerSecret, apiVersion } = getWooConfig();
  const { startIso, endIso } = getDateRangeForBogotaDay(dateOnly);

  const allProducts = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const url = new URL(`${baseUrl}/wp-json/${apiVersion}/products`);

    url.searchParams.set('per_page', String(perPage));
    url.searchParams.set('page', String(page));
    url.searchParams.set('status', 'publish');

    // Lo importante: no pedir todo, solo agotados.
    url.searchParams.set('stock_status', 'outofstock');

    // Reducir payload.
    url.searchParams.set('_fields', [
      'id',
      'name',
      'sku',
      'price',
      'regular_price',
      'sale_price',
      'stock_quantity',
      'stock_status',
      'permalink',
      'images',
      'date_modified'
    ].join(','));

    // En WooCommerce moderno estos filtros suelen funcionar sobre fecha modificada.
    // Si tu instalación los ignora, al menos stock_status=outofstock reduce mucho la carga.
    url.searchParams.set('modified_after', startIso);
    url.searchParams.set('modified_before', endIso);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: buildAuthHeader(consumerKey, consumerSecret),
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`WooCommerce respondió ${response.status}: ${body}`);
    }

    const products = await response.json();

    if (!Array.isArray(products) || products.length === 0) {
      break;
    }

    allProducts.push(...products.map(normalizeProduct));

    if (products.length < perPage) {
      break;
    }

    page += 1;
  }

  return allProducts;
}

async function processWooProductStock(productInput, options = {}) {
  const {
    eventDate = getBogotaDateOnly(),
    includeInitialZero = false,
    sourceHint = 'transition_to_zero'
  } = options;

  const product = normalizeProduct(productInput);

  if (!product.wooProductId || !product.sku) {
    return {
      created: false,
      skipped: true,
      reason: 'Producto sin ID o SKU'
    };
  }

  const snapshot = await WooStockSnapshot.findOne({
    where: { wooProductId: product.wooProductId }
  });

  const isNowZero =
    product.currentStock === 0 ||
    product.stockStatus === 'outofstock';

  const hadPreviousStock =
    snapshot &&
    snapshot.lastStock !== null &&
    snapshot.lastStock !== undefined;

  const wasAboveZero =
    hadPreviousStock &&
    Number(snapshot.lastStock) > 0;

  let createdEvent = false;

  if (isNowZero && (wasAboveZero || (!snapshot && includeInitialZero))) {
    const [event, wasCreated] = await StockZeroEvent.findOrCreate({
      where: {
        wooProductId: product.wooProductId,
        eventDate
      },
      defaults: {
        sku: product.sku,
        name: product.name,
        previousStock: snapshot ? snapshot.lastStock : null,
        currentStock: product.currentStock || 0,
        stockStatus: product.stockStatus,
        eventDate,
        status: 'pending',
        source: snapshot ? sourceHint : 'initial_zero',
        imageUrl: product.imageUrl,
        permalink: product.permalink,
        price: product.price,
        dateModified: product.dateModified,
        notes: snapshot
          ? `Detectado automáticamente. Stock anterior: ${snapshot.lastStock}.`
          : 'Detectado como agotado en sincronización por fecha.'
      }
    });

    if (!wasCreated) {
      await event.update({
        sku: product.sku,
        name: product.name,
        currentStock: product.currentStock || 0,
        stockStatus: product.stockStatus,
        imageUrl: product.imageUrl,
        permalink: product.permalink,
        price: product.price,
        dateModified: product.dateModified
      });
    }

    createdEvent = wasCreated;
  }

  if (snapshot) {
    await snapshot.update({
      sku: product.sku,
      name: product.name,
      lastStock: product.currentStock,
      lastStockStatus: product.stockStatus,
      lastCheckedAt: new Date()
    });
  } else {
    await WooStockSnapshot.create({
      wooProductId: product.wooProductId,
      sku: product.sku,
      name: product.name,
      lastStock: product.currentStock,
      lastStockStatus: product.stockStatus,
      lastCheckedAt: new Date()
    });
  }

  return {
    created: createdEvent,
    skipped: false,
    isNowZero,
    wasAboveZero
  };
}

async function syncStockZeroEventsByDate(options = {}) {
  const {
    eventDate = getBogotaDateOnly(),
    includeInitialZero = process.env.STOCK_ZERO_INCLUDE_INITIAL_ZERO_BY_DAY === 'true'
  } = options;

  const products = await fetchOutOfStockProductsByDate(eventDate);

  let checked = 0;
  let created = 0;
  let skipped = 0;

  for (const product of products) {
    checked += 1;

    const result = await processWooProductStock(product, {
      eventDate,
      includeInitialZero,
      sourceHint: 'transition_to_zero'
    });

    if (result.created) created += 1;
    if (result.skipped) skipped += 1;
  }

  logger.info('✅ Sincronización rápida por fecha finalizada', {
    eventDate,
    checked,
    created,
    skipped
  });

  return {
    success: true,
    eventDate,
    checked,
    created,
    skipped
  };
}

module.exports = {
  getBogotaDateOnly,
  syncStockZeroEventsByDate,
  processWooProductStock,
  fetchOutOfStockProductsByDate
};