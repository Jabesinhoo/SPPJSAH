// scripts/approveAllUsers.js
const { sequelize, User } = require('./models');

async function approveAllUsers() {
    try {
        await sequelize.sync();
        
        const result = await User.update(
            { isApproved: true },
            { where: {} }
        );
        
    } catch (error) {
    } finally {
        await sequelize.close();
    }
}

approveAllUsers();