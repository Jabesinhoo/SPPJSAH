// scripts/fix-notifications.js
const { sequelize } = require('./models');
const { QueryTypes } = require('sequelize');

async function fixNotificationsTable() {
  try {
    console.log('🔍 Verificando estructura de la tabla notifications...');

    // Verificar si la tabla existe
    const tableExists = await sequelize.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications')",
      { type: QueryTypes.SELECT }
    );

    if (!tableExists[0].exists) {
      console.log('❌ La tabla notifications no existe. Ejecuta la migración primero.');
      return;
    }

    // Verificar columnas
    const columns = await sequelize.query(
      `SELECT column_name, data_type, is_nullable 
       FROM information_schema.columns 
       WHERE table_name = 'notifications' 
       ORDER BY ordinal_position`,
      { type: QueryTypes.SELECT }
    );

    console.log('📋 Columnas actuales:');
    columns.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}, ${col.is_nullable})`);
    });

    // Verificar si user_id existe
    const hasUserId = columns.some(col => col.column_name === 'user_id');
    const hasRecipientId = columns.some(col => col.column_name === 'recipient_id');

    if (!hasUserId && hasRecipientId) {
      console.log('🔄 Renombrando recipient_id a user_id...');
      await sequelize.query(`
        ALTER TABLE notifications 
        RENAME COLUMN recipient_id TO user_id
      `);
    }

    console.log('✅ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

fixNotificationsTable();