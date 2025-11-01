const express = require('express');
const router = express.Router();
const transportController = require('../controllers/transportController');
const { transportValidation } = require('../middleware/validationTransport');

// Rutas para la vista EJS (con CSRF)
router.get('/transport', transportController.renderTransportView);
router.post('/transport', transportValidation, transportController.createTransport);
router.post('/transport/:placa/update', transportValidation, transportController.updateTransport);
router.post('/transport/:placa/delete', transportController.deleteTransport);

// Rutas API JSON (sin CSRF)
router.get('/api/transport', transportController.getAllTransportAPI);
router.get('/api/transport/tipos', transportController.getTiposVehiculo);
router.post('/api/transport', transportValidation, transportController.createTransportAPI);
router.put('/api/transport/:placa', transportValidation, transportController.updateTransportAPI);
router.delete('/api/transport/:placa', transportController.deleteTransportAPI);

module.exports = router;