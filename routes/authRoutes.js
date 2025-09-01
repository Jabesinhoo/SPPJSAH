// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', (req, res, next) => {
  console.log('📥 LLEGÓ a /api/register con body:', req.body);
  next();
}, authController.register);

router.post('/login', (req, res, next) => {
  console.log('📥 LLEGÓ a /api/login con body:', req.body);
  next();
}, authController.login);


module.exports = router;