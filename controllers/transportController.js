const { Transporte } = require('../models');
const { Op } = require('sequelize');

// =============== VISTA EJS =================
exports.renderTransportView = async (req, res) => {
  try {
    console.log('🔍 GET /transport - Renderizando vista');
    const transportes = await Transporte.findAll({
      order: [['createdAt', 'DESC']]
    });
    console.log(`📋 Encontrados ${transportes.length} transportes`);
    
    res.render('transport', { 
      transportes,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  } catch (error) {
    console.error('❌ Error en GET /transport:', error);
    res.status(500).render('error', { 
      message: 'Error al cargar la página de transportes' 
    });
  }
};

exports.createTransport = async (req, res) => {
  try {
    console.log('➕ POST /transport - INICIANDO...');
    console.log('➕ Body recibido:', req.body);
    console.log('➕ Headers:', req.headers);
    console.log('➕ URL original:', req.originalUrl);
    console.log('➕ Método:', req.method);
    
    const { placa, nombre_conductor, telefono, tipo_vehiculo } = req.body;
    
    // Validaciones básicas
    if (!placa || !nombre_conductor || !telefono || !tipo_vehiculo) {
      console.log('❌ Campos faltantes');
      req.flash('error', 'Todos los campos son obligatorios');
      return res.redirect('/transport');
    }
    
    console.log('📝 Creando transporte con datos:', { placa, nombre_conductor, telefono, tipo_vehiculo });
    
    // Verificar si ya existe
    const transporteExistente = await Transporte.findOne({ where: { placa } });
    if (transporteExistente) {
      console.log('❌ Placa ya existe:', placa);
      req.flash('error', 'Ya existe un transporte con esta placa');
      return res.redirect('/transport');
    }
    
    await Transporte.create({ placa, nombre_conductor, telefono, tipo_vehiculo });
    console.log('✅ Transporte creado exitosamente');
    
    req.flash('success', 'Transporte creado correctamente');
    res.redirect('/transport');
    
  } catch (error) {
    console.error('❌ CREATE - Error completo:', error);
    console.error('❌ Stack:', error.stack);
    req.flash('error', error.message);
    res.redirect('/transport');
  }
};


exports.updateTransport = async (req, res) => {
  try {
    console.log('✏️ UPDATE - Params:', req.params, 'Body:', req.body);
    const { placa: placaOriginalFromUrl } = req.params;
    const { originalPlaca, placa: nuevaPlaca, nombre_conductor, telefono, tipo_vehiculo } = req.body;
    
    // Usar originalPlaca del body, que es más confiable
    const placaOriginal = originalPlaca || placaOriginalFromUrl;
    
    console.log('📝 Placa original:', placaOriginal, '- Nueva placa:', nuevaPlaca);
    
    // Validar que todos los campos estén presentes
    if (!nuevaPlaca || !nombre_conductor || !telefono || !tipo_vehiculo) {
      req.flash('error', 'Todos los campos son obligatorios');
      return res.redirect('/transport');
    }
    
    // Si la placa cambió, verificar que no exista otra con la nueva placa
    if (placaOriginal !== nuevaPlaca) {
      const transporteExistente = await Transporte.findOne({ 
        where: { placa: nuevaPlaca } 
      });
      if (transporteExistente) {
        req.flash('error', 'Ya existe otro transporte con esta placa');
        return res.redirect('/transport');
      }
    }
    
    // Actualizar el registro
    const result = await Transporte.update(
      { 
        placa: nuevaPlaca.trim().toUpperCase(), 
        nombre_conductor: nombre_conductor.trim(), 
        telefono: telefono.trim(), 
        tipo_vehiculo: tipo_vehiculo.trim() 
      }, 
      { where: { placa: placaOriginal } } // Buscar por la placa ORIGINAL
    );
    
    console.log('✏️ UPDATE - Resultado:', result);
    
    if (result[0] === 0) {
      req.flash('error', 'No se encontró el transporte para actualizar');
    } else {
      req.flash('success', 'Transporte actualizado correctamente');
    }
    
    res.redirect('/transport');
  } catch (error) {
    console.error('❌ UPDATE - Error:', error);
    req.flash('error', error.message || 'Error al actualizar el transporte');
    res.redirect('/transport');
  }
};

exports.deleteTransport = async (req, res) => {
  try {
    console.log('🗑️ DELETE - Params:', req.params);
    const { placa } = req.params;
    
    const result = await Transporte.destroy({ where: { placa } });
    console.log('🗑️ DELETE - Resultado:', result);
    
    if (result === 0) {
      req.flash('error', 'No se encontró el transporte para eliminar');
    } else {
      req.flash('success', 'Transporte eliminado correctamente');
    }
    
    res.redirect('/transport');
  } catch (error) {
    console.error('❌ DELETE - Error:', error);
    req.flash('error', error.message || 'Error al eliminar el transporte');
    res.redirect('/transport');
  }
};

// =============== API JSON =================
exports.getAllTransportAPI = async (req, res) => {
  try {
    const { search, tipo_vehiculo } = req.query;
    
    const whereClause = {};
    
    if (search) {
      whereClause[Op.or] = [
        { placa: { [Op.iLike]: `%${search}%` } },
        { nombre_conductor: { [Op.iLike]: `%${search}%` } },
        { telefono: { [Op.iLike]: `%${search}%` } },
        { tipo_vehiculo: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (tipo_vehiculo) {
      whereClause.tipo_vehiculo = tipo_vehiculo;
    }
    
    const transportes = await Transporte.findAll({ 
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });
    
    res.json(transportes);
  } catch (error) {
    console.error('Error en API getAllTransport:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.getTiposVehiculo = async (req, res) => {
  try {
    const tipos = await Transporte.findAll({
      attributes: ['tipo_vehiculo'],
      group: ['tipo_vehiculo'],
      order: [['tipo_vehiculo', 'ASC']]
    });
    
    const tiposList = tipos.map(t => t.tipo_vehiculo).filter(t => t);
    res.json(tiposList);
  } catch (error) {
    console.error('Error al obtener tipos de vehículo:', error);
    res.status(500).json({ error: 'Error al obtener tipos de vehículo' });
  }
};

exports.createTransportAPI = async (req, res) => {
  try {
    const { placa, nombre_conductor, telefono, tipo_vehiculo } = req.body;
    const transporte = await Transporte.create({ placa, nombre_conductor, telefono, tipo_vehiculo });
    res.status(201).json(transporte);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateTransportAPI = async (req, res) => {
  try {
    const { placa } = req.params;
    await Transporte.update(req.body, { where: { placa } });
    res.json({ message: 'Transporte actualizado correctamente' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteTransportAPI = async (req, res) => {
  try {
    const { placa } = req.params;
    await Transporte.destroy({ where: { placa } });
    res.json({ message: 'Transporte eliminado correctamente' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};