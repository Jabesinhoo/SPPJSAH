
function wantsJson(req) {
  const accept = req.get('Accept') || '';
  return req.xhr || accept.includes('application/json') || req.query.ajax === '1';
}


function isAuthenticated(req, res, next) {
  const publicPaths = ['/login', '/register', '/api/login', '/api/register', '/registro_inicio'];
  if (publicPaths.includes(req.path)) {
    return next();
  }

  if (req.session && req.session.userId) {
    if (req.session.isApproved) {
      return next();
    } else {
      if (wantsJson(req)) {
        return res.status(403).json({ error: 'Usuario no aprobado' });
      }
      return res.redirect('/registro_inicio');
    }
  }

  if (wantsJson(req)) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  return res.redirect('/registro_inicio');
}
const requireAuth = isAuthenticated;

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
