// controllers/productController.js

const { Product } = require('../models');
const { Op } = require('sequelize');

// Función para obtener todos los productos
exports.getAllProducts = async (req, res) => {
    try {
        const { category, sort, order } = req.query;
        
        let where = {};
        if (category) {
            where.categoria = category;
        }

        let orderClause = [];
        if (sort === 'name') {
            orderClause.push(['nombre', order === 'desc' ? 'DESC' : 'ASC']);
        } else if (sort === 'date') {
            orderClause.push(['createdAt', order === 'desc' ? 'DESC' : 'ASC']);
        }
        
        const products = await Product.findAll({
            where,
            order: orderClause
        });
        
        res.status(200).json(products);
    } catch (err) {
        console.error('Error al obtener productos:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// Función para obtener un solo producto por su ID
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }
        res.status(200).json(product);
    } catch (err) {
        console.error('Error al obtener el producto por ID:', err);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// Función para crear un nuevo producto
exports.createProduct = async (req, res) => {
    try {
        const { SKU, name, importance, category, notes } = req.body;
        const userRole = req.session.userRole;

        // Definir valores por defecto para campos de no-admin
        let quantity = 0;
        let purchasePrice = 0;
        let supplier = 'N/A';
        let ready = false;
        let finalCategory = 'Faltantes';

        // Si el usuario es admin, usar los valores enviados
        if (userRole === 'admin') {
            quantity = req.body.quantity || 0;
            purchasePrice = req.body.purchasePrice || 0;
            supplier = req.body.supplier || 'N/A';
            ready = req.body.ready || false;
            finalCategory = category || 'Faltantes';
        }

        const newProduct = await Product.create({
            SKU,
            nombre: name,
            cantidad: quantity,
            importancia: importance,
            categoria: finalCategory,
            precio_compra: purchasePrice,
            proveedor: supplier,
            nota: notes,
            listo: ready,
            usuario: req.session.username // Almacenar el nombre del usuario
        });

        res.status(201).json({ message: 'Producto creado con éxito.', product: newProduct });
    } catch (err) {
        console.error('Error al crear el producto:', err);
        res.status(500).json({ error: 'Error interno del servidor.', details: err.message });
    }
};

// Función para actualizar un producto
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { SKU, name, quantity, category, importance, purchasePrice, supplier, notes, ready } = req.body;
        const userRole = req.session.userRole;

        // Buscar el producto para ver quién lo creó
        const productToUpdate = await Product.findByPk(id);
        if (!productToUpdate) {
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }

        // Si el usuario no es admin, solo permitir actualizar ciertos campos
        let dataToUpdate = {
            SKU,
            nombre: name,
            importancia: importance,
            nota: notes
        };

        if (userRole === 'admin') {
            dataToUpdate.cantidad = quantity;
            dataToUpdate.categoria = category;
            dataToUpdate.precio_compra = purchasePrice;
            dataToUpdate.proveedor = supplier;
            dataToUpdate.listo = ready;
        } else {
            // Un usuario normal no puede cambiar la categoría
            dataToUpdate.categoria = 'Faltantes'; 
        }

        const [updated] = await Product.update(dataToUpdate, {
            where: { id: id }
        });

        if (updated) {
            const updatedProduct = await Product.findByPk(id);
            return res.status(200).json({ message: 'Producto actualizado con éxito.', product: updatedProduct });
        }
        res.status(404).json({ error: 'Producto no encontrado.' });
    } catch (err) {
        console.error('Error al actualizar el producto:', err);
        res.status(500).json({ error: 'Error interno del servidor.', details: err.message });
    }
};

// Función para eliminar un producto
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Product.destroy({
            where: { id: id }
        });

        if (deleted) {
            return res.status(200).json({ message: 'Producto eliminado con éxito.' });
        }
        res.status(404).json({ error: 'Producto no encontrado.' });
    } catch (err) {
        console.error('Error al eliminar el producto:', err);
        res.status(500).json({ error: 'Error interno del servidor.', details: err.message });
    }
};