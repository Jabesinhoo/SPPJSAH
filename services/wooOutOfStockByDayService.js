// services/wooOutOfStockByDayService.js
const logger = require('../utils/logger');

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || '').replace(/\/+$/, '');
}

function getWooConfig() {
  const baseUrl = normalizeBaseUrl(process.env.WC_BASE_URL);
  const consumerKey = process.env.WC_CONSUMER_KEY;
  const consumerSecret = process.env.WC_CONSUMER_SECRET;
  const apiVersion = process.env.WC_API_VERSION || 'wc/v3';

  if (!baseUrl || !consumerKey || !consumerSecret) {
    throw new Error('Faltan WC_BASE_URL, WC_CONSUMER_KEY o WC_CONSUMER_SECRET en .env');
  }

  return { baseUrl, consumerKey, consumerSecret, apiVersion };
}

function buildAuthHeader(consumerKey, consumerSecret) {
  const token = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  return `Basic ${token}`;
}

function getBogotaDateOnly(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function getBogotaUtcRange(dateOnly) {
  // Colombia UTC-5
  const start = new Date(`${dateOnly}T05:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString()
  };
}

function getProductModifiedBogotaDay(product) {
  const rawDate =
    product.date_modified_gmt
      ? `${product.date_modified_gmt}Z`
      : product.date_modified;

  if (!rawDate) return null;

  const date = new Date(rawDate);

  if (Number.isNaN(date.getTime())) return null;

  return getBogotaDateOnly(date);
}

function getImageUrl(product) {
  if (Array.isArray(product.images) && product.images.length > 0) {
    return product.images[0]?.src || null;
  }

  return null;
}

function normalizeProduct(product) {
  return {
    wooProductId: product.id,
    name: product.name || 'Producto sin nombre',
    sku: product.sku || String(product.id),
    price: product.price || product.regular_price || product.sale_price || null,
    imageUrl: getImageUrl(product),
    permalink: product.permalink || null,
    currentStock: product.stock_quantity ?? 0,
    stockStatus: product.stock_status || 'outofstock',
    dateModified: product.date_modified || product.date_modified_gmt || null
  };
}

async function getOutOfStockProductsByDay(dateOnly) {
  const { baseUrl, consumerKey, consumerSecret, apiVersion } = getWooConfig();
  const { startIso, endIso } = getBogotaUtcRange(dateOnly);

  const products = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const url = new URL(`${baseUrl}/wp-json/${apiVersion}/products`);

    url.searchParams.set('per_page', String(perPage));
    url.searchParams.set('page', String(page));
    url.searchParams.set('status', 'publish');
    url.searchParams.set('stock_status', 'outofstock');

    // Esto reduce bastante la consulta.
    url.searchParams.set('modified_after', startIso);
    url.searchParams.set('modified_before', endIso);

    // Esto reduce el peso de respuesta.
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
      'date_modified',
      'date_modified_gmt'
    ].join(','));

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

    const batch = await response.json();

    if (!Array.isArray(batch) || batch.length === 0) break;

    // Filtro final por seguridad: solo productos modificados ese día en Colombia.
    const filtered = batch.filter(product => {
      const modifiedDay = getProductModifiedBogotaDay(product);
      return modifiedDay === dateOnly && product.stock_status === 'outofstock';
    });

    products.push(...filtered.map(normalizeProduct));

    if (batch.length < perPage) break;

    page += 1;
  }

  logger.info('✅ Agotados consultados por fecha', {
    dateOnly,
    total: products.length
  });

  return products;
}

module.exports = {
  getOutOfStockProductsByDay,
  getBogotaDateOnly
};