const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { StockZeroEvent, Product } = require('../models');

const {
    getOutOfStockProductsByDay,
    getBogotaDateOnly
} = require('../services/wooOutOfStockByDayService');

function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}
function getBogotaDateTimeParts() {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
    });

    const parts = formatter.formatToParts(new Date()).reduce((acc, part) => {
        if (part.type !== 'literal') {
            acc[part.type] = part.value;
        }
        return acc;
    }, {});

    return {
        fecha: `${parts.year}-${parts.month}-${parts.day}`,
        hora: `${parts.hour}:${parts.minute}:${parts.second}`
    };
}
function parsePriceToInteger(value) {
    if (value === null || value === undefined || value === '') {
        return 0;
    }

    const cleanValue = String(value).replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleanValue);

    if (Number.isNaN(parsed) || parsed < 0) {
        return 0;
    }

    return Math.round(parsed);
}

function buildProductNote(product, username, date) {
    return JSON.stringify([
        {
            text: `Producto creado desde Agotados por día. Fecha del agotado: ${date}. Link: ${product.permalink || 'Sin link'}. Imagen: ${product.imageUrl || 'Sin imagen'}.`,
            user: username || 'Sistema',
            date: new Date().toISOString(),
            mentions: []
        }
    ]);
}

exports.renderStockZeroPage = (req, res) => {
    const yesterday = getBogotaDateOnly(addDays(new Date(), -1));

    res.render('stock-zero', {
        title: 'Agotados por día',
        username: req.session.username,
        userRole: req.session.userRole,
        userId: req.session.userId,
        defaultDate: yesterday,
        today: getBogotaDateOnly()
    });
};

exports.listStockZeroEvents = async (req, res) => {
    try {
        const date = req.query.date || getBogotaDateOnly(addDays(new Date(), -1));
        const search = String(req.query.search || '').trim().toLowerCase();

        let products = await getOutOfStockProductsByDay(date);

        if (search) {
            products = products.filter(product => {
                return (
                    String(product.sku || '').toLowerCase().includes(search) ||
                    String(product.name || '').toLowerCase().includes(search)
                );
            });
        }

        const productIds = products
            .map(product => Number(product.wooProductId))
            .filter(Boolean);

        let localStates = [];

        if (productIds.length > 0) {
            localStates = await StockZeroEvent.findAll({
                where: {
                    eventDate: date,
                    wooProductId: {
                        [Op.in]: productIds
                    }
                },
                raw: true
            });
        }

        const stateMap = new Map();

        localStates.forEach(item => {
            const key = Number(item.wooProductId || item.woo_product_id);
            stateMap.set(key, item);
        });

        products = products.map(product => {
            const state = stateMap.get(Number(product.wooProductId));

            return {
                ...product,
                isPurchased: Boolean(state?.isPurchased || state?.is_purchased),
                purchasedBy: state?.purchasedBy || state?.purchased_by || null,
                purchasedAt: state?.purchasedAt || state?.purchased_at || null,
                createdProductId: state?.createdProductId || state?.created_product_id || null
            };
        });

        res.json({
            success: true,
            date,
            count: products.length,
            data: products
        });
    } catch (error) {
        logger.error('Error consultando agotados por día:', error);

        res.status(500).json({
            success: false,
            error: error.message || 'Error consultando productos agotados'
        });
    }
};

exports.markProductPurchased = async (req, res) => {
    try {
        const wooProductId = parseInt(req.params.wooProductId, 10);

        const {
            date,
            sku,
            name,
            price,
            imageUrl,
            permalink,
            currentStock,
            stockStatus,
            dateModified
        } = req.body;

        if (!wooProductId) {
            return res.status(400).json({
                success: false,
                error: 'Falta wooProductId'
            });
        }

        if (!date) {
            return res.status(400).json({
                success: false,
                error: 'Falta la fecha del agotado'
            });
        }

        const cleanSku = String(sku || wooProductId).trim();
        const cleanName = String(name || 'Producto sin nombre').trim();
        const username = req.session.username || 'Sistema';

        const [event] = await StockZeroEvent.findOrCreate({
            where: {
                wooProductId,
                eventDate: date
            },
            defaults: {
                wooProductId,
                sku: cleanSku,
                name: cleanName,
                previousStock: null,
                currentStock: Number(currentStock ?? 0),
                stockStatus: stockStatus || 'outofstock',
                eventDate: date,
                status: 'pending',
                source: 'transition_to_zero',
                imageUrl: imageUrl || null,
                permalink: permalink || null,
                price: price !== undefined && price !== null ? String(price) : null,
                dateModified: dateModified ? new Date(dateModified) : null,
                isPurchased: false,
                purchasedBy: null,
                purchasedAt: null,
                createdProductId: null,
                notes: 'Producto detectado desde consulta de agotados por día.'
            }
        });

        if (event.isPurchased && event.createdProductId) {
            return res.json({
                success: true,
                message: 'Este producto ya estaba marcado como comprado.',
                data: event,
                productId: event.createdProductId
            });
        }
        const dateTimeParts = getBogotaDateTimeParts();

        const productData = {
            SKU: cleanSku,
            nombre: cleanName,
            cantidad: 1,
            importancia: 3,
            categoria: 'Realizado',
            precio_compra: parsePriceToInteger(price),
            proveedor: 'N/A',
            brand: 'N/A',
            listo: true,
            usuario: username,
            fecha: dateTimeParts.fecha,
            hora: dateTimeParts.hora,
            nota: buildProductNote(
                {
                    sku: cleanSku,
                    name: cleanName,
                    price,
                    imageUrl,
                    permalink,
                    currentStock,
                    stockStatus,
                    dateModified
                },
                username,
                date
            )
        };

        const createdProduct = await Product.create(productData);

        await event.update({
            sku: cleanSku,
            name: cleanName,
            currentStock: Number(currentStock ?? 0),
            stockStatus: stockStatus || 'outofstock',
            imageUrl: imageUrl || event.imageUrl,
            permalink: permalink || event.permalink,
            price: price !== undefined && price !== null ? String(price) : event.price,
            dateModified: dateModified ? new Date(dateModified) : event.dateModified,
            isPurchased: true,
            purchasedBy: username,
            purchasedAt: new Date(),
            createdProductId: createdProduct.id,
            status: 'product_created',
            reviewedBy: username,
            reviewedAt: new Date(),
            notes: 'Marcado como comprado y creado en productos.'
        });

        res.json({
            success: true,
            message: 'Producto marcado como comprado y creado en productos.',
            product: createdProduct,
            event
        });
    } catch (error) {
        logger.error('Error marcando producto como comprado:', error);

        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                success: false,
                error: 'Ya existe un producto con este SKU.'
            });
        }

        res.status(500).json({
            success: false,
            error: error.message || 'Error marcando producto como comprado'
        });
    }
};