// public/js/userManagement.js
document.addEventListener('DOMContentLoaded', () => {
    const loadUserManagement = async () => {
        try {
            const [usersRes, statsRes] = await Promise.all([
                fetch('/api/users/management'),
                fetch('/api/users/stats/summary')
            ]);

            const users = await usersRes.json();
            const stats = await statsRes.json();

            renderUserStats(stats);
            renderUserManagementList(users);
        } catch (error) {
            console.error('Error loading user management:', error);
        }
    };

    const renderUserStats = (stats) => {
        const statsDiv = document.getElementById('user-stats');
        statsDiv.innerHTML = `
            <p>Total usuarios: <strong>${stats.totalUsers}</strong></p>
            ${stats.byRole.map(role => `
                <p>${role.role}: <strong>${role.count}</strong></p>
            `).join('')}
        `;
    };

    const renderUserManagementList = (users) => {
        const tbody = document.getElementById('user-management-list');
        tbody.innerHTML = users.map(user => `
            <tr class="border-b dark:border-gray-700">
                <td class="px-6 py-4">${user.username}</td>
                <td class="px-6 py-4">${user.role ? user.role.name : 'Sin rol'}</td>
                <td class="px-6 py-4">${new Date(user.createdAt).toLocaleDateString()}</td>
                <td class="px-6 py-4">
                    <button onclick="changePassword('${user.uuid}')" class="text-blue-600 hover:text-blue-800">
                        Cambiar Contraseña
                    </button>
                    <button onclick="changeRole('${user.uuid}')" class="text-green-600 hover:text-green-800 ml-2">
                        Cambiar Rol
                    </button>
                </td>
            </tr>
        `).join('');
    };

    loadUserManagement();
});

// Funciones globales para los botones
window.changePassword = async (userId) => {
    const newPassword = prompt('Ingrese la nueva contraseña:');
    if (newPassword) {
        try {
            const res = await fetch(`/api/users/${userId}/password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword })
            });
            
            if (res.ok) {
                alert('Contraseña cambiada exitosamente');
            } else {
                alert('Error al cambiar contraseña');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error de conexión');
        }
    }
};

window.changeRole = async (userId) => {
    // Aquí implementarías el modal para cambiar roles
    alert(`Cambiar rol del usuario: ${userId}`);
};