// public/js/roles.js
document.addEventListener('DOMContentLoaded', () => {
    const userListBody = document.getElementById('user-role-list');
    const userStatsDiv = document.getElementById('user-stats');
    const changePasswordModal = document.getElementById('change-password-modal');
    const changePasswordForm = document.getElementById('change-password-form');
    const cancelPasswordBtn = document.getElementById('cancel-password-btn');

    // Variables para el modal de crear rol
    const createRoleModal = document.getElementById('create-role-modal');
    const createRoleBtn = document.getElementById('create-role-btn');
    const cancelCreateBtn = document.getElementById('cancel-create-btn');
    const createRoleForm = document.getElementById('create-role-form');

    // Abrir modal de crear rol
    createRoleBtn.addEventListener('click', () => {
        createRoleModal.classList.remove('hidden');
        createRoleModal.classList.add('flex');
    });

    // Cerrar modal de crear rol
    cancelCreateBtn.addEventListener('click', () => {
        createRoleModal.classList.remove('flex');
        createRoleModal.classList.add('hidden');
        createRoleForm.reset();
    });

    // Enviar formulario de crear rol
    createRoleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const roleName = document.getElementById('role-name').value.trim();

        if (!roleName) {
            alert('Por favor ingresa un nombre para el rol');
            return;
        }

        try {
            const res = await fetch('/api/roles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: roleName })
            });

            const data = await res.json();

            if (res.ok) {
                alert('Rol creado con éxito!');
                createRoleModal.classList.remove('flex');
                createRoleModal.classList.add('hidden');
                createRoleForm.reset();

                // Recargar la lista de roles y usuarios
                await fetchUsersAndRoles();
            } else {
                alert(`Error al crear el rol: ${data.error || 'Error desconocido'}`);
            }
        } catch (error) {
            console.error('Error creating role:', error);
            alert('Error de conexión. Inténtalo de nuevo.');
        }
    });

const fetchUsersAndRoles = async () => {
    try {
        const [usersRes, rolesRes, statsRes] = await Promise.all([
            fetch('/api/users/management'),
            fetch('/api/roles'),
            fetch('/api/users/stats/summary')
        ]);
        
        if (!usersRes.ok) throw new Error('Error fetching users');
        if (!rolesRes.ok) throw new Error('Error fetching roles');
        if (!statsRes.ok) throw new Error('Error fetching stats');
        
        const users = await usersRes.json();
        const roles = await rolesRes.json();
        const stats = await statsRes.json();
        
        renderUserStats(stats);
        renderUserList(users, roles);
    } catch (error) {
        console.error('Error fetching data:', error);
        alert('No se pudieron cargar los datos. Recargando...');
        setTimeout(() => location.reload(), 2000);
    }
};

    const renderUserStats = (stats) => {
        userStatsDiv.innerHTML = `
            <div class="text-center p-4 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <div class="text-2xl font-bold text-blue-800 dark:text-blue-200">${stats.totalUsers}</div>
                <div class="text-sm text-blue-600 dark:text-blue-300">Total Usuarios</div>
            </div>
            ${stats.byRole.map(role => `
                <div class="text-center p-4 bg-green-100 dark:bg-green-900 rounded-lg">
                    <div class="text-xl font-bold text-green-800 dark:text-green-200">${role.count}</div>
                    <div class="text-sm text-green-600 dark:text-green-300">${role.role}</div>
                </div>
            `).join('')}
        `;
    };

    const renderUserList = (users, roles) => {
        userListBody.innerHTML = '';
        users.forEach(user => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200';
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    ${user.username}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    ${user.role ? user.role.name : 'Sin rol'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    <select data-user-id="${user.uuid}" class="role-selector px-2 py-1 rounded-lg border dark:bg-gray-700 dark:text-white dark:border-gray-600">
                        ${roles.map(role => `
                            <option value="${role.uuid}" ${user.role && user.role.uuid === role.uuid ? 'selected' : ''}>
                                ${role.name}
                            </option>
                        `).join('')}
                    </select>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button data-user-id="${user.uuid}" class="save-role-btn text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition duration-300">
                        Guardar
                    </button>
                    <button onclick="openChangePasswordModal('${user.uuid}', '${user.username}')" class="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 transition duration-300">
                        Contraseña
                    </button>
                </td>
            `;
            userListBody.appendChild(row);
        });

        // Event listeners para botones de guardar
        document.querySelectorAll('.save-role-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const userId = e.target.dataset.userId;
                const roleSelector = document.querySelector(`.role-selector[data-user-id="${userId}"]`);
                const newRoleUuid = roleSelector.value;

                try {
                    const res = await fetch(`/api/users/${userId}/role`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ roleUuid: newRoleUuid })
                    });

                    if (res.ok) {
                        alert('Rol actualizado con éxito.');
                        await fetchUsersAndRoles();
                    } else {
                        const errorData = await res.json();
                        alert(`Error: ${errorData.message || errorData.error}`);
                    }
                } catch (error) {
                    console.error('Error saving role:', error);
                    alert('Error de conexión.');
                }
            });
        });
    };

    // Modal para cambiar contraseña
    window.openChangePasswordModal = (userId, username) => {
        document.getElementById('change-password-user-id').value = userId;
        document.querySelector('#change-password-modal h2').textContent = `Cambiar Contraseña - ${username}`;
        changePasswordModal.classList.remove('hidden');
        changePasswordModal.classList.add('flex');
    };

    cancelPasswordBtn.addEventListener('click', () => {
        changePasswordModal.classList.remove('flex');
        changePasswordModal.classList.add('hidden');
        changePasswordForm.reset();
    });

changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = document.getElementById('change-password-user-id').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (newPassword !== confirmPassword) {
        alert('Las contraseñas no coinciden.');
        return;
    }

    if (newPassword.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres.');
        return;
    }

    try {
        const res = await fetch(`/api/users/${userId}/password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newPassword })
        });

        const data = await res.json();

        if (res.ok) {
            alert('Contraseña cambiada con éxito!');
            changePasswordModal.classList.remove('flex');
            changePasswordModal.classList.add('hidden');
            changePasswordForm.reset();
        } else {
            alert(`Error: ${data.error || 'Error al cambiar contraseña'}`);
        }
    } catch (error) {
        console.error('Error changing password:', error);
        alert('Error de conexión. Inténtalo de nuevo.');
    }
});
    // Initial fetch
    fetchUsersAndRoles();
});