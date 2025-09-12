// controllers/productController.js

const { Product, User } = require('../models');
const { Op } = require('sequelize');

// Función para obtener todos los usuarios (para la funcionalidad de etiquetado)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['username']
        });
        res.status(200).json(users.map(user => user.username));
    } catch (err) {
        logger.error('Error al obtener usuarios:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};


exports.getAllProducts = async (req, res) => {
    try {
        const { category, sort, order, search, ready } = req.query;
        const userRole = req.session.userRole;

        let where = {};

        // Filtro de búsqueda
        if (search) {
            where[Op.or] = [
                { SKU: { [Op.iLike]: `%${search}%` } },
                { nombre: { [Op.iLike]: `%${search}%` } },
                { proveedor: { [Op.iLike]: `%${search}%` } }
            ];
        }

        // Filtro de categoría
        if (category) {
            where.categoria = category;
        }

        // Filtro de listo/no listo
        if (ready === 'listo') {
            where.categoria = { [Op.ne]: 'Faltantes' };
        } else if (ready === 'no-listo') {
            where.categoria = 'Faltantes';
        }

        let orderClause = [];
        if (sort === 'name') {
            orderClause.push(['nombre', order === 'desc' ? 'DESC' : 'ASC']);
        } else if (sort === 'date') {
            orderClause.push(['createdAt', order === 'desc' ? 'DESC' : 'ASC']);
        } else {
            orderClause.push(['createdAt', 'DESC']);
        }

        const products = await Product.findAll({
            where,
            order: orderClause
        });

        res.status(200).json(products);
    } catch (err) {
        logger.error('Error al obtener productos:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// Función auxiliar para ordenamiento
const getOrderClause = (sort, order) => {
    let orderClause = [];
    if (sort === 'name') {
        orderClause.push(['nombre', order === 'desc' ? 'DESC' : 'ASC']);
    } else if (sort === 'date') {
        orderClause.push(['createdAt', order === 'desc' ? 'DESC' : 'ASC']);
    } else if (sort === 'importance') {
        orderClause.push(['importancia', order === 'desc' ? 'DESC' : 'ASC']);
    } else {
        orderClause.push(['createdAt', 'DESC']);
    }
    return orderClause;
};


// controllers/productController.js - Actualizar getProductById
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }

        // TODOS pueden ver productos "Realizado", solo restringimos edición
        res.status(200).json(product);
    } catch (err) {
        logger.error('Error al obtener el producto por ID:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};


exports.createProduct = async (req, res) => {
    try {
        const { SKU, name, importance, category, notes, quantity } = req.body;
        const userRole = req.session.userRole;
        const username = req.session.username;

        // Validaciones básicas
        if (!SKU || !name) {
            return res.status(400).json({ error: 'SKU y nombre son campos obligatorios.' });
        }

        // Verificar si ya existe un SKU igual en estado activo (no Realizado)
        const existingActive = await Product.findOne({
            where: {
                SKU,
                categoria: { [Op.notIn]: ['Realizado', 'Bajo Pedido', 'Agotados con el Proveedor', 'Demasiadas Existencias'] }
            }
        });


        if (existingActive) {
            return res.status(409).json({ error: 'Ya existe un producto con este SKU en estado activo. Marca el anterior como Realizado antes de crear otro.' });
        }




        // Validar importancia (1-5 estrellas)
        const validImportance = parseInt(importance);
        if (!validImportance || validImportance < 1 || validImportance > 5) {
            return res.status(400).json({ error: 'La importancia debe ser un número entre 1 y 5.' });
        }

        // Validar y parsear cantidad
        const parsedQuantity = parseInt(quantity) || 0;
        if (parsedQuantity < 0) {
            return res.status(400).json({ error: 'La cantidad no puede ser negativa.' });
        }

        // Definir valores por defecto
        // controllers/productController.js - En createProduct
        let productData = {
            SKU: SKU.trim(),
            nombre: name.trim(),
            cantidad: parsedQuantity,
            importancia: validImportance,
            categoria: 'Faltantes',
            precio_compra: 0,
            proveedor: 'N/A',
            marca: 'N/A', // Valor por defecto
            listo: false,
            usuario: username,
            nota: notes || null
        };

        // Solo admin puede establecer marca
        if (req.body.brand !== undefined) {
            productData.marca = req.body.brand.trim() || 'N/A';
        }

        // Definir categorías permitidas según rol
        let allowedCategories = ['Faltantes', 'Bajo Pedido', 'Agotados con el Proveedor', 'Demasiadas Existencias'];
        if (userRole === 'admin') {
            allowedCategories = ['Faltantes', 'Bajo Pedido', 'Agotados con el Proveedor', 'Demasiadas Existencias', 'Realizado'];

            // Solo admin puede establecer precio de compra y proveedor
            if (req.body.purchasePrice !== undefined) {
                const parsedPurchasePrice = parseFloat(req.body.purchasePrice) || 0;
                if (parsedPurchasePrice < 0) {
                    return res.status(400).json({ error: 'El precio de compra no puede ser negativo.' });
                }
                productData.precio_compra = parsedPurchasePrice;
            }

            if (req.body.supplier !== undefined) {
                productData.proveedor = req.body.supplier || 'N/A';
            }

            if (req.body.ready !== undefined) {
                productData.listo = req.body.ready === true || req.body.ready === 'true';
            }
        }

        // Validar categoría
        if (category && allowedCategories.includes(category)) {
            productData.categoria = category;
        } else if (category) {
            return res.status(400).json({ error: 'Categoría no válida para tu rol.' });
        }

        // Procesar notas si existen
        if (notes) {
            try {
                if (typeof notes === 'string') {
                    JSON.parse(notes);
                    productData.nota = notes;
                } else {
                    productData.nota = JSON.stringify(notes);
                }
            } catch (e) {
                const noteObject = [{
                    text: notes.toString(),
                    user: username,
                    date: new Date().toISOString(),
                    mentions: []
                }];
                productData.nota = JSON.stringify(noteObject);
            }
        }

        const newProduct = await Product.create(productData);

        res.status(201).json({
            message: 'Producto creado con éxito.',
            product: newProduct
        });
    } catch (err) {
        logger.error('Error al crear el producto:', err);

        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ error: 'Ya existe un producto con este SKU.' });
        }

        if (err.name === 'SequelizeValidationError') {
            const validationErrors = err.errors.map(error => error.message);
            return res.status(400).json({ error: 'Errores de validación: ' + validationErrors.join(', ') });
        }

        res.status(500).json({ error: 'Error interno del servidor.', details: err.message });
    }
};


exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { SKU, name, quantity, category, importance, purchasePrice, supplier, notes, ready } = req.body;
        const userRole = req.session.userRole;
        const username = req.session.username;

        // Buscar el producto
        const productToUpdate = await Product.findByPk(id);
        if (!productToUpdate) {
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }

        // Inicializar dataToUpdate al principio
        let dataToUpdate = {};

        // Campos que todos pueden editar
        if (SKU !== undefined) dataToUpdate.SKU = SKU.trim();
        if (name !== undefined) dataToUpdate.nombre = name.trim();

        // Validar y parsear cantidad
        if (quantity !== undefined) {
            const parsedQuantity = parseInt(quantity) || 0;
            if (parsedQuantity < 0) {
                return res.status(400).json({ error: 'La cantidad no puede ser negativa.' });
            }
            dataToUpdate.cantidad = parsedQuantity;
        }

        if (importance !== undefined) dataToUpdate.importancia = parseInt(importance);

        // Validar y parsear precio de compra para admin
        if (userRole === 'admin' && purchasePrice !== undefined) {
            const parsedPurchasePrice = parseFloat(purchasePrice) || 0;
            if (parsedPurchasePrice < 0) {
                return res.status(400).json({ error: 'El precio de compra no puede ser negativo.' });
            }
            dataToUpdate.precio_compra = parsedPurchasePrice;
        }

        if (notes !== undefined) {
            // Procesar notas
            try {
                if (typeof notes === 'string') {
                    JSON.parse(notes);
                    dataToUpdate.nota = notes;
                } else {
                    dataToUpdate.nota = JSON.stringify(notes);
                }
            } catch (e) {
                dataToUpdate.nota = notes.toString();
            }
        }

        // Lógica corregida para "Listo" y categorías
        if (userRole === 'admin') {
            if (ready !== undefined) {
                dataToUpdate.listo = ready === true || ready === 'true';

                // NUEVA LÓGICA: Si se marca como listo y no es "Realizado", mantener la categoría actual
                // Solo cambiar a "Realizado" si explícitamente se selecciona esa categoría
                if (dataToUpdate.listo && category !== 'Realizado') {
                    if (category !== undefined) {
                        dataToUpdate.categoria = category;
                    }
                }
            }

            if (category !== undefined) {
                const validCategories = ['Faltantes', 'Bajo Pedido', 'Agotados con el Proveedor', 'Demasiadas Existencias', 'Realizado'];
                if (validCategories.includes(category)) {
                    dataToUpdate.categoria = category;

                    if (category === 'Realizado') {
                        dataToUpdate.listo = true;
                    } else if (category === 'Faltantes') {
                        dataToUpdate.listo = false;
                    }
                } else {
                    return res.status(400).json({ error: 'Categoría no válida.' });
                }
            }

            if (supplier !== undefined) {
                dataToUpdate.proveedor = supplier || 'N/A';
            }
        } else {
            // Los usuarios normales pueden cambiar entre estas categorías
            if (category !== undefined) {
                const userCategories = ['Faltantes', 'Bajo Pedido', 'Agotados con el Proveedor', 'Demasiadas Existencias'];
                if (userCategories.includes(category)) {
                    dataToUpdate.categoria = category;

                    if (category === 'Faltantes') {
                        dataToUpdate.listo = false;
                    }
                } else {
                    return res.status(400).json({ error: 'Categoría no válida para tu rol.' });
                }
            }
        }

        // Actualizar timestamp
        dataToUpdate.updatedAt = new Date();

        const [updated] = await Product.update(dataToUpdate, {
            where: { id: id }
        });

        if (updated) {
            const updatedProduct = await Product.findByPk(id);
            return res.status(200).json({
                message: 'Producto actualizado con éxito.',
                product: updatedProduct
            });
        }

        res.status(404).json({ error: 'Producto no encontrado.' });
    } catch (err) {
        logger.error('Error al actualizar el producto:', err);
        res.status(500).json({ error: 'Error interno del servidor.', details: err.message });
    }
};
// Función para eliminar un producto
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const userRole = req.session.userRole;

        // Buscar el producto antes de eliminarlo
        const productToDelete = await Product.findByPk(id);
        if (!productToDelete) {
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }

        // Solo los admins pueden eliminar productos
        if (userRole !== 'admin') {
            return res.status(403).json({ error: 'No tienes permisos para eliminar productos. Solo los administradores pueden realizar esta acción.' });
        }

        const deleted = await Product.destroy({
            where: { id: id }
        });

        if (deleted) {
            return res.status(200).json({
                message: `Producto "${productToDelete.nombre}" eliminado con éxito.`
            });
        }

        res.status(404).json({ error: 'Producto no encontrado.' });
    } catch (err) {
        logger.error('Error al eliminar el producto:', err);
        res.status(500).json({ error: 'Error interno del servidor.', details: err.message });
    }
};

