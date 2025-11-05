const { Outsource } = require('../models');
const { Op } = require('sequelize'); // ← AÑADIR ESTA LÍNEA

const validateOutsourceData = (req, res, next) => {
  const { nombre_tecnico, telefono, cc, tipo_servicio, sku } = req.body;

  // Agregar SKU a los campos obligatorios
  if (!nombre_tecnico || !telefono || !cc || !tipo_servicio || !sku) {
    return res.status(400).json({
      error: 'Todos los campos son obligatorios: nombre_tecnico, telefono, cc, tipo_servicio, sku'
    });
  }

  // Validar que SKU sea un número positivo
  const skuNumber = parseInt(sku);
  if (isNaN(skuNumber) || skuNumber <= 0) {
    return res.status(400).json({
      error: 'El SKU debe ser un número positivo'
    });
  }

  // Validar que tipo_servicio sea un array
  if (!Array.isArray(tipo_servicio)) {
    return res.status(400).json({
      error: 'tipo_servicio debe ser un array'
    });
  }

  // Filtrar servicios vacíos
  const serviciosFiltrados = tipo_servicio.filter(servicio => servicio.trim().length > 0);
  if (serviciosFiltrados.length === 0) {
    return res.status(400).json({
      error: 'Debe ingresar al menos un tipo de servicio válido'
    });
  }

  // Reemplazar el array con los servicios filtrados
  req.body.tipo_servicio = serviciosFiltrados;

  next();
};

const checkDuplicateCC = async (req, res, next) => {
  try {
    const { cc } = req.body;
    const { id } = req.params;

    const whereClause = { cc };
    if (id) {
      whereClause.id = { [Op.ne]: id }; // ← AQUÍ SE USA Op
    }

    const existingOutsource = await Outsource.findOne({ where: whereClause });
    if (existingOutsource) {
      return res.status(400).json({
        error: 'Ya existe un técnico con esta cédula'
      });
    }

    next();
  } catch (error) {
    console.error('Error en checkDuplicateCC:', error);
    res.status(500).json({ error: 'Error al verificar duplicados' });
  }
};

const outsourceExists = async (req, res, next) => {
  try {
    const { id } = req.params;
    const outsource = await Outsource.findByPk(id);

    if (!outsource) {
      return res.status(404).json({ error: 'Técnico no encontrado' });
    }

    req.outsource = outsource;
    next();
  } catch (error) {
    console.error('Error en outsourceExists:', error);
    res.status(500).json({ error: 'Error al buscar el técnico' });
  }
};

module.exports = {
  validateOutsourceData,
  checkDuplicateCC,
  outsourceExists
};