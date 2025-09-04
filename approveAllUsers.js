// scripts/approveAllUsers.js
const { sequelize, User } = require('./models');

async function approveAllUsers() {
    try {
        await sequelize.sync();
        
        const result = await User.update(
            { isApproved: true },
            { where: {} }
        );
        
        console.log(`✅ ${result[0]} usuarios han sido aprobados.`);
    } catch (error) {
        console.error('❌ Error al aprobar usuarios:', error);
    } finally {
        await sequelize.close();
    }
}

approveAllUsers();