const { Op } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
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
      type: DataTypes.ENUM(
        'Faltantes',
        'Bajo Pedido',
        'Agotados con el Proveedor',
        'Demasiadas Existencias',
        'Realizado',
        'Descontinuado',
        'Reemplazado'
      ),
      allowNull: false,
      defaultValue: 'Faltantes',
      validate: {
        isIn: {
          args: [[
            'Faltantes',
            'Bajo Pedido',
            'Agotados con el Proveedor',
            'Demasiadas Existencias',
            'Realizado',
            'Descontinuado',
            'Reemplazado'
          ]],
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
      defaultValue: () => new Date().toTimeString().slice(0, 8)
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
      }
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
              if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
                JSON.parse(value);
              }
            } catch (error) {
              return true;
            }
          }

          return true;
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
    }
  }, {
    tableName: 'products',
    timestamps: true,

    hooks: {
      beforeCreate: (product) => {
        if (!product.hora) {
          product.hora = new Date().toTimeString().slice(0, 8);
        }

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

      beforeUpdate: (product) => {
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

      afterCreate: async (product) => {
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
        try {
          const HistoryService = require('../services/historyService');
          const previousData = product._previousDataValues || {};

          await HistoryService.recordChange(
            product.id,
            'UPDATE',
            previousData,
            product.toJSON(),
            { username: product.usuario },
            options.bulkOperationId
          );
        } catch (error) {
          console.error('Error al registrar actualización en historial:', error);
        }
      },

      afterDestroy: async (product) => {
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
      { fields: ['SKU'] },
      { fields: ['brand'] }
    ]
  });

  Product.prototype.canBeEditedBy = function (userRole, username) {
    if (userRole === 'admin') {
      return true;
    }

    if (this.categoria === 'Realizado') {
      return false;
    }

    return this.usuario === username;
  };

  Product.prototype.canBeDeletedBy = function (userRole) {
    return userRole === 'admin';
  };

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

  Product.prototype.getHistory = async function (limit = 10) {
    try {
      const HistoryService = require('../services/historyService');
      return await HistoryService.getProductHistory(this.id, limit);
    } catch (error) {
      console.error('Error al obtener historial:', error);
      return [];
    }
  };

  Product.prototype.revertToVersion = async function (historyId, username) {
    try {
      const HistoryService = require('../services/historyService');
      const { ProductHistory } = require('../models');

      const historyRecord = await ProductHistory.findByPk(historyId);

      if (!historyRecord || historyRecord.productId !== this.id) {
        throw new Error('Registro de historial no encontrado o no corresponde a este producto');
      }

      if (!historyRecord.oldData) {
        throw new Error('No se puede revertir este tipo de cambio');
      }

      const currentData = this.toJSON();

      await this.update(historyRecord.oldData);

      await HistoryService.recordChange(
        this.id,
        'REVERT',
        currentData,
        historyRecord.oldData,
        { username },
        `revert-${historyId}`
      );

      return this;
    } catch (error) {
      console.error('Error al revertir producto:', error);
      throw error;
    }
  };

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

      return stats.map(stat => ({
        categoria: stat.categoria,
        count: Number(stat.count) || 0,
        avgImportance: stat.avgImportance ? Number(stat.avgImportance).toFixed(2) : '0.00',
        totalQuantity: Number(stat.totalQuantity) || 0,
        avgPrice: stat.avgPrice ? Number(stat.avgPrice).toFixed(2) : '0.00',
        totalValue: stat.totalValue ? Number(stat.totalValue).toFixed(2) : '0.00'
      }));
    } catch (error) {
      throw new Error('Error al obtener estadísticas: ' + error.message);
    }
  };

  Product.search = async function (searchTerm, userRole = 'user') {
    const whereClause = {
      [Op.or]: [
        { SKU: { [Op.iLike]: `%${searchTerm}%` } },
        { nombre: { [Op.iLike]: `%${searchTerm}%` } },
        { proveedor: { [Op.iLike]: `%${searchTerm}%` } },
        { brand: { [Op.iLike]: `%${searchTerm}%` } }
      ]
    };

    if (userRole !== 'admin') {
      whereClause.categoria = { [Op.ne]: 'Realizado' };
    }

    return await this.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: 50
    });
  };

  Product.getRecentChanges = async function (limit = 10) {
    try {
      const HistoryService = require('../services/historyService');
      return await HistoryService.getLastChanges(limit);
    } catch (error) {
      console.error('Error al obtener cambios recientes:', error);
      return [];
    }
  };

  Product.associate = function (models) {
    Product.hasMany(models.ProductHistory, {
      foreignKey: 'productId',
      as: 'history',
      onDelete: 'CASCADE'
    });
  };

  return Product;
};