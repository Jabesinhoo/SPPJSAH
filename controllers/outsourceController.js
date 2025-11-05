const { Outsource, sequelize } = require('../models');
const { Op } = require('sequelize');

const outsourceController = {
  // Obtener todos los técnicos con paginación y búsqueda
  getAllOutsources: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';
      const filterService = req.query.filterService || '';
      const offset = (page - 1) * limit;

      const whereClause = {};
      
      // Búsqueda general
      if (search) {
        const searchConditions = [
          { nombre_tecnico: { [Op.iLike]: `%${search}%` } },
          { telefono: { [Op.iLike]: `%${search}%` } }
        ];

        if (!isNaN(search)) {
          searchConditions.push({ sku: { [Op.eq]: parseInt(search) } });
          searchConditions.push(
            sequelize.where(
              sequelize.cast(sequelize.col('cc'), 'varchar'),
              { [Op.iLike]: `%${search}%` }
            )
          );
        }

        whereClause[Op.or] = searchConditions;
      }

      // Filtro por tipo de servicio
      if (filterService) {
        whereClause.tipo_servicio = {
          [Op.contains]: [filterService]
        };
      }

      const { count, rows: outsources } = await Outsource.findAndCountAll({
        where: whereClause,
        order: [['sku', 'DESC']],
        limit,
        offset
      });

      res.json({
        success: true,
        data: outsources,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: limit
        }
      });
    } catch (error) {
      console.error('Error al obtener técnicos:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error interno del servidor' 
      });
    }
  },

  // Obtener tipos de servicio únicos para filtros
  getServiceTypes: async (req, res) => {
    try {
      const outsources = await Outsource.findAll({
        attributes: ['tipo_servicio']
      });

      const servicesSet = new Set();
      outsources.forEach(outsource => {
        if (outsource.tipo_servicio && Array.isArray(outsource.tipo_servicio)) {
          outsource.tipo_servicio.forEach(service => {
            servicesSet.add(service.trim());
          });
        }
      });

      const services = Array.from(servicesSet).sort();

      res.json({
        success: true,
        data: services
      });
    } catch (error) {
      console.error('Error al obtener tipos de servicio:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error interno del servidor' 
      });
    }
  },

  // Obtener un técnico por ID
  getOutsourceById: async (req, res) => {
    try {
      const outsource = req.outsource;
      res.json({
        success: true,
        data: outsource
      });
    } catch (error) {
      console.error('Error al obtener técnico:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error interno del servidor' 
      });
    }
  },

  // Crear nuevo técnico
 // En el método createOutsource, modificar la validación del SKU:
createOutsource: async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { nombre_tecnico, telefono, cc, sku, tipo_servicio } = req.body;

    // DEBUG: Mostrar datos recibidos
    console.log('=== BACKEND: DATOS RECIBIDOS ===');
    console.log('SKU recibido:', sku, 'Tipo:', typeof sku);
    console.log('Nombre:', nombre_tecnico);
    console.log('Teléfono:', telefono);
    console.log('Cédula:', cc);
    console.log('Servicios:', tipo_servicio);

    // Convertir SKU a número
    const skuNumber = parseInt(sku);
    console.log('SKU convertido a número:', skuNumber);
    
    // Validar que el SKU no exista
    const existingSku = await Outsource.findOne({ 
      where: { sku: skuNumber } 
    });
    
    if (existingSku) {
      console.log('SKU ya existe en la base de datos');
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Ya existe un técnico con este SKU'
      });
    }

    console.log('Creando nuevo técnico en la base de datos...');
    
    const newOutsource = await Outsource.create({
      nombre_tecnico: nombre_tecnico.trim(),
      telefono: telefono.trim(),
      cc: cc.toString().trim(),
      sku: skuNumber,
      tipo_servicio: tipo_servicio
    }, { transaction });

    await transaction.commit();

    const createdOutsource = await Outsource.findByPk(newOutsource.id);
    
    console.log('Técnico creado exitosamente:', createdOutsource.toJSON());

    res.status(201).json({
      success: true,
      message: 'Técnico creado exitosamente',
      data: createdOutsource
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al crear técnico:', error);
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors[0]?.path;
      console.log('Error de constraint único en campo:', field);
      if (field === 'cc') {
        return res.status(400).json({
          success: false,
          error: 'Ya existe un técnico con esta cédula'
        });
      }
      if (field === 'sku') {
        return res.status(400).json({
          success: false,
          error: 'Ya existe un técnico con este SKU'
        });
      }
    }
    
    if (error.name === 'SequelizeValidationError') {
      console.log('Error de validación:', error.errors);
      return res.status(400).json({
        success: false,
        error: error.errors[0]?.message || 'Error de validación'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
},
  // Actualizar técnico
  updateOutsource: async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
      const outsource = req.outsource;
      const { nombre_tecnico, telefono, cc, sku, tipo_servicio } = req.body;

      // Validar que el SKU no esté duplicado (excluyendo el actual)
      if (sku && parseInt(sku) !== outsource.sku) {
        const existingSku = await Outsource.findOne({ 
          where: { 
            sku: parseInt(sku), 
            id: { [Op.ne]: outsource.id } 
          } 
        });
        if (existingSku) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            error: 'Ya existe otro técnico con este SKU'
          });
        }
      }

      await outsource.update({
        nombre_tecnico,
        telefono,
        cc,
        sku: parseInt(sku),
        tipo_servicio
      }, { transaction });

      await transaction.commit();

      // Recargar el técnico actualizado
      const updatedOutsource = await Outsource.findByPk(outsource.id);

      res.json({
        success: true,
        message: 'Técnico actualizado exitosamente',
        data: updatedOutsource
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error al actualizar técnico:', error);
      
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
          success: false,
          error: 'Ya existe un técnico con esta cédula o SKU'
        });
      }
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          success: false,
          error: error.errors[0]?.message || 'Error de validación'
        });
      }
      
      res.status(500).json({ 
        success: false, 
        error: 'Error interno del servidor' 
      });
    }
  },

  // Eliminar técnico
  deleteOutsource: async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
      const outsource = req.outsource;
      await outsource.destroy({ transaction });

      await transaction.commit();

      res.json({
        success: true,
        message: 'Técnico eliminado exitosamente'
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Error al eliminar técnico:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error interno del servidor' 
      });
    }
  },

  // Búsqueda en tiempo real para AJAX
  searchOutsources: async (req, res) => {
    try {
      const { q } = req.query;
      
      if (!q || q.length < 2) {
        return res.json({
          success: true,
          data: []
        });
      }

      const searchConditions = [
        { nombre_tecnico: { [Op.iLike]: `%${q}%` } },
        { telefono: { [Op.iLike]: `%${q}%` } }
      ];

      if (!isNaN(q)) {
        searchConditions.push({ sku: { [Op.eq]: parseInt(q) } });
        searchConditions.push(
          sequelize.where(
            sequelize.cast(sequelize.col('cc'), 'varchar'),
            { [Op.iLike]: `%${q}%` }
          )
        );
      }

      const outsources = await Outsource.findAll({
        where: {
          [Op.or]: searchConditions
        },
        limit: 10,
        order: [['nombre_tecnico', 'ASC']]
      });

      res.json({
        success: true,
        data: outsources
      });
    } catch (error) {
      console.error('Error al buscar técnicos:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error interno del servidor' 
      });
    }
  }
};

module.exports = outsourceController;