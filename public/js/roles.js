document.addEventListener('DOMContentLoaded', () => {
        const userListBody = document.getElementById('user-role-list');
        const createRoleModal = document.getElementById('create-role-modal');
        const createRoleBtn = document.getElementById('create-role-btn');
        const cancelCreateBtn = document.getElementById('cancel-create-btn');
        const createRoleForm = document.getElementById('create-role-form');

        // Fetch all users and roles from the API
        const fetchUsersAndRoles = async () => {
            try {
                const [usersRes, rolesRes] = await Promise.all([
                    fetch('/api/users'),
                    fetch('/api/roles')
                ]);
                
                if (!usersRes.ok || !rolesRes.ok) {
                    throw new Error(`HTTP error! users: ${usersRes.status}, roles: ${rolesRes.status}`);
                }
                
                const users = await usersRes.json();
                const roles = await rolesRes.json();
                
                renderUserList(users, roles);
            } catch (error) {
                console.error('Error fetching data:', error);
                alert('No se pudieron cargar los datos de usuarios y roles.');
            }
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
                        <select data-user-id="${user.uuid}" class="role-selector px-2 py-1 rounded-lg dark:bg-gray-700 dark:text-white">
                            ${roles.map(role => `
                                <option value="${role.uuid}" ${user.role && user.role.uuid === role.uuid ? 'selected' : ''}>
                                    ${role.name}
                                </option>
                            `).join('')}
                        </select>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button data-user-id="${user.uuid}" class="save-role-btn text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-600 transition duration-300">
                            Guardar
                        </button>
                    </td>
                `;
                userListBody.appendChild(row);
            });

            // Add event listeners for the "Save" buttons
            document.querySelectorAll('.save-role-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const userId = e.target.dataset.userId;
                    const roleSelector = document.querySelector(`.role-selector[data-user-id="${userId}"]`);
                    const newRoleUuid = roleSelector.value;
                    
                    try {
                        // ✅ CORRECCIÓN: Cambiar de /roles a /role (singular)
                        const res = await fetch(`/api/users/${userId}/role`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ roleUuid: newRoleUuid })
                        });

                        if (res.ok) {
                            alert('Rol actualizado con éxito.');
                            await fetchUsersAndRoles(); // Refresh the list
                        } else {
                            const errorData = await res.json();
                            alert(`Error al actualizar el rol: ${errorData.message || errorData.error}`);
                        }
                    } catch (error) {
                        console.error('Error saving role:', error);
                        alert('Error de conexión. Inténtalo de nuevo.');
                    }
                });
            });
        };

        // Modal functionality
        createRoleBtn.addEventListener('click', () => {
            createRoleModal.classList.remove('hidden');
            createRoleModal.classList.add('flex');
        });

        cancelCreateBtn.addEventListener('click', () => {
            createRoleModal.classList.remove('flex');
            createRoleModal.classList.add('hidden');
            createRoleForm.reset();
        });

        createRoleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const roleName = document.getElementById('role-name').value;
            try {
                const res = await fetch('/api/roles', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name: roleName })
                });

                if (res.ok) {
                    alert('Rol creado con éxito.');
                    createRoleModal.classList.remove('flex');
                    createRoleModal.classList.add('hidden');
                    createRoleForm.reset();
                    await fetchUsersAndRoles(); // Refresh the list
                } else {
                    const errorData = await res.json();
                    alert(`Error al crear el rol: ${errorData.error}`);
                }
            } catch (error) {
                console.error('Error creating role:', error);
                alert('Error de conexión. Inténtalo de nuevo.');
            }
        });

        // Initial fetch
        fetchUsersAndRoles();
    });