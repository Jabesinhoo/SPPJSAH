// services/stockZeroScheduler.js
const logger = require('../utils/logger');
const {
  syncStockZeroEventsByDate,
  getBogotaDateOnly
} = require('./woocommerceStockService');

let intervalId = null;
let running = false;

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

async function runSync() {
  if (running) {
    logger.info('⏳ Sincronización stock 0 ya está en ejecución. Se omite ciclo.');
    return;
  }

  running = true;

  try {
    const today = getBogotaDateOnly();
    const yesterday = getBogotaDateOnly(addDays(new Date(), -1));

    logger.info('🔄 Sync automática stock 0 iniciada', {
      today,
      yesterday
    });

    await syncStockZeroEventsByDate({
      eventDate: yesterday,
      includeInitialZero: process.env.STOCK_ZERO_INCLUDE_INITIAL_ZERO_BY_DAY === 'true'
    });

    await syncStockZeroEventsByDate({
      eventDate: today,
      includeInitialZero: process.env.STOCK_ZERO_INCLUDE_INITIAL_ZERO_BY_DAY === 'true'
    });

    logger.info('✅ Sync automática stock 0 terminada');
  } catch (error) {
    logger.error('❌ Error en sync automática stock 0:', error);
  } finally {
    running = false;
  }
}

function start() {
  if (process.env.STOCK_ZERO_AUTO_SYNC !== 'true') {
    logger.info('ℹ️ Sync automática stock 0 desactivada');
    return;
  }

  if (intervalId) return;

  const minutes = parseInt(process.env.STOCK_ZERO_SYNC_INTERVAL_MINUTES || '30', 10);
  const intervalMs = Math.max(minutes, 5) * 60 * 1000;

  logger.info(`🕒 Sync automática stock 0 activa cada ${minutes} minutos`);

  if (process.env.STOCK_ZERO_SYNC_ON_START === 'true') {
    setTimeout(runSync, 10000);
  }

  intervalId = setInterval(runSync, intervalMs);
}

function stop() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

module.exports = {
  start,
  stop,
  runSync
};