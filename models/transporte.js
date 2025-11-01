'use strict';
module.exports = (sequelize, DataTypes) => {
  const Transporte = sequelize.define('Transporte', {
    placa: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    nombre_conductor: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    telefono: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    tipo_vehiculo: {
      type: DataTypes.STRING,
      allowNull: false,
    }
  }, {
    tableName: 'transportes',
    timestamps: true,
  });

  return Transporte;
};
