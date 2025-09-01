// routes/productRoutes.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/authMiddleware');
const excelController = require('../controllers/excelController');

// Todas las rutas requieren autenticación
router.use(authMiddleware.requireAuth);

// Rutas de productos

// 1. Ruta para la página (¡renderiza la vista EJS!)
router.get('/stats', authMiddleware.requireAuth, (req, res) => {
    res.render('stats', {
        title: 'Dashboard de Estadísticas',
        userRole: req.session.userRole,
        username: req.session.username
    });
});

router.get('/products/stats/top-products', productController.getTopProducts);
router.get('/products/stats/top-users', productController.getTopUsers);
router.get('/products/stats/time-faltantes-realizado', productController.getTimeStats);
router.get('/products/stats/general', productController.getGeneralStats);
router.get('/products/stats/brands', productController.getBrandStats);
// 2. Ruta para los datos de la API (¡responde con JSON!)

// Rutas dinámicas y generales
router.get('/products', productController.getAllProducts);
router.get('/products/:id', productController.getProductById);
router.post('/products', productController.createProduct);
router.put('/products/:id', productController.updateProduct);
router.delete('/products/:id', productController.deleteProduct);

// Ruta para obtener usuarios
router.get('/users', productController.getAllUsers);

// Rutas para búsqueda en Excel
router.get('/excel/search/:sku', excelController.searchSKU);
router.get('/excel/search', excelController.searchSKUs);
router.get('/excel/skus', excelController.getAllSKUs);

module.exports = router;