// createAdmin.js
const { sequelize, User, Role, Supplier } = require('./models');

async function createAdminUser() {
    const username = 'xxx';
    const password = 'xxx'; // No la encriptes aquí

    try {
        await sequelize.sync();
        const adminRole = await Role.findOne({
            where: {
                name: 'admin'
            }
        });

        if (!adminRole) {
            console.error('❌ Error: El rol "admin" no existe. Por favor, asegúrate de que app.js lo haya creado.');
            return;
        }

        const [user, created] = await User.findOrCreate({
            where: {
                username: username
            },
            defaults: {
                // Pasa la contraseña en texto plano, el hook se encargará de encriptarla
                password: password, 
                roleUuid: adminRole.uuid,
            },
        });

        if (created) {
            console.log(`✅ Superusuario '${username}' creado con éxito.`);
        } else {
            console.log(`⚠️ El superusuario '${username}' ya existe. No se realizaron cambios.`);
        }

    } catch (error) {
        console.error('❌ Error al crear el superusuario:', error);
    } finally {
        await sequelize.close();
    }
}

createAdminUser();