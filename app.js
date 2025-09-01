require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const flash = require('connect-flash');
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
  'http://localhost:3000',            // 🔹 solo en desarrollo local
  'https://tecnonacho.com',           // 🔹 dominio principal
  'https://sppjsah.tecnonacho.com'        // 🔹 tu subdominio de producción
];
const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors({
  origin: function (origin, callback) {
    // Permite peticiones sin origin (ej: curl, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('❌ No autorizado por CORS: ' + origin), false);
    }
  },
  credentials: true, // Necesario para sesiones/cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));


app.use(session({
  secret: process.env.SESSION_SECRET || 'tecnonacho_secret_key',
  resave: false,
  saveUninitialized: false,
}));
app.use(flash());


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

app.use('/api', spreadsheetRoutes);

app.use('/', settingsPageRoutes); 

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


app.use(errorHandler);



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
