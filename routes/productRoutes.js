// routes/productRoutes.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/authMiddleware');
const excelController = require('../controllers/excelController');
const { productValidation } = require('../middleware/productValidation');
const { validationResult } = require('express-validator');

// Middleware global: todas las rutas requieren autenticación
router.use(authMiddleware.requireAuth);

// Helper para ejecutar validaciones y devolver errores
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(v => v.run(req)));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(e => e.msg)
      });
    }
    next();
  };
};

// ==============================
//   RUTAS DE VISTA (EJS)
// ==============================
router.get('/stats', (req, res) => {
  res.render('stats', {
    title: 'Dashboard de Estadísticas',
    userRole: req.session.userRole,
    username: req.session.username
  });
});

// ==============================
//   RUTAS DE ESTADÍSTICAS
// ==============================
router.get('/products/stats/top-products', productController.getTopProducts);
router.get('/products/stats/top-users', productController.getTopUsers);
router.get('/products/stats/time-faltantes-realizado', productController.getTimeStats);
router.get('/products/stats/general', productController.getGeneralStats);
router.get('/products/stats/brands', productController.getBrandStats);

// ==============================
//   RUTAS DE PRODUCTOS (API JSON)
// ==============================
router.get('/products', productController.getAllProducts);
router.get('/products/:id', productController.getProductById);

// Crear producto
router.post('/products',
  validate(productValidation),
  productController.createProduct
);

// Actualizar producto
router.put('/products/:id',
  validate(productValidation),
  productController.updateProduct
);

// Eliminar producto
router.delete('/products/:id', productController.deleteProduct);

// ==============================
//   RUTAS DE USUARIOS
// ==============================
router.get('/users', productController.getAllUsers);

// ==============================
//   RUTAS DE EXCEL
// ==============================
router.get('/excel/search/:sku', excelController.searchSKU);
router.get('/excel/search', excelController.searchSKUs);
router.get('/excel/skus', excelController.getAllSKUs);

module.exports = router;
