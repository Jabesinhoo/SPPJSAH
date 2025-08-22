// middleware/authMiddleware.js

/**
 * Middleware para verificar si el usuario está autenticado.
 * Redirige al inicio de sesión si no hay un userId en la sesión.
 */
exports.isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/registro_inicio');
    }
};

/**
 * Middleware de autorización que verifica si el usuario tiene un rol específico.
 * Se usa como una función de fábrica (currying).
 * @param {string} roleRequired - El rol necesario para acceder a la ruta.
 */
exports.authorize = (roleRequired) => {
    return (req, res, next) => {
        if (req.session.userRole === roleRequired) {
            next();
        } else {
            res.status(403).send('Acceso denegado. No tienes los permisos necesarios.');
        }
    };
};