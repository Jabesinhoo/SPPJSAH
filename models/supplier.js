// models/supplier.js - Corregido
module.exports = (sequelize, DataTypes) => {
  const Supplier = sequelize.define('Supplier', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    marca: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    categoria: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, 
      validate: {
        notEmpty: true
      }
    },
    celular: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'El número de celular es requerido'
        },
        is: {
          args: /^[0-9]{10}$/,
          msg: 'El celular debe tener exactamente 10 dígitos numéricos'
        }
      }
    },
correo: { 
      type: DataTypes.STRING,
      allowNull: true, // ✅ opcional
      validate: {
        isEmail: {
          msg: 'Debe ser un correo electrónico válido'
        }
      }
    },
    tipoAsesor: {
      type: DataTypes.ENUM('Representante de Fabrica', 'Mayorista', 'Asesor general Mayorista', 'Subdistribuidores','Minorista', 'Distribuidor', 'Especialista de Marca' ),
      allowNull: false,
      defaultValue: 'Asesor general Mayorista',
      validate: {
        notEmpty: true
      }
    },
    nombreEmpresa: {
      type: DataTypes.STRING,
      allowNull: true
    },
    nota: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    ciudad: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    imagen: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'suppliers',
    timestamps: true
  });

  return Supplier;
};