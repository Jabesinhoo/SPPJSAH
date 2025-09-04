// scripts/createAdmin.js - Versión corregida
const { sequelize, User, Role } = require('./models');
const logger = require('./utils/logger');
const bcrypt = require('bcrypt');

async function createAdminUser() {
    const username = 'admin'; // Reemplaza con tu usuario admin
    const password = 'admin';  // Reemplaza con tu contraseña admin

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

        // Buscar o crear el usuario admin
        const [user, created] = await User.findOrCreate({
            where: {
                username: username
            },
            defaults: {
                password: password, 
                roleUuid: adminRole.uuid,
                isApproved: true // ✅ Asegurar que esté aprobado
            },
        });

        if (created) {
            logger.info(`✅ Superusuario '${username}' creado con éxito.`);
        } else {
            // ✅ Si el usuario ya existe, ACTUALIZARLO para asegurar que esté aprobado
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            
            await user.update({
                password: hashedPassword,
                roleUuid: adminRole.uuid,
                isApproved: true // ✅ Forzar aprobación
            });
            
            logger.info(`✅ Superusuario '${username}' actualizado y aprobado con éxito.`);
        }

    } catch (error) {
        logger.error('❌ Error al crear/actualizar el superusuario:', error);
    } finally {
        await sequelize.close();
    }
}

createAdminUser();