require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const flash = require('connect-flash');
const helmet = require('helmet');
const pgSession = require('connect-pg-simple')(session);
const logger = require('./utils/logger');
const csrf = require('csurf');
const rateLimit = require('express-rate-limit');
const methodOverride = require('method-override');

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
const notificationRoutes = require('./routes/notificationRoutes');
const transportRoutes = require('./routes/transportRoutes');
const outsourceRoutes = require('./routes/outsourceRoutes');
const stockZeroRoutes = require('./routes/stockZeroRoutes');


const { authorize } = require('./middleware/authMiddleware');
const checkApproval = require('./middleware/checkApproval');

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:4001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:4001',
  'https://tecnonacho.com',
  'https://sppjsah.tecnonacho.com',
  process.env.NGROK_URL,
  null
];

const app = express();

// ✅ Middleware para forzar HTTPS en producción
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

// ✅ Rate limiter global
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 1000,
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

    const wantsJson =
      req.xhr ||
      req.get('Accept')?.includes('application/json') ||
      req.path.startsWith('/api');

    if (wantsJson) {
      return res.status(429).json({
        error: 'Demasiadas solicitudes. Intenta nuevamente en un minuto.'
      });
    }

    return res.status(429).render('error', {
      title: 'Demasiadas solicitudes',
      errorCode: 429,
      errorMessage: 'Has excedido el límite de solicitudes. Intenta nuevamente en un minuto.'
    });
  }
});

app.use(globalLimiter);

// ✅ Helmet / CSP
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
          "https://cdnjs.cloudflare.com",
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
        "connect-src": [
          "'self'",
          "https://cdn.jsdelivr.net"
        ]
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

// ✅ CORS para rutas API
app.use('/api', cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('❌ No autorizado por CORS: ' + origin), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));



app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(methodOverride('_method'));

// ✅ Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Session store
const sessionStore = process.env.SESSION_STORE === 'postgres'
  ? new pgSession({
      conObject: { connectionString: process.env.DATABASE_URL },
      tableName: 'session',
    })
  : undefined;

// ✅ Sesión
app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'secret_dev',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 2
    }
  })
);

// ✅ Middleware de aprobación
app.use((req, res, next) => {
  const publicPaths = ['/registro_inicio', '/api/login', '/api/register', '/health'];

  if (publicPaths.includes(req.path)) {
    return next();
  }

  return checkApproval(req, res, next);
});

app.use(flash());

// ✅ CSRF solo para rutas no API
const csrfProtection = csrf({
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  cookie: false
});

const ignoreCsrfForApi = (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return next();
  }

  return csrfProtection(req, res, next);
};

app.use(ignoreCsrfForApi);

// ✅ Token CSRF en vistas
app.use((req, res, next) => {
  if (!req.originalUrl.startsWith('/api')) {
    res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';
  }

  next();
});

// ✅ Variables globales para vistas
app.use((req, res, next) => {
  res.locals.userRole = req.session.userRole;
  res.locals.username = req.session.username;
  res.locals.userId = req.session.userId;

  const success = req.flash('success');
  const error = req.flash('error');
  const successMsg = req.flash('success_msg');
  const errorMsg = req.flash('error_msg');

  res.locals.success = success[0] || successMsg[0] || '';
  res.locals.error = error[0] || errorMsg[0] || '';
  res.locals.success_msg = res.locals.success;
  res.locals.error_msg = res.locals.error;

  next();
});

// ✅ EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public', 'views'));
app.use(expressLayouts);
app.set('layout', 'base');

// ✅ Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// ✅ Vista de spreadsheets
app.get('/spreadsheets', (req, res) => {
  if (!req.session.userId) return res.redirect('/registro_inicio');

  return res.render('spreadsheets', {
    title: 'Hojas de Cálculo',
    username: req.session.username,
    userRole: req.session.userRole,
    userId: req.session.userId
  });
});

// ✅ API spreadsheets
app.use('/api', spreadsheetRoutes);

// ✅ Página ajustes
app.use('/', settingsPageRoutes);

