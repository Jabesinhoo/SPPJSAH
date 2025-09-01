const checkSession = (req, res, next) => {
  if (!req.session) {
    return res.status(500).json({ error: 'Session store unavailable' });
  }
  next();
};

module.exports = { checkSession };