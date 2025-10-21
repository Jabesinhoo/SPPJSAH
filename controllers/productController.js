// controllers/productController.js - Actualizado con sistema de historial

const { Product, User, ProductHistory } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const HistoryService = require('../services/historyService');

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

// controllers/productController.js - Actualizar getProductById con historial
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id, {
            include: [{
                model: ProductHistory,
                as: 'history',
                limit: 10,
                order: [['createdAt', 'DESC']]
            }]
        });
        
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

        // 🔎 Log inicial
        logger.info('🟢 Body recibido en createProduct:', req.body);

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
            return res.status(409).json({
                error: 'Ya existe un producto con este SKU en estado activo. Marca el anterior como Realizado antes de crear otro.'
            });
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
        let productData = {
            SKU: SKU.trim(),
            nombre: name.trim(),
            cantidad: parsedQuantity,
            importancia: validImportance,
            categoria: 'Faltantes',
            precio_compra: 0,
            proveedor: 'N/A',
            brand: 'N/A',
            listo: false,
            usuario: username,
            nota: notes || null
        };

        // Admin puede establecer marca
        if (req.body.brand !== undefined) {
            productData.brand = req.body.brand.trim() || 'N/A';
        }

        // Definir categorías permitidas según rol
        let allowedCategories = ['Faltantes', 'Bajo Pedido', 'Agotados con el Proveedor', 'Demasiadas Existencias'];
        if (userRole === 'admin') {
            allowedCategories = [...allowedCategories, 'Realizado'];

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

        // Procesar notas
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

        // Crear producto
        const newProduct = await Product.create(productData);

        // 🔎 Logs de depuración
        logger.info('🟢 Datos que se van a guardar en DB:', productData);
        logger.info('🟢 Producto creado en DB:', newProduct.toJSON());

        // El historial se registra automáticamente en el hook afterCreate del modelo

        res.status(201).json({
            message: 'Producto creado con éxito.',
            product: newProduct
        });
    } catch (err) {
        logger.error('❌ Error al crear el producto:', err);

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
    const { SKU, name, quantity, category, importance, purchasePrice, supplier, notes, ready, brand, bulkOperationId } = req.body;
    const userRole = req.session.userRole;
    const username = req.session.username;

    console.log('🔧 Update Product Request:', { id, body: req.body, userRole });

    // 🧩 Mapeo automático: quantity → cantidad
    if (req.body.quantity !== undefined && req.body.cantidad === undefined) {
      req.body.cantidad = req.body.quantity;
    }

    // Buscar el producto
    const productToUpdate = await Product.findByPk(id);
    if (!productToUpdate) {
      console.log('❌ Producto no encontrado:', id);
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    // Guardar snapshot antiguo para el historial
    const oldSnapshot = productToUpdate.toJSON();
    const dataToUpdate = {};

    // SKU
    if (SKU !== undefined) {
      const trimmedSKU = SKU.trim();
      if (trimmedSKU.length === 0) {
        return res.status(400).json({ error: 'El SKU no puede estar vacío.' });
      }
      dataToUpdate.SKU = trimmedSKU;
    }

    // Nombre
    if (name !== undefined) {
      const trimmedName = name.trim();
      if (trimmedName.length === 0) {
        return res.status(400).json({ error: 'El nombre no puede estar vacío.' });
      }
      dataToUpdate.nombre = trimmedName;
    }

    // Marca
    if (brand !== undefined) {
      dataToUpdate.brand = brand.trim() || 'N/A';
    }

    // Cantidad
    if (quantity !== undefined) {
      const parsedQuantity = parseInt(quantity);
      if (isNaN(parsedQuantity) || parsedQuantity < 0) {
        return res.status(400).json({ error: 'La cantidad debe ser un número válido mayor o igual a 0.' });
      }
      dataToUpdate.cantidad = parsedQuantity;
    }

    // Importancia
    if (importance !== undefined) {
      const parsedImportance = parseInt(importance);
      if (isNaN(parsedImportance) || parsedImportance < 1 || parsedImportance > 5) {
        return res.status(400).json({ error: 'La importancia debe ser un número entre 1 y 5.' });
      }
      dataToUpdate.importancia = parsedImportance;
    }

    // Precio de compra (solo admin)
    if (userRole === 'admin' && purchasePrice !== undefined) {
      const parsedPurchasePrice = parseFloat(purchasePrice);
      if (isNaN(parsedPurchasePrice) || parsedPurchasePrice < 0) {
        return res.status(400).json({ error: 'El precio de compra debe ser un número válido mayor o igual a 0.' });
      }
      dataToUpdate.precio_compra = parsedPurchasePrice;
    }

    // Notas
    if (notes !== undefined) {
      try {
        if (typeof notes === 'string') {
          const parsedNotes = JSON.parse(notes);
          dataToUpdate.nota = JSON.stringify(parsedNotes);
        } else {
          dataToUpdate.nota = JSON.stringify(notes);
        }
      } catch (e) {
        const noteObject = [{
          text: notes.toString(),
          user: username,
          date: new Date().toISOString(),
          mentions: []
        }];
        dataToUpdate.nota = JSON.stringify(noteObject);
      }
    }

    // Lógica de categoría y “listo”
    if (userRole === 'admin') {
      if (ready !== undefined) {
        const isReady = ready === true || ready === 'true';
        dataToUpdate.listo = isReady;
        if (isReady && !category && productToUpdate.categoria !== 'Realizado') {
          dataToUpdate.categoria = 'Realizado';
        }
      }

      if (category !== undefined) {
        const validCategories = ['Faltantes', 'Bajo Pedido', 'Agotados con el Proveedor', 'Demasiadas Existencias', 'Realizado'];
        if (validCategories.includes(category)) {
          dataToUpdate.categoria = category;
          dataToUpdate.listo = category === 'Realizado';
        } else {
          return res.status(400).json({ error: 'Categoría no válida.' });
        }
      }

      if (supplier !== undefined) {
        dataToUpdate.proveedor = supplier.trim() || 'N/A';
      }
    } else {
      // Usuarios normales
      if (category !== undefined) {
        const userCategories = ['Faltantes', 'Bajo Pedido', 'Agotados con el Proveedor', 'Demasiadas Existencias'];
        if (userCategories.includes(category)) {
          dataToUpdate.categoria = category;
          if (category === 'Faltantes') dataToUpdate.listo = false;
        } else {
          return res.status(400).json({ error: 'Categoría no válida para tu rol.' });
        }
      }
    }

    // Validar categoría/listo
    const finalCategory = dataToUpdate.categoria || productToUpdate.categoria;
    const finalReady = dataToUpdate.listo !== undefined ? dataToUpdate.listo : productToUpdate.listo;
    if (finalReady && finalCategory === 'Faltantes') {
      return res.status(400).json({
        error: 'No se puede marcar como "Listo" un producto en categoría "Faltantes". Cambia primero la categoría.'
      });
    }

    // Actualizar fecha
    dataToUpdate.updatedAt = new Date();

    // Sin datos
    if (Object.keys(dataToUpdate).length === 0) {
      console.log('⚠️ No hay datos para actualizar');
      return res.status(400).json({ error: 'No se proporcionaron datos para actualizar.' });
    }

    console.log('📝 Datos a actualizar:', dataToUpdate);

    // 🧠 Actualizar usando save() (ejecuta hooks y no falla si no hay cambios)
    Object.assign(productToUpdate, dataToUpdate);
    const updatedProduct = await productToUpdate.save();

    // 🧾 Registrar historial manual como respaldo
    try {
      await HistoryService.recordChange(
        id,
        'UPDATE',
        oldSnapshot,
        updatedProduct.toJSON(),
        { username },
        bulkOperationId
      );
    } catch (historyError) {
      console.error('⚠️ Error al registrar en historial:', historyError);
    }

    // Logs y respuesta
    if (JSON.stringify(oldSnapshot) === JSON.stringify(updatedProduct.toJSON())) {
      logger.info(`⚠️ Producto ${id} no tuvo cambios (valores iguales).`);
      return res.status(200).json({
        message: 'Producto sin cambios (ya estaba actualizado).',
        product: updatedProduct
      });
    }

    logger.info(`✅ Producto actualizado: ${updatedProduct.nombre} (ID: ${id}) por usuario: ${username}`);
    console.log('✅ Producto actualizado exitosamente');

    return res.status(200).json({
      message: 'Producto actualizado con éxito.',
      product: updatedProduct
    });
  } catch (err) {
    console.error('❌ Error al actualizar el producto:', err);
    logger.error('Error al actualizar el producto:', err);

    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Ya existe un producto con este SKU.' });
    }

    if (err.name === 'SequelizeValidationError') {
      const validationErrors = err.errors.map(error => error.message);
      return res.status(400).json({ error: 'Errores de validación: ' + validationErrors.join(', ') });
    }

    res.status(500).json({
      error: 'Error interno del servidor.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const { ProductHistory, Product } = require('../models');
    const history = await ProductHistory.findAll({
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'SKU', 'nombre']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    res.status(200).json(history);
  } catch (error) {
    console.error('❌ Error al obtener historial:', error);
    res.status(500).json({ error: 'Error al obtener el historial' });
  }
};
// Función para eliminar un producto
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const userRole = req.session.userRole;
        const username = req.session.username;

        // Buscar el producto antes de eliminarlo
        const productToDelete = await Product.findByPk(id);
        if (!productToDelete) {
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }

        // Solo los admins pueden eliminar productos
        if (userRole !== 'admin') {
            return res.status(403).json({ error: 'No tienes permisos para eliminar productos. Solo los administradores pueden realizar esta acción.' });
        }

        // Guardar snapshot para el historial
        const oldSnapshot = productToDelete.toJSON();

        const deleted = await Product.destroy({
            where: { id: id },
            individualHooks: true // Para que se ejecute el hook afterDestroy
        });

        if (deleted) {
            // Registrar eliminación manualmente (como backup del hook automático)
            try {
                await HistoryService.recordChange(
                    id,
                    'DELETE',
                    oldSnapshot,
                    null,
                    { username }
                );
            } catch (historyError) {
                console.error('⚠️ Error al registrar eliminación en historial:', historyError);
                // No fallar la operación principal por error en historial
            }

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

exports.getProductHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 20 } = req.query;

        const history = await HistoryService.getProductHistory(id, parseInt(limit));
        res.status(200).json(history);
    } catch (err) {
        logger.error('Error al obtener historial del producto:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// Obtener cambios recientes
exports.getRecentChanges = async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const changes = await HistoryService.getLastChanges(parseInt(limit));
        res.status(200).json(changes);
    } catch (err) {
        logger.error('Error al obtener cambios recientes:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// Revertir un cambio específico
// controllers/productController.js
exports.revertChange = async (req, res) => {
    try {
        const { historyId } = req.params;
        const username = req.session.username || 'Sistema';

        // Buscar el registro de historial a revertir
        const historyRecord = await ProductHistory.findByPk(historyId, {
            include: [
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'SKU', 'nombre']
                }
            ]
        });

        if (!historyRecord) {
            return res.status(404).json({ error: 'Registro de historial no encontrado.' });
        }

        // Si es una operación masiva (bulk)
        if (historyRecord.bulkOperationId) {
            const relatedRecords = await ProductHistory.findAll({
                where: { bulkOperationId: historyRecord.bulkOperationId }
            });

            if (!relatedRecords || relatedRecords.length === 0) {
                return res.status(404).json({ error: 'No se encontraron registros relacionados para revertir.' });
            }

            const revertedProducts = [];

            for (const record of relatedRecords) {
                if (record.oldData) {
                    const product = await Product.findByPk(record.productId);
                    if (product) {
                        const currentSnapshot = product.toJSON();

                        await Product.update(record.oldData, { where: { id: record.productId } });

                        // Registrar reversión individual
                        await HistoryService.recordChange(
                            record.productId,
                            'REVERT',
                            currentSnapshot,
                            record.oldData,
                            { username },
                            `revert-${historyRecord.bulkOperationId}`
                        );

                        revertedProducts.push({
                            id: product.id,
                            SKU: product.SKU,
                            nombre: product.nombre
                        });
                    }
                }
            }

            return res.status(200).json({
                message: `Operación masiva revertida (${revertedProducts.length} productos restaurados).`,
                revertedProducts
            });
        }

        // Si es un cambio individual
        if (historyRecord.oldData) {
            const product = await Product.findByPk(historyRecord.productId);
            if (!product) {
                return res.status(404).json({ error: 'Producto no encontrado para revertir.' });
            }

            const currentSnapshot = product.toJSON();

            // Aplicar reversión
            await Product.update(historyRecord.oldData, {
                where: { id: historyRecord.productId }
            });

            // Registrar el evento de reversión
            await HistoryService.recordChange(
                historyRecord.productId,
                'REVERT',
                currentSnapshot,
                historyRecord.oldData,
                { username },
                `revert-${historyId}`
            );

            const revertedProduct = await Product.findByPk(historyRecord.productId);
            return res.status(200).json({
                message: 'Cambio revertido con éxito.',
                product: revertedProduct,
                revertedFrom: historyRecord
            });
        }

        return res.status(400).json({ error: 'No hay datos previos para revertir.' });
    } catch (err) {
        logger.error('Error al revertir cambio:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};


// Obtener historial de una operación en lote
exports.getBulkOperationHistory = async (req, res) => {
    try {
        const { operationId } = req.params;
        const history = await HistoryService.getBulkOperationHistory(operationId);
        res.status(200).json(history);
    } catch (err) {
        logger.error('Error al obtener historial de operación en lote:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// --- Resto de tus funciones existentes (estadísticas, etc.) ---

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
    const stats = await Product.getStatsByCategory();
    res.json(stats);
  } catch (err) {
    logger.error('Error al obtener estadísticas generales:', err);
    res.status(500).json({ error: 'Error al obtener estadísticas generales' });
  }
};

// Estadísticas por marca
exports.getBrandStats = async (req, res) => {
  try {
    const userRole = req.session.userRole;

    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado. Solo administradores pueden ver estadísticas de marcas.' });
    }

    logger.info('📊 Iniciando consulta de estadísticas de marcas...');

    const brandStats = await Product.findAll({
      attributes: [
        'brand',
        [Product.sequelize.fn('COUNT', Product.sequelize.col('id')), 'count'],
        [Product.sequelize.cast(Product.sequelize.fn('AVG', Product.sequelize.col('importancia')), 'FLOAT'), 'avgImportance'],
        [Product.sequelize.fn('SUM', Product.sequelize.col('cantidad')), 'totalQuantity'],
        [Product.sequelize.cast(Product.sequelize.fn('AVG', Product.sequelize.col('precio_compra')), 'FLOAT'), 'avgPrice'],
        [Product.sequelize.fn('SUM', Product.sequelize.literal('"precio_compra" * "cantidad"')), 'totalValue']
      ],
      where: {
        brand: {
          [Op.and]: [
            { [Op.ne]: null },
            { [Op.ne]: '' }
          ]
        }
      },
      group: ['brand'],
      order: [[Product.sequelize.literal('count'), 'DESC']],
      limit: 10,
      raw: true
    });

    logger.info('🟢 Resultado crudo desde Sequelize:', brandStats);

    // 🔧 Normalizar para frontend
    const formattedStats = brandStats.map(stat => ({
      marca: stat.brand || 'Sin marca',
      count: parseInt(stat.count || 0),
      avgImportance: parseFloat(stat.avgImportance || 0).toFixed(1),
      totalQuantity: parseInt(stat.totalQuantity || 0),
      avgPrice: parseFloat(stat.avgPrice || 0).toFixed(2),
      totalValue: stat.totalValue ? Number(stat.totalValue).toFixed(2) : "0.00"
    }));

    logger.info('🟢 Estadísticas formateadas que se envían al frontend:', formattedStats);

    res.status(200).json(formattedStats);
  } catch (err) {
    logger.error('❌ Error al obtener estadísticas de marcas:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

exports.renderProductStats = (req, res) => {
    res.render('product-stats', { title: 'Estadísticas' });
};