import { History } from '../models/index.js';
import Product from '../models/product.js';
import User from '../models/user.js';

export const getRecentHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const history = await History.findAll({
      include: [
        { model: Product, as: 'product', attributes: ['id', 'SKU', 'nombre'] },
        { model: User, as: 'user', attributes: ['id', 'username'] }
      ],
      order: [['createdAt', 'DESC']],
      limit
    });

    res.json(history);
  } catch (error) {
    console.error('❌ Error obteniendo historial:', error);
    res.status(500).json({ error: 'Error al obtener el historial' });
  }
};
