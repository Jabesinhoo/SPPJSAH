// supplierController.js
const { Supplier } = require('../models');  // ✅ Aquí sí obtienes el modelo real
const { validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');
const { City } = require('country-state-city');
const { Op } = require('sequelize'); // Importamos Op para usar operadores como LIKE
const logger = require('../utils/logger');

// Configuración de paginación
const ITEMS_PER_PAGE = 10; // Puedes ajustar este número según tu preferencia

exports.getAllSuppliers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const searchQuery = req.query.search || '';
        const categoryFilter = req.query.category || '';
        const cityFilter = req.query.city || '';

        // Construir el objeto de condiciones (where) para la búsqueda y los filtros
        const whereClause = {};

        // 1. Lógica de búsqueda (search)
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

        // 2. Lógica de filtros específicos (category, city)
        if (categoryFilter) {
            whereClause.categoria = categoryFilter;
        }

        if (cityFilter) {
            whereClause.ciudad = cityFilter;
        }

        // Obtener el total de proveedores que coinciden con los criterios de búsqueda
        const totalItems = await Supplier.count({ where: whereClause });
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        const offset = (page - 1) * ITEMS_PER_PAGE;

        const suppliers = await Supplier.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']],
            limit: ITEMS_PER_PAGE,
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
            userRole: req.session.userRole
        });
    } catch (error) {
        logger.error('Error al obtener proveedores:', error);
        req.flash('error', 'Error al obtener los proveedores');
        res.redirect('/');
    }
};

// ... (Las funciones createSupplier, updateSupplier, deleteSupplier no necesitan cambios)

// Crear nuevo proveedor
// Crear nuevo proveedor
exports.createSupplier = async (req, res) => {
    try {
        logger.info('📦 [CTRL] body:', req.body);
        logger.info('📁 [CTRL] file:', req.file);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.info('❌ [CTRL] Errores de validación (count):', errors.array().length);
            console.table(errors.array());

            const errorMessages = errors.array().map(error => error.msg);
            req.flash('error', errorMessages.join(', '));
            return res.redirect('/suppliers');
        }

        let imagenPath = null;
        if (req.file) {
            imagenPath = `/uploads/suppliers/${req.file.filename}`;
            logger.info('🖼️ [CTRL] imagenPath listo:', imagenPath);
        } else {
            logger.info('ℹ️ [CTRL] Sin archivo de imagen adjunto');
        }

        logger.info('💾 [CTRL] Creando proveedor en DB...');
        const nuevoProveedor = await Supplier.create({
            marca: req.body.marca,
            categoria: req.body.categoria,
            nombre: req.body.nombre,
            celular: req.body.celular,
            tipoAsesor: req.body.tipoAsesor,
            nombreEmpresa: req.body.nombreEmpresa,
            nota: req.body.nota,
            ciudad: req.body.ciudad,
            imagen: imagenPath
        });
        logger.info('✅ [CTRL] Proveedor creado ID:', nuevoProveedor.id);

        req.flash('success', 'Proveedor creado exitosamente');
        res.redirect('/suppliers');
    } catch (error) {
        logger.error('❌ [CTRL] Error al crear proveedor:', error);
        logger.error('❌ [CTRL] Stack:', error.stack);
        req.flash('error', 'Error al crear el proveedor');
        res.redirect('/suppliers');
    }
};

// Actualizar proveedor
exports.updateSupplier = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.info('❌ [CTRL] Errores de validación (count):', errors.array().length);
            console.table(errors.array());

            const errorMessages = errors.array().map(error => error.msg);
            req.flash('error', errorMessages.join(', '));
            return res.redirect('/suppliers');
        }

        const supplier = await Supplier.findByPk(req.params.id);
        if (!supplier) {
            req.flash('error', 'Proveedor no encontrado');
            return res.redirect('/suppliers');
        }

        let imagenPath = supplier.imagen;
        if (req.file) {
            if (supplier.imagen) {
                const oldImagePath = path.join(__dirname, '../public', supplier.imagen);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            imagenPath = `/uploads/suppliers/${req.file.filename}`;
        }

        await supplier.update({
            marca: req.body.marca,
            categoria: req.body.categoria,
            nombre: req.body.nombre,
            celular: req.body.celular,
            tipoAsesor: req.body.tipoAsesor,
            nombreEmpresa: req.body.nombreEmpresa,
            nota: req.body.nota,
            ciudad: req.body.ciudad,
            imagen: imagenPath
        });

        req.flash('success', 'Proveedor actualizado exitosamente');
        res.redirect('/suppliers');
    } catch (error) {
        logger.error('Error al actualizar proveedor:', error);
        req.flash('error', 'Error al actualizar el proveedor');
        res.redirect('/suppliers');
    }
};

// Eliminar proveedor
exports.deleteSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findByPk(req.params.id);
        if (!supplier) {
            req.flash('error', 'Proveedor no encontrado');
            return res.redirect('/suppliers');
        }

        if (supplier.imagen) {
            const imagePath = path.join(__dirname, '../public', supplier.imagen);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await supplier.destroy();
        req.flash('success', 'Proveedor eliminado exitosamente');
        res.redirect('/suppliers');
    } catch (error) {
        logger.error('Error al eliminar proveedor:', error);
        req.flash('error', 'Error al eliminar el proveedor');
        res.redirect('/suppliers');
    }
};