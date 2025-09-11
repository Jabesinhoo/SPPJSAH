'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
  DO $$ 
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name='users' AND column_name='profilePicture'
    ) THEN
      ALTER TABLE "users" ADD COLUMN "profilePicture" VARCHAR;
    END IF;
  END;
  $$;
`);

  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'profilePicture');
  }
};
