const { sequelize, User, Role, Supplier } = require('./models');
const logger = require('./utils/logger');

async function createAdminUser() {
    const username = 'xxxx';
    const password = 'xxx'; 

    try {
        await sequelize.sync();
        const adminRole = await Role.findOne({
            where: {
                name: 'admin'
            }
        });

        if (!adminRole) {
            logger.error('❌ Error: El rol "admin" no existe. Por favor, asegúrate de que app.js lo haya creado.');
            return;
        }

        const [user, created] = await User.findOrCreate({
            where: {
                username: username
            },
            defaults: {
                password: password, 
                roleUuid: adminRole.uuid,
            },
        });

        if (created) {
            logger.info(`✅ Superusuario '${username}' creado con éxito.`);
        } else {
            logger.info(`⚠️ El superusuario '${username}' ya existe. No se realizaron cambios.`);
        }

    } catch (error) {
        logger.error('❌ Error al crear el superusuario:', error);
    } finally {
        await sequelize.close();
    }
}

createAdminUser();