'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('suppliers', 'tipoAsesor', {
      type: Sequelize.ENUM(
        'Representante de Fabrica',
        'Mayorista',
        'Asesor general Mayorista',
        'Subdistribuidores',
        'Minorista',
        'Distribuidor',
        'Especialista de Marca'
      ),
      allowNull: false,
      defaultValue: 'Asesor general Mayorista'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('suppliers', 'tipoAsesor', {
      type: Sequelize.ENUM(
        'Representante de Fabrica',
        'Mayorista',
        'Asesor general Mayorista'
      ),
      allowNull: false,
      defaultValue: 'Asesor general Mayorista'
    });
  }
};
