// models/product.js - Modelo actualizado con asociaciones de historial
module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    SKU: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'El SKU no puede estar vacío'
        },
        len: {
          args: [1, 50],
          msg: 'El SKU debe tener entre 1 y 50 caracteres'
        }
      }
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'El nombre no puede estar vacío'
        },
        len: {
          args: [1, 255],
          msg: 'El nombre debe tener entre 1 y 255 caracteres'
        }
      }
    },
    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'La cantidad no puede ser negativa'
        },
        isInt: {
          msg: 'La cantidad debe ser un número entero'
        }
      }
    },
    categoria: {
      type: DataTypes.ENUM('Faltantes', 'Bajo Pedido', 'Agotados con el Proveedor', 'Demasiadas Existencias', 'Realizado'),
      allowNull: false,
      defaultValue: 'Faltantes',
      validate: {
        isIn: {
          args: [['Faltantes', 'Bajo Pedido', 'Agotados con el Proveedor', 'Demasiadas Existencias', 'Realizado']],
          msg: 'La categoría debe ser una de las opciones válidas'
        }
      }
    },
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    hora: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: () => new Date().toLocaleTimeString()
    },
    usuario: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'El usuario no puede estar vacío'
        }
      }
    },
    precio_compra: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'El precio de compra no puede ser negativo'
        },
        isDecimal: {
          msg: 'El precio de compra debe ser un número válido'
        }
      },
    },
    importancia: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: {
          args: 1,
          msg: 'La importancia debe ser mínimo 1 estrella'
        },
        max: {
          args: 5,
          msg: 'La importancia debe ser máximo 5 estrellas'
        },
        isInt: {
          msg: 'La importancia debe ser un número entero'
        }
      }
    },
    proveedor: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'N/A',
      validate: {
        len: {
          args: [0, 255],
          msg: 'El proveedor no puede exceder 255 caracteres'
        }
      }
    },
    listo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    nota: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        isValidJSON(value) {
          if (value !== null && value !== undefined && value !== '') {
            try {
              // Si es un string que parece JSON, validarlo
              if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
                JSON.parse(value);
              }
            } catch (error) {
              // Si no es JSON válido, permitirlo como texto simple
              // No lanzar error para mantener compatibilidad
            }
          }
        }
      }
    },
    brand: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'N/A',
      validate: {
        len: {
          args: [0, 255],
          msg: 'La marca no puede exceder 255 caracteres'
        }
      }
    },
  }, {
    tableName: 'products',
    timestamps: true,
    hooks: {
      beforeCreate: (product, options) => {
        // Asegurar que la hora se establezca
        if (!product.hora) {
          product.hora = new Date().toLocaleTimeString();
        }

        // Limpiar espacios en blanco
        if (product.SKU) {
          product.SKU = product.SKU.trim();
        }
        if (product.nombre) {
          product.nombre = product.nombre.trim();
        }
        if (product.proveedor) {
          product.proveedor = product.proveedor.trim();
        }
        if (product.brand) {
          product.brand = product.brand.trim();
        }
      },
      beforeUpdate: (product, options) => {
        // Limpiar espacios en blanco al actualizar
        if (product.SKU) {
          product.SKU = product.SKU.trim();
        }
        if (product.nombre) {
          product.nombre = product.nombre.trim();
        }
        if (product.proveedor) {
          product.proveedor = product.proveedor.trim();
        }
        if (product.brand) {
          product.brand = product.brand.trim();
        }
      },
      afterCreate: async (product, options) => {
        // Registrar creación automáticamente en el historial
        try {
          const HistoryService = require('../services/historyService');
          await HistoryService.recordChange(
            product.id,
            'CREATE',
            null,
            product.toJSON(),
            { username: product.usuario }
          );
        } catch (error) {
          console.error('Error al registrar creación en historial:', error);
        }
      },
      afterUpdate: async (product, options) => {
        // Registrar actualización automáticamente en el historial
        try {
          const HistoryService = require('../services/historyService');
          
          // Obtener datos anteriores si están disponibles
          const previousData = product._previousDataValues || {};
          
          await HistoryService.recordChange(
            product.id,
            'UPDATE',
            previousData,
            product.toJSON(),
            { username: product.usuario },
            options.bulkOperationId // Para operaciones en lote
          );
        } catch (error) {
          console.error('Error al registrar actualización en historial:', error);
        }
      },
      afterDestroy: async (product, options) => {
        // Registrar eliminación automáticamente en el historial
        try {
          const HistoryService = require('../services/historyService');
          await HistoryService.recordChange(
            product.id,
            'DELETE',
            product.toJSON(),
            null,
            { username: product.usuario }
          );
        } catch (error) {
          console.error('Error al registrar eliminación en historial:', error);
        }
      }
    },
    indexes: [
      { fields: ['categoria'] },
      { fields: ['usuario'] },
      { fields: ['importancia'] },
      { fields: ['createdAt'] },
      { fields: ['SKU'] }, // Nuevo índice para búsquedas por SKU
      { fields: ['brand'] } // Nuevo índice para búsquedas por marca
    ]
  });

  // Método de instancia para verificar si el producto puede ser editado por un usuario
  Product.prototype.canBeEditedBy = function (userRole, username) {
    // Los admins pueden editar cualquier producto
    if (userRole === 'admin') {
      return true;
    }

    // Los usuarios normales no pueden editar productos "Realizados"
    if (this.categoria === 'Realizado') {
      return false;
    }

    // Los usuarios normales pueden editar productos que crearon
    return this.usuario === username;
  };

  // Método de instancia para verificar si el producto puede ser eliminado por un usuario
  Product.prototype.canBeDeletedBy = function (userRole, username) {
    // Solo los admins pueden eliminar productos
    return userRole === 'admin';
  };

  // Método de instancia para obtener información resumida del producto
  Product.prototype.getSummary = function () {
    return {
      id: this.id,
      SKU: this.SKU,
      nombre: this.nombre,
      categoria: this.categoria,
      importancia: this.importancia,
      cantidad: this.cantidad,
      usuario: this.usuario,
      fechaCreacion: this.createdAt,
      brand: this.brand,
      listo: this.listo
    };
  };

  // Método de instancia para obtener el historial del producto
  Product.prototype.getHistory = async function (limit = 10) {
    try {
      const HistoryService = require('../services/historyService');
      return await HistoryService.getProductHistory(this.id, limit);
    } catch (error) {
      console.error('Error al obtener historial:', error);
      return [];
    }
  };

  // Método de instancia para revertir a una versión anterior
  Product.prototype.revertToVersion = async function (historyId, username) {
    try {
      const HistoryService = require('../services/historyService');
      const ProductHistory = require('./ProductHistory');
      
      const historyRecord = await ProductHistory.findByPk(historyId);
      
      if (!historyRecord || historyRecord.productId !== this.id) {
        throw new Error('Registro de historial no encontrado o no corresponde a este producto');
      }

      if (!historyRecord.oldData) {
        throw new Error('No se puede revertir este tipo de cambio');
      }

      // Actualizar el producto con los datos antiguos
      await this.update(historyRecord.oldData);

      // Registrar la reversión en el historial
      await HistoryService.recordChange(
        this.id,
        'REVERT',
        this.toJSON(), // Estado actual antes de la reversión
        historyRecord.oldData, // Estado al que se revierte
        { username },
        `revert-${historyId}`
      );

      return this;
    } catch (error) {
      console.error('Error al revertir producto:', error);
      throw error;
    }
  };

  // Método estático para obtener estadísticas por categoría
  Product.getStatsByCategory = async function () {
    try {
      const stats = await this.findAll({
        attributes: [
          'categoria',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.cast(sequelize.fn('AVG', sequelize.col('importancia')), 'FLOAT'), 'avgImportance'],
          [sequelize.fn('SUM', sequelize.col('cantidad')), 'totalQuantity'],
          [sequelize.cast(sequelize.fn('AVG', sequelize.col('precio_compra')), 'FLOAT'), 'avgPrice'],
          [sequelize.fn('SUM', sequelize.literal('"precio_compra" * "cantidad"')), 'totalValue']
        ],
        group: ['categoria'],
        raw: true
      });

      console.log("📊 Stats generales:", stats);

      return stats.map(stat => ({
        categoria: stat.categoria,
        count: Number(stat.count) || 0,
        avgImportance: stat.avgImportance ? Number(stat.avgImportance).toFixed(2) : "0.00",
        totalQuantity: Number(stat.totalQuantity) || 0,
        avgPrice: stat.avgPrice ? Number(stat.avgPrice).toFixed(2) : "0.00",
        totalValue: stat.totalValue ? Number(stat.totalValue).toFixed(2) : "0.00"
      }));
    } catch (error) {
      throw new Error('Error al obtener estadísticas: ' + error.message);
    }
  };

  // Método estático para buscar productos por texto
  Product.search = async function (searchTerm, userRole = 'user') {
    const whereClause = {
      [sequelize.Op.or]: [
        { SKU: { [sequelize.Op.iLike]: `%${searchTerm}%` } },
        { nombre: { [sequelize.Op.iLike]: `%${searchTerm}%` } },
        { proveedor: { [sequelize.Op.iLike]: `%${searchTerm}%` } },
        { brand: { [sequelize.Op.iLike]: `%${searchTerm}%` } } // Nueva búsqueda por marca
      ]
    };

    // Si no es admin, excluir productos "Realizados"
    if (userRole !== 'admin') {
      whereClause.categoria = { [sequelize.Op.ne]: 'Realizado' };
    }

    return await this.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: 50
    });
  };

  // Método estático para obtener los últimos cambios
  Product.getRecentChanges = async function (limit = 10) {
    try {
      const HistoryService = require('../services/historyService');
      return await HistoryService.getLastChanges(limit);
    } catch (error) {
      console.error('Error al obtener cambios recientes:', error);
      return [];
    }
  };

  // Definir asociaciones (se llamará desde el archivo de asociaciones principal)
  Product.associate = function(models) {
    Product.hasMany(models.ProductHistory, {
      foreignKey: 'productId',
      as: 'history',
      onDelete: 'CASCADE'
    });
  };

  return Product;
};