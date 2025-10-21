// services/historyService.js
const { ProductHistory } = require('../models');
const logger = require('../utils/logger');

class HistoryService {
    static async recordChange(productId, action, oldData, newData, user, bulkOperationId = null) {
        try {
            const changedFields = this.getChangedFields(oldData, newData);

            await ProductHistory.create({
                productId,
                action,
                oldData,
                newData,
                changedFields,
                userName: user?.username || user?.name || 'Sistema',
                bulkOperationId
            });


            logger.info(`Historial registrado: ${action} para producto ${productId}`);
        } catch (error) {
            logger.error('Error al registrar historial:', error);
        }
    }

    static getChangedFields(oldData, newData) {
        const changed = {};
        for (const key in newData) {
            if (oldData[key] !== newData[key]) {
                changed[key] = {
                    old: oldData[key],
                    new: newData[key]
                };
            }
        }
        return changed;
    }

    static async getProductHistory(productId, limit = 10) {
        return await ProductHistory.findAll({
            where: { productId },
            order: [['createdAt', 'DESC']],
            limit
        });
    }
    // services/historyService.js
    static async revertChange(historyId, username) {
        try {
            const { Product } = require('../models');

            const record = await ProductHistory.findByPk(historyId);

            if (!record) {
                throw new Error('Registro de historial no encontrado.');
            }

            if (!record.oldData) {
                throw new Error('Este cambio no puede revertirse (no hay datos anteriores).');
            }

            // Buscar el producto original
            const product = await Product.findByPk(record.productId);
            if (!product) {
                throw new Error('El producto original ya no existe.');
            }

            const beforeRevert = product.toJSON();

            // Actualizar el producto con los datos anteriores
            await product.update(record.oldData);

            // Registrar reversión en historial
            await ProductHistory.create({
                productId: product.id,
                action: 'REVERT',
                oldData: beforeRevert,
                newData: record.oldData,
                changedFields: this.getChangedFields(beforeRevert, record.oldData),
                userName: username || 'Sistema',
                bulkOperationId: `revert-${historyId}`,
            });

            return { success: true, product };
        } catch (error) {
            console.error('❌ Error al revertir cambio:', error);
            return { success: false, error: error.message };
        }
    }

    static async getLastChanges(limit = 20) {
        try {
            const { Product, User } = require('../models');

            // 🔹 Trae los últimos registros del historial
            const rawHistory = await ProductHistory.findAll({
                include: [
                    { model: Product, as: 'product', attributes: ['id', 'SKU', 'nombre'] },
                    { model: User, as: 'user', attributes: ['id', 'username'] }
                ],
                order: [['createdAt', 'DESC']],
                limit
            });

            // 🔹 Agrupa por bulkOperationId (si existe)
            const grouped = {};
            for (const record of rawHistory) {
                const key = record.bulkOperationId || record.id;
                if (!grouped[key]) {
                    grouped[key] = {
                        id: key,
                        action: record.action,
                        userName: record.userName || record.user?.username || 'Sistema',
                        createdAt: record.createdAt,
                        changedFields: record.changedFields || {},
                        isBulk: !!record.bulkOperationId,
                        products: []
                    };
                }

                if (record.product) {
                    grouped[key].products.push({
                        id: record.product.id,
                        SKU: record.product.SKU,
                        nombre: record.product.nombre
                    });
                }
            }

            // 🔹 Convierte a array y ordénalo por fecha descendente
            const groupedArray = Object.values(grouped).sort(
                (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            );

            return groupedArray;
        } catch (error) {
            console.error('❌ Error en getLastChanges:', error);
            return [];
        }
    }

    static async getLastChanges(limit = 3) {
        const { Product } = require('../models'); // 👈 mejor importar dentro del método
        return await ProductHistory.findAll({
            order: [['createdAt', 'DESC']],
            limit,
            include: [
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'SKU', 'nombre']
                }
            ]
        });
    }
}

module.exports = HistoryService; // 👈 ESTA LÍNEA ES LA CLAVE