// ✅ Login / registro
app.get('/registro_inicio', (req, res) => {
  return res.render('registro_inicio', {
    title: 'Registro / Inicio de Sesión',
    layout: false,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
});

// ✅ Inicio
app.get('/', async (req, res, next) => {
  try {
    if (req.session.userId) {
      const user = await User.findByPk(req.session.userId, {
        include: [{ model: Role, as: 'roles' }]
      });

      if (user && user.isApproved) {
        return res.render('home', {
          title: 'Inicio',
          user,
          username: req.session.username,
          userRole: req.session.userRole,
          userId: req.session.userId
        });
      }

      return req.session.destroy(() => {
        return res.redirect('/registro_inicio');
      });
    }

    return res.redirect('/registro_inicio');
  } catch (error) {
    return next(error);
  }
});

// ✅ Vista aprobación de usuarios
app.get('/user-approval', authorize('admin'), (req, res) => {
  return res.render('user_approval', {
    title: 'Aprobación de Usuarios',
    username: req.session.username,
    userRole: req.session.userRole,
    userId: req.session.userId,
    csrfToken: req.csrfToken ? req.csrfToken() : ''
  });
});

// ✅ Vista productos
app.get('/products', (req, res) => {
  if (!req.session.userId) return res.redirect('/registro_inicio');

  return res.render('producto', {
    title: 'Productos',
    username: req.session.username,
    userRole: req.session.userRole,
    userId: req.session.userId
  });
});

// ✅ Vista estadísticas
app.get('/products/stats', (req, res) => {
  if (!req.session.userId) return res.redirect('/registro_inicio');

  return res.render('stats', {
    title: 'Estadísticas',
    username: req.session.username,
    userRole: req.session.userRole,
    userId: req.session.userId
  });
});

// ✅ Vista suppliers
app.get('/suppliers', async (req, res) => {
  if (!req.session.userId) return res.redirect('/registro_inicio');

  try {
    const { City } = require('country-state-city');
    const { Supplier } = require('./models');
    const { Op } = require('sequelize');

    const page = parseInt(req.query.page, 10) || 1;
    const searchQuery = req.query.search || '';
    const categoryFilter = req.query.category || '';
    const cityFilter = req.query.city || '';

    const whereClause = {};

    if (searchQuery) {
      whereClause[Op.or] = [
        { marca: { [Op.iLike]: `%${searchQuery}%` } },
        { categoria: { [Op.iLike]: `%${searchQuery}%` } },
        { nombre: { [Op.iLike]: `%${searchQuery}%` } },
        { celular: { [Op.iLike]: `%${searchQuery}%` } },
        { ciudad: { [Op.iLike]: `%${searchQuery}%` } },
        { nombreEmpresa: { [Op.iLike]: `%${searchQuery}%` } }
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
      offset
    });

    const colombiaCities = City.getCitiesOfCountry('CO');

    const allCategories = await Supplier.findAll({
      attributes: ['categoria'],
      group: ['categoria'],
      order: [['categoria', 'ASC']]
    });

    return res.render('suppliers', {
      title: 'Asesores de Marca',
      suppliers,
      cities: colombiaCities,
      categories: allCategories.map(c => c.categoria),
      currentPage: page,
      totalPages,
      searchQuery,
      categoryFilter,
      cityFilter,
      success: req.flash('success')[0],
      error: req.flash('error')[0],
      username: req.session.username,
      userRole: req.session.userRole,
      userId: req.session.userId,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  } catch (error) {
    logger.error('Error en ruta /suppliers:', error);
    req.flash('error', 'Error al cargar la página de proveedores');
    return res.redirect('/');
  }
});

// ✅ Vista roles
app.get('/roles', authorize('admin'), (req, res) => {
  return res.render('roles', {
    title: 'Gestión de Roles',
    username: req.session.username,
    userRole: req.session.userRole,
    userId: req.session.userId
  });
});

// ✅ Montar rutas API
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', productRoutes);
app.use('/api', roleRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/notifications', notificationRoutes);

// ✅ Rutas mixtas: vista + API propias
app.use('/', transportRoutes);
app.use('/', outsourceRoutes);
app.use('/', stockZeroRoutes);

// ✅ 404
app.use((req, res) => {
  const wantsJson =
    req.xhr ||
    req.get('Accept')?.includes('application/json') ||
    req.path.startsWith('/api');

  if (wantsJson) {
    return res.status(404).json({ error: 'Ruta no encontrada' });
  }

  return res.status(404).render('error', {
    title: 'Página No Encontrada',
    errorCode: 404,
    errorMessage: 'La página que buscas no existe.'
  });
});

// ✅ Seed roles
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

// ✅ Error handler al final
app.use(errorHandler);

const excelService = require('./services/excelService');

(async () => {
  try {
    await sequelize.sync({ force: false });

    excelService.loadExcelData();

    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      seedRoles();

    });
  } catch (err) {
    logger.error('❌ Error al sincronizar con la base de datos:', err);
    process.exit(1);
  }
})();

module.exports = app;