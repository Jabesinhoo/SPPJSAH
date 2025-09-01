const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  // Tabla principal para las hojas de cálculo
  const Spreadsheet = sequelize.define('Spreadsheet', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    userUuid: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'uuid'   // 👈 debe coincidir con la PK de users
      }
    }
    ,
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'spreadsheets',
    timestamps: true
  });

  // Tabla para definir las columnas de cada hoja
  const SpreadsheetColumn = sequelize.define('SpreadsheetColumn', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    spreadsheetId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'spreadsheets',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
    },
    columnType: {
      type: DataTypes.ENUM('text', 'number', 'decimal', 'boolean', 'date', 'select', 'email', 'url'),
      allowNull: false,
      defaultValue: 'text'
    },
    isRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    defaultValue: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    selectOptions: {
      type: DataTypes.JSON, // Para almacenar opciones de select como array
      allowNull: true,
      validate: {
        isValidOptions(value) {
          if (this.columnType === 'select' && (!value || !Array.isArray(value))) {
            throw new Error('Las opciones de select deben ser un array válido');
          }
        }
      }
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    width: {
      type: DataTypes.INTEGER,
      defaultValue: 150
    }
  }, {
    tableName: 'spreadsheet_columns',
    timestamps: true
  });

  // Tabla para almacenar los datos de cada fila
  const SpreadsheetRow = sequelize.define('SpreadsheetRow', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    spreadsheetId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'spreadsheets',
        key: 'id'
      }
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    tableName: 'spreadsheet_rows',
    timestamps: true
  });

  // Tabla para almacenar los valores de cada celda
  const SpreadsheetCell = sequelize.define('SpreadsheetCell', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    rowId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'spreadsheet_rows',
        key: 'id'
      }
    },
    columnId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'spreadsheet_columns',
        key: 'id'
      }
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'spreadsheet_cells',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['rowId', 'columnId']
      }
    ]
  });

  // Definir asociaciones
  Spreadsheet.hasMany(SpreadsheetColumn, {
    foreignKey: 'spreadsheetId',
    as: 'columns',
    onDelete: 'CASCADE'
  });

  Spreadsheet.hasMany(SpreadsheetRow, {
    foreignKey: 'spreadsheetId',
    as: 'rows',
    onDelete: 'CASCADE'
  });

  SpreadsheetColumn.belongsTo(Spreadsheet, {
    foreignKey: 'spreadsheetId',
    as: 'spreadsheet'
  });

  SpreadsheetRow.belongsTo(Spreadsheet, {
    foreignKey: 'spreadsheetId',
    as: 'spreadsheet'
  });

  SpreadsheetRow.hasMany(SpreadsheetCell, {
    foreignKey: 'rowId',
    as: 'cells',
    onDelete: 'CASCADE'
  });

  SpreadsheetColumn.hasMany(SpreadsheetCell, {
    foreignKey: 'columnId',
    as: 'cells',
    onDelete: 'CASCADE'
  });

  SpreadsheetCell.belongsTo(SpreadsheetRow, {
    foreignKey: 'rowId',
    as: 'row'
  });

  SpreadsheetCell.belongsTo(SpreadsheetColumn, {
    foreignKey: 'columnId',
    as: 'column'
  });

  return {
    Spreadsheet,
    SpreadsheetColumn,
    SpreadsheetRow,
    SpreadsheetCell
  };
};