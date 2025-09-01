require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const flash = require('connect-flash');

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

const app = express();
const PORT = process.env.PORT || 3000;

/* ===========================
   CONFIGURACIÓN DE ALMACENAMIENTO DE SESIONES
   =========================== */
let sessionStore;

if (process.env.SESSION_STORE === 'redis') {
  // 🔹 Redis con connect-redis v7+
  const { createClient } = require('redis');
  const RedisStore = require('connect-redis').default;

  const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });

  redisClient.connect().catch(console.error);

  sessionStore = new RedisStore({
    client: redisClient,
    prefix: 'session:'
  });

  console.log('✅ Usando Redis para almacenamiento de sesiones');

} else if (process.env.SESSION_STORE === 'postgres') {
  // 🔹 PostgreSQL con connect-pg-simple
  const PostgreSQLStore = require('connect-pg-simple')(session);

  sessionStore = new PostgreSQLStore({
    conString: process.env.DATABASE_URL,
    tableName: 'user_sessions',
    createTableIfMissing: true
  });

  console.log('✅ Usando PostgreSQL para almacenamiento de sesiones');

} else {
  // 🔹 Solo para desarrollo
  console.log('⚠️ Usando MemoryStore para sesiones (NO usar en producción)');
  sessionStore = undefined;
}

/* ===========================
   MIDDLEWARES BÁSICOS
   =========================== */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

/* ===========================
   SESIÓN + FLASH
   =========================== */
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'tecnonacho_secret_key',
  resave: false,
  saveUninitialized: false,
  store: sessionStore, // Usa el store configurado
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true
  }
};

// En producción, asegurar que las cookies sean seguras
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
  sessionConfig.cookie.secure = true;
}

app.use(session(sessionConfig));
app.use(flash());

/* ===========================
   LOCALES PARA EJS
   =========================== */
app.use((req, res, next) => {
  res.locals.userRole = req.session.userRole;

  const success      = req.flash('success');
  const error        = req.flash('error');
  const success_msg  = req.flash('success_msg');
  const error_msg    = req.flash('error_msg');

  res.locals.success     = success[0]     || success_msg[0] || '';
  res.locals.error       = error[0]       || error_msg[0]   || '';
  res.locals.success_msg = res.locals.success;
  res.locals.error_msg   = res.locals.error;
  next();
});

/* ===========================
   LOCALES PARA EJS
   =========================== */
app.use((req, res, next) => {
  res.locals.userRole = req.session.userRole;

  const success      = req.flash('success');
  const error        = req.flash('error');
  const success_msg  = req.flash('success_msg');
  const error_msg    = req.flash('error_msg');

  res.locals.success     = success[0]     || success_msg[0] || '';
  res.locals.error       = error[0]       || error_msg[0]   || '';
  res.locals.success_msg = res.locals.success;
  res.locals.error_msg   = res.locals.error;
  next();
});

/* ===========================
   EJS + LAYOUTS
   =========================== */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public', 'views'));
app.use(expressLayouts);
app.set('layout', 'base');

app.get('/spreadsheets', (req, res) => {
  if (!req.session.userId) return res.redirect('/registro_inicio');
  res.render('spreadsheets', {
    title: 'Hojas de Cálculo',
    username: req.session.username,
    userRole: req.session.userRole
  });
});

// Después de las otras rutas de API
app.use('/api', spreadsheetRoutes);
/* ===========================
   PÁGINAS (EJS)
   =========================== */
app.use('/', settingsPageRoutes); // monta /settings tras session/flash

app.get('/registro_inicio', (req, res) => {
  res.render('registro_inicio', { title: 'Registro / Inicio de Sesión', layout: false });
});

app.get('/', async (req, res) => {
  if (req.session.userId) {
    const user = await User.findByPk(req.session.userId, {
      include: [{ model: Role, as: 'role' }]
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
    if (err) return res.status(500).send('No se pudo cerrar la sesión.');
    res.redirect('/registro_inicio');
  });
});

/* ===========================
   APIs (prefijo /api)
   =========================== */
app.use('/api', authRoutes);
app.use('/api', productRoutes);
app.use('/api', roleRoutes);
app.use('/api', userRoutes);
app.use('/api/settings', settingsRoutes); // si tienes endpoints de ajustes

/* ===========================
   SEED ROLES
   =========================== */
const seedRoles = async () => {
  try {
    const userRole = await Role.findOne({ where: { name: 'user' } });
    const adminRole = await Role.findOne({ where: { name: 'admin' } });

    if (!userRole) {
      await Role.create({ name: 'user' });
      console.log('✅ Rol "user" por defecto creado.');
    }
    if (!adminRole) {
      await Role.create({ name: 'admin' });
      console.log('✅ Rol "admin" por defecto creado.');
    }
  } catch (error) {
    console.error('❌ Error al sembrar los roles:', error);
  }
};

/* ===========================
   ERROR HANDLER GLOBAL
   =========================== */
/* ===========================
   ERROR HANDLER GLOBAL
   =========================== */
app.use((err, req, res, next) => {
  console.error('💥 [GLOBAL ERROR]');
  console.error('📍 Path: ', req.path);
  console.error('📦 Method: ', req.method);
  console.error('👤 UserID: ', req.session?.userId || 'no-session');
  console.error('📝 Error message: ', err.message);
  console.error('🧩 Stack: ', err.stack);

  const accept = req.get('Accept') || '';
  const wantsJson = req.xhr || accept.includes('application/json') || req.query.ajax === '1';

  if (wantsJson) {
    return res.status(500).json({ error: err.message || 'Error inesperado' });
  }

  if (typeof req.flash === 'function') {
    req.flash('error', err.message || 'Error inesperado');
  }

  const back = req.get('referer');
  return res.redirect(back || '/registro_inicio');
});


/* ===========================
   START
   =========================== */
app.listen(PORT, '0.0.0.0', async () => {
  try {
    await sequelize.sync({ force: false });
    console.log('✅ Tablas recreadas!');
    console.log('✅ Base de datos y modelos sincronizados!');
    await seedRoles();
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  } catch (err) {
    console.error('❌ Error al sincronizar con la base de datos:', err);
  }
});
