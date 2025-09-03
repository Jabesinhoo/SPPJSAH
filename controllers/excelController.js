// controllers/excelController.js
const excelService = require('../services/excelService');
const logger = require('../utils/logger');

exports.searchSKU = async (req, res) => {
    try {
        const { sku } = req.params;
        
        if (!sku) {
            return res.status(400).json({ error: 'SKU es requerido' });
        }

        logger.info('Buscando SKU en Excel:', sku);
        const product = excelService.findProductBySKU(sku);
        
        if (product) {
            logger.info('Producto encontrado:', {
                sku: product.CódigoInventario,
                name: product.Descripcion
            });
            
            res.status(200).json({
                success: true,
                product: {
                    sku: product.CódigoInventario,
                    name: product.Descripcion || 'Nombre no disponible'
                }
            });
        } else {
            logger.info('Producto NO encontrado para SKU:', sku);
            res.status(404).json({ 
                success: false, 
                message: 'Producto no encontrado en Excel' 
            });
        }
    } catch (error) {
        logger.error('Error al buscar SKU en Excel:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

exports.searchSKUs = async (req, res) => {
    try {
        const { search } = req.query;
        
        if (!search) {
            return res.status(400).json({ error: 'Término de búsqueda es requerido' });
        }

        const products = excelService.searchProductsBySKU(search);
        
        res.status(200).json({
            success: true,
            products: products.map(product => ({
                sku: product.CódigoInventario,
                name: product.Descripcion || 'Nombre no disponible'
            }))
        });
    } catch (error) {
        logger.error('Error al buscar SKUs en Excel:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

exports.getAllSKUs = async (req, res) => {
    try {
        const skus = excelService.getAllSKUs();
        res.status(200).json({ success: true, skus });
    } catch (error) {
        logger.error('Error al obtener SKUs:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};