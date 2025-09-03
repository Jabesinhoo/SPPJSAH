require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const flash = require('connect-flash');
const helmet = require('helmet');
const pgSession = require('connect-pg-simple')(session);
const winston = require('winston');
const logger = require('./utils/logger');
const csrf = require('csurf');
const rateLimit = require('express-rate-limit'); // ✅ Nuevo: Rate limiter

const errorHandler = require('./middleware/errorHandler');

const { sequelize, User, Role } = require('./models');

// Rutas
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const roleRoutes = require('./routes/roleRoutes');
const userRoutes = require('./routes/userRoutes');
const supplierRoutes = require('./routes/suppliersRoutes');
const spreadsheetRoutes = require('./routes/spreadsheetRoutes');

const settingsRoutes = require('./routes/settingsRoutes');
const settingsPageRoutes = require('./routes/settingsPage');

const { authorize } = require('./middleware/authMiddleware');
const allowedOrigins = [
  'http://localhost:3000',
  'https://tecnonacho.com',
  'https://sppjsah.tecnonacho.com',
  process.env.NGROK_URL,
  null
];
const app = express();

// ✅ Rate Limiter Global: 100 requests por minuto por IP
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // Límite de 100 requests por IP por ventana de tiempo
  message: {
    error: 'Demasiadas solicitudes desde esta IP, intenta nuevamente en un minuto.'
  },
  standardHeaders: true, // Devuelve información del rate limit en headers `RateLimit-*`
  legacyHeaders: false, // Desactiva headers `X-RateLimit-*`
  skip: (req) => {
    // Opcional: Saltar rate limiting para ciertas IPs o rutas
    const skipPaths = ['/health', '/favicon.ico'];
    if (skipPaths.includes(req.path)) return true;
    
    // Saltar para IPs de confianza (opcional)
    const trustedIPs = ['127.0.0.1', '::1'];
    if (trustedIPs.includes(req.ip)) return true;
    
    return false;
  },
  handler: (req, res) => {
    logger.warn('⚠️ Rate limit excedido', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    
    // Responder con JSON para APIs, con render para vistas
    if (req.xhr || req.path.startsWith('/api')) {
      return res.status(429).json({
        error: 'Demasiadas solicitudes. Intenta nuevamente en un minuto.'
      });
    }
    
    // Para rutas de vistas, mostrar página de error
    res.status(429).render('error', {
      title: 'Demasiadas solicitudes',
      error: 'Has excedido el límite de solicitudes. Intenta nuevamente en un minuto.'
    });
  }
});

// ✅ Aplicar rate limiter globalmente
app.use(globalLimiter);

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "base-uri": ["'self'"],
        "object-src": ["'none'"],
        "script-src": [
          "'self'",
          "https://cdn.tailwindcss.com",
          "https://cdn.jsdelivr.net",
          "'unsafe-inline'"
        ],
        "script-src-attr": ["'unsafe-inline'"],
        "style-src": [
          "'self'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "'unsafe-inline'"
        ],
        "style-src-elem": [
          "'self'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "'unsafe-inline'"
        ],
        "font-src": [
          "'self'",
          "https://cdnjs.cloudflare.com",
          "data:"
        ],
        "img-src": ["'self'", "data:", "https:"],
        "connect-src": ["'self'", "https://cdn.jsdelivr.net"]
      },
    },
  })
);

app.disable('x-powered-by');

const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1); // Importante para rate limiting detrás de proxy

app.use('/api', cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('❌ No autorizado por CORS: ' + origin), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const sessionStore =
  process.env.SESSION_STORE === 'postgres'
    ? new pgSession({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      tableName: 'session',
    })
    : undefined;

// ✅ Middleware de sesión primero
app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'secret_dev',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 2,
    },
  })
);

app.use(flash());

// ✅ CSRF configurado para usar sesiones (sin cookie: true)
const csrfProtection = csrf();

// ✅ Aplicar CSRF solo a rutas que renderizan vistas
app.use((req, res, next) => {
  // Saltar CSRF para rutas API
  if (req.path.startsWith('/api/')) {
    return next();
  }
  csrfProtection(req, res, next);
});

app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';
  next();
});

app.use((req, res, next) => {
  res.locals.userRole = req.session.userRole;
  const success = req.flash('success');
  const error = req.flash('error');
  const success_msg = req.flash('success_msg');
  const error_msg = req.flash('error_msg');
  res.locals.success = success[0] || success_msg[0] || '';
  res.locals.error = error[0] || error_msg[0] || '';
  res.locals.success_msg = res.locals.success;
  res.locals.error_msg = res.locals.error;
  next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public', 'views'));
app.use(expressLayouts);
app.set('layout', 'base');

// Ruta de health check (sin rate limiting)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/spreadsheets', (req, res) => {
  if (!req.session.userId) return res.redirect('/registro_inicio');
  res.render('spreadsheets', {
    title: 'Hojas de Cálculo',
    username: req.session.username,
    userRole: req.session.userRole
  });
});

app.use('/api', spreadsheetRoutes);
app.use('/', settingsPageRoutes);

app.get('/registro_inicio', (req, res) => {
  res.render('registro_inicio', {
    title: 'Registro / Inicio de Sesión',
    layout: false,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
});

app.get('/', async (req, res) => {
  if (req.session.userId) {
    const user = await User.findByPk(req.session.userId, {
      include: [{ model: Role, as: 'roles' }]
    });
    if (user) return res.render('home', { title: 'Inicio', user });
  }
  return res.redirect('/registro_inicio');
});

app.get('/products', (req, res) => {
  if (!req.session.userId) return res.redirect('/registro_inicio');
  res.render('producto', {
    title: 'Productos',
    username: req.session.username,
    userRole: req.session.userRole
  });
});

app.get('/products/stats', (req, res) => {
  if (!req.session.userId) return res.redirect('/registro_inicio');
  res.render('stats', {
    title: 'Estadísticas',
    username: req.session.username,
    userRole: req.session.userRole
  });
});

app.use('/suppliers', supplierRoutes);

app.get('/roles', authorize('admin'), (req, res) => {
  res.render('roles', {
    title: 'Gestión de Roles',
    username: req.session.username,
    userRole: req.session.userRole
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      logger.error('Error al destruir la sesión:', err);
      return res.status(500).send('No se pudo cerrar la sesión.');
    }
    res.redirect('/registro_inicio');
  });
});

// ✅ Rutas API - no usan CSRF (ya que se saltó en el middleware)
app.use('/api', authRoutes);
app.use('/api', productRoutes);
app.use('/api', roleRoutes);
app.use('/api', userRoutes);
app.use('/api/settings', settingsRoutes);

const seedRoles = async () => {
  try {
    const userRole = await Role.findOne({ where: { name: 'user' } });
    const adminRole = await Role.findOne({ where: { name: 'admin' } });

    if (!userRole) {
      await Role.create({ name: 'user' });
      logger.info('✅ Rol "user" por defecto creado.');
    }
    if (!adminRole) {
      await Role.create({ name: 'admin' });
      logger.info('✅ Rol "admin" por defecto creado.');
    }
  } catch (error) {
    logger.error('❌ Error al sembrar los roles:', error);
  }
};

app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', async () => {
    try {
      await sequelize.sync({ force: false });
      logger.info(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      seedRoles();
    } catch (err) {
      logger.error('❌ Error al sincronizar con la base de datos:', err);
    }
  });
}

module.exports = app;