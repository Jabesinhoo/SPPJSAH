// models/product.js - Modelo actualizado con validaciones
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
          args: [0], // Cambiar a array
          msg: 'La cantidad no puede ser negativa'
        },
        isInt: {
          msg: 'La cantidad debe ser un número entero'
        }
      }
    },
    // models/product.js - Actualizar categorías
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
      type: DataTypes.DECIMAL(13, 2),
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
    // models/product.js - Agregar campo marca
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
      }
    },
    indexes: [
  { fields: ['categoria'] },
  { fields: ['usuario'] },
  { fields: ['importancia'] },
  { fields: ['createdAt'] }
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
      fechaCreacion: this.createdAt
    };
  };

  // Método estático para obtener estadísticas por categoría
  Product.getStatsByCategory = async function () {
    try {
      const stats = await this.findAll({
        attributes: [
          'categoria',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('AVG', sequelize.col('importancia')), 'avgImportance'],
          [sequelize.fn('SUM', sequelize.col('cantidad')), 'totalQuantity'],
          [sequelize.fn('AVG', sequelize.col('precio_compra')), 'avgPrice']
        ],
        group: ['categoria'],
        raw: true
      });

      console.log("📊 Stats generales:", stats); // <-- ver en producción


      return stats.map(stat => ({
        categoria: stat.categoria,
        count: Number(stat.count) || 0,
        avgImportance: stat.avgImportance ? Number(stat.avgImportance).toFixed(2) : "0.00",
        totalQuantity: Number(stat.totalQuantity) || 0,
        avgPrice: stat.avgPrice ? Number(stat.avgPrice).toFixed(2) : "0.00"
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
        { proveedor: { [sequelize.Op.iLike]: `%${searchTerm}%` } }
      ]
    };

    // Si no es admin, excluir productos "Realizados"
    if (userRole !== 'admin') {
      whereClause.categoria = { [sequelize.Op.ne]: 'Realizado' };
    }

    return await this.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: 50 // Limitar resultados para performance
    });
  };

  return Product;
};