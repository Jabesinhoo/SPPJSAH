// routes/settingsPage.js
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/authMiddleware');

// Página de ajustes (no lee cookies directas ni hace fetch interno)
router.get('/settings', isAuthenticated, async (req, res, next) => {
  try {
    return res.render('settings', {
      title: 'Ajustes',
      username: req.session.username,
      userRole: req.session.userRole,
      userId: req.session.userId,
      user: {
        username: req.session.username,
        role: req.session.userRole,
        id: req.session.userId,
      }
    });
  } catch (err) {
    return next(err); // deja que el handler global lo maneje
  }
});

module.exports = router;