// ---

// Función para obtener estadísticas de productos (solo admin)
exports.getProductStats = async (req, res) => {
    try {
        const userRole = req.session.userRole;

        if (userRole !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Solo administradores pueden ver estadísticas.' });
        }

        const stats = await Product.findAll({
            attributes: [
                'categoria',
                [Product.sequelize.fn('COUNT', Product.sequelize.col('id')), 'count'],
                [Product.sequelize.fn('AVG', Product.sequelize.col('importancia')), 'avgImportance'],
                [Product.sequelize.fn('SUM', Product.sequelize.col('cantidad')), 'totalQuantity']
            ],
            group: ['categoria']
        });

        const totalProducts = await Product.count();

        res.status(200).json({
            totalProducts,
            byCategory: stats
        });
    } catch (err) {
        logger.error('Error al obtener estadísticas:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};
// Top 10 productos más agregados
exports.getTopProducts = async (req, res) => {
    try {
        const topProducts = await Product.findAll({
            attributes: [
                'SKU',
                'nombre',
                [Product.sequelize.fn('COUNT', Product.sequelize.col('id')), 'total']
            ],
            group: ['SKU', 'nombre'],
            order: [[Product.sequelize.literal('total'), 'DESC']],
            limit: 10
        });
        res.json(topProducts);
    } catch (err) {
        logger.error('Error al obtener top productos:', err);
        res.status(500).json({ error: 'Error al obtener top productos' });
    }
};

// Top usuarios que más agregan productos
exports.getTopUsers = async (req, res) => {
    try {
        const topUsers = await Product.findAll({
            attributes: [
                'usuario',
                [Product.sequelize.fn('COUNT', Product.sequelize.col('id')), 'total']
            ],
            group: ['usuario'],
            order: [[Product.sequelize.literal('total'), 'DESC']],
            limit: 10
        });
        res.json(topUsers);
    } catch (err) {
        logger.error('Error al obtener top usuarios:', err);
        res.status(500).json({ error: 'Error al obtener top usuarios' });
    }
};

// Tiempo promedio Faltantes → Realizado
exports.getTimeStats = async (req, res) => {
    try {
        const realizados = await Product.findAll({
            where: { categoria: 'Realizado' },
            attributes: ['createdAt', 'updatedAt']
        });

        const tiempos = realizados.map(p =>
            (new Date(p.updatedAt) - new Date(p.createdAt)) / 1000 / 60
        );

        const promedio = tiempos.length
            ? (tiempos.reduce((a, b) => a + b, 0) / tiempos.length).toFixed(2)
            : 0;

        res.json({ promedioMinutos: promedio, total: tiempos.length });
    } catch (err) {
        logger.error('Error al calcular tiempos:', err);
        res.status(500).json({ error: 'Error al calcular tiempos' });
    }
};

// Estadísticas generales (categorías, importancia, etc.)
exports.getGeneralStats = async (req, res) => {
    try {
        const stats = await Product.getStatsByCategory(); // definido en el modelo:contentReference[oaicite:1]{index=1}
        res.json(stats);
    } catch (err) {
        logger.error('Error al obtener estadísticas generales:', err);
        res.status(500).json({ error: 'Error al obtener estadísticas generales' });
    }
};

// controllers/productController.js - Método getBrandStats corregido
exports.getBrandStats = async (req, res) => {
    try {
        const userRole = req.session.userRole;

        if (userRole !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Solo administradores pueden ver estadísticas de marcas.' });
        }

        const brandStats = await Product.findAll({
            attributes: [
                'marca',
                [Product.sequelize.fn('COUNT', Product.sequelize.col('id')), 'count'],
                [Product.sequelize.fn('AVG', Product.sequelize.col('importancia')), 'avgImportance'],
                [Product.sequelize.fn('SUM', Product.sequelize.col('cantidad')), 'totalQuantity'],
                [Product.sequelize.fn('AVG', Product.sequelize.col('precio_compra')), 'avgPrice']
            ],
            where: {
                marca: {
                    [Op.and]: [
                        { [Op.ne]: null },
                        { [Op.ne]: '' }
                    ] // También excluir marcas vacías
                }
            },
            group: ['marca'],
            order: [[Product.sequelize.literal('count'), 'DESC']],
            limit: 10,
            raw: true // Agregar esto para obtener datos simples
        });

        // Formatear los resultados correctamente
        const formattedStats = brandStats.map(stat => ({
            marca: stat.marca || 'Sin marca',
            count: parseInt(stat.count || 0),
            avgImportance: parseFloat(stat.avgImportance || 0).toFixed(1),
            totalQuantity: parseInt(stat.totalQuantity || 0),
            avgPrice: parseFloat(stat.avgPrice || 0).toFixed(2)
        }));

        res.status(200).json(formattedStats);
    } catch (err) {
        logger.error('Error al obtener estadísticas de marcas:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

exports.renderProductStats = (req, res) => {
    res.render('product-stats', { title: 'Estadísticas' });
};