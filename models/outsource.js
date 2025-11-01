'use strict';
module.exports = (sequelize, DataTypes) => {
  const Outsource = sequelize.define('Outsource', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nombre_tecnico: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    telefono: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cc: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true,
    },
    sku: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      defaultValue: 1, // se actualizará automáticamente en la migración o hook
    },
    tipo_servicio: {
      type: DataTypes.ARRAY(DataTypes.STRING), // permite múltiples servicios
      allowNull: false,
    }
  }, {
    tableName: 'outsources',
    timestamps: true,
    hooks: {
      // Generar SKU consecutivo
      beforeCreate: async (outsource, options) => {
        const lastOut = await sequelize.models.Outsource.findOne({
          order: [['sku', 'DESC']]
        });
        outsource.sku = lastOut ? lastOut.sku + 1 : 1;
      }
    }
  });

  return Outsource;
};
