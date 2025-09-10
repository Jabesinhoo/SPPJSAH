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
const rateLimit = require('express-rate-limit');

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
const notificationRoutes = require('./routes/notificationRoutes'); // <- singular, coincide con el archivo

const { authorize } = require('./middleware/authMiddleware');
const checkApproval = require('./middleware/checkApproval');

const allowedOrigins = [
  'http://localhost:3000',
  'https://tecnonacho.com',
  'https://sppjsah.tecnonacho.com',
  process.env.NGROK_URL,
  null
];

const app = express();

// ✅ MIDDLEWARE PARA FORZAR HTTPS EN PRODUCCIÓN
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';

    if (!isSecure) {
      const httpsUrl = `https://${req.headers.host}${req.originalUrl}`;
      return res.redirect(301, httpsUrl);
    }

    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// ✅ Rate Limiter Global
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: {
    error: 'Demasiadas solicitudes desde esta IP, intenta nuevamente en un minuto.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const skipPaths = ['/health', '/favicon.ico'];
    if (skipPaths.includes(req.path)) return true;

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

    const wantsJson = req.xhr || req.get('Accept')?.includes('application/json') || req.path.startsWith('/api');

    if (wantsJson) {
      return res.status(429).json({
        error: 'Demasiadas solicitudes. Intenta nuevamente en un minuto.'
      });
    }

    res.status(429).render('error', {
      title: 'Demasiadas solicitudes',
      errorCode: 429,
      errorMessage: 'Has excedido el límite de solicitudes. Intenta nuevamente en un minuto.'
    });
  }
});

app.use(globalLimiter);

// ✅ CONFIGURACIÓN COMPLETA DE HELMET
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
          "https://cdn.tailwindcss.com",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "'unsafe-inline'"
        ],
        "style-src-elem": [
          "'self'",
          "https://cdn.tailwindcss.com",
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

    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginEmbedderPolicy: { policy: "credentialless" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    frameguard: { action: 'deny' },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true
  })
);

app.disable('x-powered-by');
const PORT = process.env.PORT || 3000;
app.set('trust proxy', 1);

app.use('/api', cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('❌ No autorizado por CORS: ' + origin), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const sessionStore = process.env.SESSION_STORE === 'postgres'
  ? new pgSession({
    conObject: { connectionString: process.env.DATABASE_URL },
    tableName: 'session',
  })
  : undefined;

// ✅ Configuración de sesión
app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'secret_dev',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,       // en local NO https
      httpOnly: true,
      sameSite: 'lax',     // en vez de strict
      maxAge: 1000 * 60 * 60 * 2
    }
  })
);

// ✅ Middleware de verificación de aprobación
app.use((req, res, next) => {
  const publicPaths = ['/registro_inicio', '/api/login', '/api/register', '/health'];
  if (publicPaths.includes(req.path)) {
    return next();
  }
  checkApproval(req, res, next);
});

app.use(flash());

// ✅ CSRF configurado
const csrfProtection = csrf();

// ✅ Hacer el token CSRF disponible para todas las vistas
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';
  next();
});

// ✅ Aplicar validación CSRF solo a rutas no-API
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    // 🔧 Saltamos CSRF para TODO lo que sea API
    return next();
  }
  csrfProtection(req, res, next);
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

// Ruta de health check
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

// ✅ Ruta principal con verificación de aprobación
app.get('/', async (req, res) => {
  if (req.session.userId) {
    const user = await User.findByPk(req.session.userId, {
      include: [{ model: Role, as: 'roles' }]
    });

    if (user && user.isApproved) {
      return res.render('home', { title: 'Inicio', user });
    } else {
      req.session.destroy(() => {
        return res.redirect('/registro_inicio');
      });
    }
  }
  return res.redirect('/registro_inicio');
});

// ✅ Ruta para aprobación de usuarios
app.get('/user-approval', authorize('admin'), (req, res) => {
  res.render('user_approval', {
    title: 'Aprobación de Usuarios',
    username: req.session.username,
    userRole: req.session.userRole,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
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

// ✅ Ruta para la vista de suppliers (solo renderiza HTML)
app.get('/suppliers', async (req, res) => {
  if (!req.session.userId) return res.redirect('/registro_inicio');

  try {
    const { City } = require('country-state-city');
    const { Supplier } = require('./models');
    const { Op } = require('sequelize');

    const page = parseInt(req.query.page) || 1;
    const searchQuery = req.query.search || '';
    const categoryFilter = req.query.category || '';
    const cityFilter = req.query.city || '';

    const whereClause = {};
    if (searchQuery) {
      whereClause[Op.or] = [
        { marca: { [Op.like]: `%${searchQuery}%` } },
        { categoria: { [Op.like]: `%${searchQuery}%` } },
        { nombre: { [Op.like]: `%${searchQuery}%` } },
        { celular: { [Op.like]: `%${searchQuery}%` } },
        { ciudad: { [Op.like]: `%${searchQuery}%` } },
        { tipoAsesor: { [Op.like]: `%${searchQuery}%` } },
        { nombreEmpresa: { [Op.like]: `%${searchQuery}%` } }
      ];
    }

    if (categoryFilter) whereClause.categoria = categoryFilter;
    if (cityFilter) whereClause.ciudad = cityFilter;

    const totalItems = await Supplier.count({ where: whereClause });
    const totalPages = Math.ceil(totalItems / 10);
    const offset = (page - 1) * 10;

    const suppliers = await Supplier.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: 10,
      offset: offset
    });

    const colombiaCities = City.getCitiesOfCountry('CO');
    const allCategories = await Supplier.findAll({
      attributes: ['categoria'],
      group: ['categoria'],
      order: [['categoria', 'ASC']]
    });

    res.render('suppliers', {
      title: 'Asesores de Marca',
      suppliers,
      cities: colombiaCities,
      categories: allCategories.map(c => c.categoria),
      currentPage: page,
      totalPages: totalPages,
      searchQuery: searchQuery,
      categoryFilter: categoryFilter,
      cityFilter: cityFilter,
      success: req.flash('success')[0],
      error: req.flash('error')[0],
      username: req.session.username,
      userRole: req.session.userRole,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  } catch (error) {
    logger.error('Error en ruta /suppliers:', error);
    req.flash('error', 'Error al cargar la página de proveedores');
    res.redirect('/');
  }
});

app.get('/roles', authorize('admin'), (req, res) => {
  res.render('roles', {
    title: 'Gestión de Roles',
    username: req.session.username,
    userRole: req.session.userRole
  });
});




// ✅ MONTAR RUTAS API
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', productRoutes);
app.use('/api', roleRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/suppliers', supplierRoutes); // ← Nueva ruta API para suppliers
app.use('/api/notifications', notificationRoutes);

// ✅ Manejo de rutas no encontradas (404)
app.use((req, res) => {
  const wantsJson = req.xhr || req.get('Accept')?.includes('application/json') || req.path.startsWith('/api');

  if (wantsJson) {
    return res.status(404).json({ error: 'Ruta no encontrada' });
  }

  res.status(404).render('error', {
    title: 'Página No Encontrada',
    errorCode: 404,
    errorMessage: 'La página que buscas no existe.'
  });
});

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

// ✅ Error handler debe ser el último middleware
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
