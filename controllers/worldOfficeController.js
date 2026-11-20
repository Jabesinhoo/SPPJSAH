const catalog = require('../services/worldOfficeCatalog');
const logger = require('../utils/logger');

exports.searchSKUs = async (req, res) => {
    const sku = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    if (!sku || sku.length > 255) {
        return res.status(400).json({ error: 'Código de inventario inválido' });
    }

    try {
        const rows = await catalog.searchProductsBySKU(sku);
        const products = rows.map(({ sku, name }) => ({ sku, name: name.trim() }));
        return res.json({ success: true, products });
    } catch (error) {
        logger.error('Error al consultar los SKU de World Office', { code: error.code });
        return res.status(503).json({ error: 'No se pudo consultar World Office' });
    }
};
