// middleware/authMiddleware.js

/**
 * Detecta si la petición espera JSON (AJAX / fetch)
 */
function wantsJson(req) {
  const accept = req.get('Accept') || '';
  return req.xhr || accept.includes('application/json') || req.query.ajax === '1';
}

/**
 * Middleware para verificar si el usuario está autenticado.
 * Permite acceso libre a login y register.
 */
function isAuthenticated(req, res, next) {
  // 🔑 Excepciones (formularios y API)
  const publicPaths = ['/login', '/register', '/api/login', '/api/register'];
  if (publicPaths.includes(req.path)) {
    return next();
  }

  // ✅ Usuario autenticado
  if (req.session && req.session.userId) {
    return next();
  }

  // ❌ Usuario NO autenticado
  if (wantsJson(req)) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  return res.redirect('/registro_inicio');
}

// Alias para compatibilidad
const requireAuth = isAuthenticated;

/**
 * Middleware para autorizar por rol
 * Ejemplo: authorize('admin') o authorize(['admin','superadmin'])
 */
function authorize(requiredRole = 'user') {
  return (req, res, next) => {
    const role = req.session?.userRole || 'user';
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

    if (!roles.includes(role)) {
      if (wantsJson(req)) {
        return res.status(403).json({ error: 'Prohibido' });
      }
      return res.status(403).render('403', { title: 'Prohibido' });
    }

    next();
  };
}

module.exports = { isAuthenticated, requireAuth, authorize };
