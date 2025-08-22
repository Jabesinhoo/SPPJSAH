// models/product.js
module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,   // genera UUID v4 automáticamente
      primaryKey: true,
    },
    SKU: { type: DataTypes.STRING, allowNull: false, unique: true },
    nombre: { type: DataTypes.STRING, allowNull: false },
    cantidad: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    categoria: {
      type: DataTypes.ENUM('Realizado', 'Faltantes'),
      allowNull: false,
      defaultValue: 'Faltantes',
    },
    fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    hora: { type: DataTypes.STRING, allowNull: false },
    usuario: { type: DataTypes.STRING, allowNull: false },
    // models/product.js
    precio_compra: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      get() {
        const raw = this.getDataValue('precio_compra');
        return raw == null ? null : parseFloat(raw);
      }
    },

    importancia: { type: DataTypes.STRING },
    proveedor: { type: DataTypes.STRING },
    listo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    nota: { type: DataTypes.TEXT },
  }, {
    tableName: 'products',
    timestamps: true,
  });
  return Product;
};
