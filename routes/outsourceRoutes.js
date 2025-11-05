const express = require('express');
const router = express.Router();
const outsourceController = require('../controllers/outsourceController');
const { 
  validateOutsourceData, 
  checkDuplicateCC, 
  outsourceExists 
} = require('../middleware/outsourceMiddleware');
const { authorize } = require('../middleware/authMiddleware');

// Rutas de vistas
router.get('/outsource', (req, res) => {
  if (!req.session.userId) return res.redirect('/registro_inicio');
  
  res.render('outsource', {
    title: 'Gestión de Técnicos Outsource',
    username: req.session.username,
    userRole: req.session.userRole,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
});

// Rutas API
router.get('/api/outsources', outsourceController.getAllOutsources);
router.get('/api/outsources/services', outsourceController.getServiceTypes); // Nueva ruta para filtros
router.get('/api/outsources/search', outsourceController.searchOutsources);
router.get('/api/outsources/:id', outsourceExists, outsourceController.getOutsourceById);
router.post('/api/outsources', authorize('admin'), validateOutsourceData, checkDuplicateCC, outsourceController.createOutsource);
router.put('/api/outsources/:id', authorize('admin'), validateOutsourceData, checkDuplicateCC, outsourceExists, outsourceController.updateOutsource);
router.delete('/api/outsources/:id', authorize('admin'), outsourceExists, outsourceController.deleteOutsource);

module.exports = router;