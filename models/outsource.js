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
      // ELIMINAR el defaultValue ya que ahora será manual
    },
    tipo_servicio: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
    }
  }, {
    tableName: 'outsources',
    timestamps: true,
    // ELIMINAR el hook completely
  });

  return Outsource;
};