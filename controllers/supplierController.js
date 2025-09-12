const { Supplier } = require('../models');
const { validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');
const { City } = require('country-state-city');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

const ITEMS_PER_PAGE = 10;

// ================== VISTAS HTML ==================
exports.getAllSuppliers = async (req, res) => {
    try {
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
            userRole: req.session.userRole,
            csrfToken: req.csrfToken ? req.csrfToken() : ''
        });
    } catch (error) {
        logger.error('Error al obtener proveedores:', error);
        req.flash('error', 'Error al obtener los proveedores');
        res.redirect('/');
    }
};

// ================== APIs JSON ==================
exports.getAllSuppliersAPI = async (req, res) => {
    try {
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
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        const offset = (page - 1) * ITEMS_PER_PAGE;

        const suppliers = await Supplier.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']],
            limit: ITEMS_PER_PAGE,
            offset: offset
        });

        res.json({
            success: true,
            data: suppliers,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalItems: totalItems
            }
        });
    } catch (error) {
        logger.error('Error al obtener proveedores API:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los proveedores'
        });
    }
};

exports.createSupplierAPI = async (req, res) => {
    try {
        logger.info('📦 [API] body:', req.body);
        logger.info('📁 [API] file:', req.file);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.info('❌ [API] Errores de validación:', errors.array().length);
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        let imagenPath = null;
        if (req.file) {
            imagenPath = `/uploads/suppliers/${req.file.filename}`;
            logger.info('🖼️ [API] imagenPath:', imagenPath);
        }

        logger.info('💾 [API] Creando proveedor...');
        const nuevoProveedor = await Supplier.create({
            marca: req.body.marca,
            categoria: req.body.categoria,
            nombre: req.body.nombre,
            celular: req.body.celular,
            correo: req.body.correo,   // ✅ nuevo campo
            tipoAsesor: req.body.tipoAsesor,
            nombreEmpresa: req.body.nombreEmpresa,
            nota: req.body.nota,
            ciudad: req.body.ciudad,
            imagen: imagenPath
        });


        logger.info('✅ [API] Proveedor creado ID:', nuevoProveedor.id);

        res.json({
            success: true,
            message: 'Proveedor creado exitosamente',
            data: nuevoProveedor
        });
    } catch (error) {
        logger.error('❌ [API] Error al crear proveedor:', error);
        res.status(500).json({
            success: false,
            error: 'Error al crear el proveedor'
        });
    }
};

exports.updateSupplierAPI = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const supplier = await Supplier.findByPk(req.params.id);
        if (!supplier) {
            return res.status(404).json({
                success: false,
                error: 'Proveedor no encontrado'
            });
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
            correo: req.body.correo,   // ✅ nuevo campo
            tipoAsesor: req.body.tipoAsesor,
            nombreEmpresa: req.body.nombreEmpresa,
            nota: req.body.nota,
            ciudad: req.body.ciudad,
            imagen: imagenPath
        });


        res.json({
            success: true,
            message: 'Proveedor actualizado exitosamente',
            data: supplier
        });
    } catch (error) {
        logger.error('Error al actualizar proveedor API:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar el proveedor'
        });
    }
};

exports.deleteSupplierAPI = async (req, res) => {
    try {
        const supplier = await Supplier.findByPk(req.params.id);
        if (!supplier) {
            return res.status(404).json({
                success: false,
                error: 'Proveedor no encontrado'
            });
        }

        if (supplier.imagen) {
            const imagePath = path.join(__dirname, '../public', supplier.imagen);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await supplier.destroy();

        res.json({
            success: true,
            message: 'Proveedor eliminado exitosamente'
        });
    } catch (error) {
        logger.error('Error al eliminar proveedor API:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar el proveedor'
        });
    }
};

// ================== FUNCIONES ORIGINALES (para compatibilidad) ==================
exports.createSupplier = async (req, res) => {
    try {
        logger.info('📦 [CTRL] body:', req.body);
        logger.info('📁 [CTRL] file:', req.file);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map(error => error.msg);
            req.flash('error', errorMessages.join(', '));
            return res.redirect('/suppliers');
        }

        let imagenPath = null;
        if (req.file) {
            imagenPath = `/uploads/suppliers/${req.file.filename}`;
        }

        const nuevoProveedor = await Supplier.create({
            marca: req.body.marca,
            categoria: req.body.categoria,
            nombre: req.body.nombre,
            celular: req.body.celular,
            correo: req.body.correo,
            tipoAsesor: req.body.tipoAsesor,
            nombreEmpresa: req.body.nombreEmpresa,
            nota: req.body.nota,
            ciudad: req.body.ciudad,
            imagen: imagenPath
        });


        req.flash('success', 'Proveedor creado exitosamente');
        res.redirect('/suppliers');
    } catch (error) {
        logger.error('❌ Error al crear proveedor:', error);
        req.flash('error', 'Error al crear el proveedor');
        res.redirect('/suppliers');
    }
};

exports.updateSupplier = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
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
            correo: req.body.correo,   // ✅ nuevo campo
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