const { ProductHistory } = require('../models');
const logger = require('../utils/logger');

class HistoryService {
  static async recordChange(productId, action, oldData, newData, user, bulkOperationId = null) {
    try {
      if (!productId) {
        logger.error('Error: productId es requerido para registrar historial');
        return null;
      }

      const changedFields = this.getChangedFields(oldData, newData);

      const history = await ProductHistory.create({
        productId,
        action,
        oldData: oldData || null,
        newData: newData || null,
        changedFields,
        userName: user?.username || user?.name || user || 'Sistema',
        bulkOperationId
      });

      return history;
    } catch (error) {
      logger.error('Error al registrar historial:', error);
      return null;
    }
  }

  static getChangedFields(oldData, newData) {
    const changed = {};

    if (!oldData && newData) {
      for (const key of Object.keys(newData || {})) {
        if (['id', 'createdAt', 'updatedAt'].includes(key)) continue;

        changed[key] = {
          old: null,
          new: newData[key]
        };
      }

      return changed;
    }

    if (oldData && !newData) {
      for (const key of Object.keys(oldData || {})) {
        if (['id', 'createdAt', 'updatedAt'].includes(key)) continue;

        changed[key] = {
          old: oldData[key],
          new: null
        };
      }

      return changed;
    }

    if (oldData && newData) {
      const allKeys = new Set([
        ...Object.keys(oldData || {}),
        ...Object.keys(newData || {})
      ]);

      for (const key of allKeys) {
        if (['id', 'createdAt', 'updatedAt'].includes(key)) continue;

        const oldValue = oldData[key];
        const newValue = newData[key];

        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          changed[key] = {
            old: oldValue,
            new: newValue
          };
        }
      }
    }

    return changed;
  }

  static async getProductHistory(productId, limit = 10) {
    return await ProductHistory.findAll({
      where: { productId },
      include: [
        {
          association: 'product',
          attributes: ['id', 'SKU', 'nombre'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit
    });
  }

  static async getLastChanges(limit = 20) {
    try {
      const rawHistory = await ProductHistory.findAll({
        include: [
          {
            association: 'product',
            attributes: ['id', 'SKU', 'nombre'],
            required: false
          }
        ],
        order: [['createdAt', 'DESC']],
        limit
      });

      const grouped = {};

      for (const record of rawHistory) {
        const plain = record.get({ plain: true });
        const key = plain.bulkOperationId || plain.id;

        if (!grouped[key]) {
          grouped[key] = {
            id: key,
            action: plain.action,
            userName: plain.userName || 'Sistema',
            createdAt: plain.createdAt,
            changedFields: plain.changedFields || {},
            isBulk: Boolean(plain.bulkOperationId),
            products: []
          };
        }

        if (plain.product) {
          grouped[key].products.push({
            id: plain.product.id,
            SKU: plain.product.SKU,
            nombre: plain.product.nombre
          });
        }
      }

      return Object.values(grouped).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    } catch (error) {
      logger.error('Error en getLastChanges:', error);
      throw error;
    }
  }

  static async revertChange(historyId, username) {
    try {
      const { Product } = require('../models');

      const record = await ProductHistory.findByPk(historyId);

      if (!record) {
        throw new Error('Registro de historial no encontrado.');
      }

      if (!record.oldData) {
        throw new Error('Este cambio no puede revertirse porque no hay datos anteriores.');
      }

      const product = await Product.findByPk(record.productId);

      if (!product) {
        throw new Error('El producto original ya no existe.');
      }

      const beforeRevert = product.toJSON();

      await product.update(record.oldData);

      await ProductHistory.create({
        productId: product.id,
        action: 'REVERT',
        oldData: beforeRevert,
        newData: record.oldData,
        changedFields: this.getChangedFields(beforeRevert, record.oldData),
        userName: username || 'Sistema',
        bulkOperationId: `revert-${historyId}`
      });

      return {
        success: true,
        product
      };
    } catch (error) {
      logger.error('Error al revertir cambio:', error);

      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = HistoryService;