// app.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');

// Importa los modelos y la instancia de Sequelize
const { sequelize, User, Role } = require('./models');

// Importa las rutas
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const roleRoutes = require('./routes/roleRoutes');
const userRoutes = require('./routes/userRoutes');

// Importa el middleware de autorización
const authMiddleware = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

// === MIDDLEWARES ===
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de las sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'tecnonacho_secret_key',
    resave: false,
    saveUninitialized: false,
}));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// === CONFIGURACIÓN DE EJS ===
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public', 'views'));
app.use(expressLayouts);
app.set('layout', 'base');

app.use((req, res, next) => {
    res.locals.userRole = req.session.userRole;
    next();
});

// === RUTAS DE VISTAS (PÁGINAS RENDERIZADAS) ===
app.get('/registro_inicio', (req, res) => {
    res.render('registro_inicio', { title: 'Registro / Inicio de Sesión', layout: false });
});

app.get('/', async (req, res) => {
    if (req.session.userId) {
        const user = await User.findByPk(req.session.userId, {
            include: [{ model: Role, as: 'role' }]
        });
        if (user) {
            return res.render('home', { title: 'Inicio', user: user });
        }
    }
    return res.redirect('/registro_inicio');
});

app.get('/products', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/registro_inicio');
    }
    res.render('producto', { 
        title: 'Productos', 
        username: req.session.username,
        userRole: req.session.userRole
    });
});

app.get('/roles', authMiddleware.authorize('admin'), (req, res) => {
    res.render('roles', { 
        title: 'Gestión de Roles', 
        username: req.session.username,
        userRole: req.session.userRole
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('No se pudo cerrar la sesión.');
        }
        res.redirect('/registro_inicio');
    });
});

// === RUTAS API ===
app.use('/api', authRoutes);
app.use('/api', productRoutes);
app.use('/api', roleRoutes);
app.use('/api', userRoutes);

// Función para sembrar los roles
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

// Iniciar el servidor y sincronizar la base de datos
app.listen(PORT, '0.0.0.0', async () => {
    try {
        // ✅ Usa { force: true } para recrear la tabla
        await sequelize.sync({ force: false });
        console.log('✅ Base de datos y modelos sincronizados!');

        await seedRoles();

        console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    } catch (err) {
        console.error('❌ Error al sincronizar con la base de datos:', err);
    }
});