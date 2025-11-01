const { Outsource } = require('../models');

// =============== API JSON =================
exports.getAllOutsourceAPI = async (req, res) => {
  const outsources = await Outsource.findAll();
  res.json(outsources);
};

exports.createOutsourceAPI = async (req, res) => {
  try {
    const { nombre_tecnico, telefono, cc, tipo_servicio } = req.body;
    const tecnico = await Outsource.create({
      nombre_tecnico,
      telefono,
      cc,
      tipo_servicio: Array.isArray(tipo_servicio) ? tipo_servicio : [tipo_servicio],
    });
    res.status(201).json(tecnico);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateOutsourceAPI = async (req, res) => {
  try {
    const { id } = req.params;
    await Outsource.update(req.body, { where: { id } });
    res.json({ message: 'Outsource actualizado correctamente' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteOutsourceAPI = async (req, res) => {
  try {
    const { id } = req.params;
    await Outsource.destroy({ where: { id } });
    res.json({ message: 'Outsource eliminado correctamente' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// =============== VISTA EJS =================
exports.renderOutsourceView = async (req, res) => {
  const outsources = await Outsource.findAll();
  res.render('outsource', { outsources });
};
