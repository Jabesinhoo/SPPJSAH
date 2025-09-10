// public/js/userApproval.js
document.addEventListener('DOMContentLoaded', function() {
    // Variables para modales
    const confirmationModal = document.getElementById('confirmation-modal');
    const resultModal = document.getElementById('result-modal');
    const noUsersMessage = document.getElementById('no-pending-users');
    
    // Verificar que los elementos existen antes de usarlos
    if (!confirmationModal || !resultModal || !noUsersMessage) {
        return;
    }

    let currentAction = null;
    let currentUserUuid = null;

    // Configurar event listeners para modales
    const modalCancel = document.getElementById('modal-cancel');
    const modalConfirm = document.getElementById('modal-confirm');
    const resultClose = document.getElementById('result-close');

    if (modalCancel) modalCancel.addEventListener('click', () => {
        confirmationModal.classList.add('hidden');
    });

    if (modalConfirm) modalConfirm.addEventListener('click', () => {
        confirmationModal.classList.add('hidden');
        executeCurrentAction();
    });

    if (resultClose) resultClose.addEventListener('click', () => {
        resultModal.classList.add('hidden');
    });

    // Cerrar modales al hacer clic fuera
    confirmationModal.addEventListener('click', (e) => {
        if (e.target === confirmationModal) {
            confirmationModal.classList.add('hidden');
        }
    });

    resultModal.addEventListener('click', (e) => {
        if (e.target === resultModal) {
            resultModal.classList.add('hidden');
        }
    });

    // Función para mostrar modal de confirmación
    function showConfirmationModal(action, userUuid, username) {
        currentAction = action;
        currentUserUuid = userUuid;

        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        const confirmButton = document.getElementById('modal-confirm');

        if (modalTitle && modalMessage && confirmButton) {
            if (action === 'approve') {
                modalTitle.textContent = 'Aprobar Usuario';
                modalMessage.textContent = `¿Estás seguro de que deseas aprobar al usuario "${username}"? Este usuario podrá acceder al sistema.`;
                confirmButton.textContent = 'Aprobar';
                confirmButton.className = 'px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition';
            } else {
                modalTitle.textContent = 'Rechazar Usuario';
                modalMessage.textContent = `¿Estás seguro de que deseas rechazar al usuario "${username}"? El usuario se mantendrá en el sistema pero no podrá acceder.`;
                confirmButton.textContent = 'Rechazar';
                confirmButton.className = 'px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition';
            }

            confirmationModal.classList.remove('hidden');
        }
    }

    // Función para ejecutar la acción confirmada
    function executeCurrentAction() {
        if (currentAction === 'approve') {
            approveUser(currentUserUuid);
        } else {
            rejectUser(currentUserUuid);
        }
    }

    // Función para mostrar modal de resultado
    function showResultModal(success, title, message) {
        const resultIcon = document.getElementById('result-icon');
        const resultTitle = document.getElementById('result-title');
        const resultMessage = document.getElementById('result-message');

        if (resultIcon && resultTitle && resultMessage) {
            if (success) {
                resultIcon.innerHTML = `
                    <svg class="h-12 w-12 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                `;
            } else {
                resultIcon.innerHTML = `
                    <svg class="h-12 w-12 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                `;
            }

            resultTitle.textContent = title;
            resultMessage.textContent = message;
            resultModal.classList.remove('hidden');
        }
    }

    // Función para cargar usuarios pendientes
    function loadPendingUsers() {
        fetch('/api/users/pending', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(users => {
            const container = document.getElementById('pending-users-list');
            
            if (!container || !noUsersMessage) {
                console.error('Error: Elementos del DOM no encontrados');
                return;
            }
            
            // Verificar que users sea un array
            if (!Array.isArray(users)) {
                console.error('La respuesta no es un array:', users);
                noUsersMessage.textContent = 'Error al cargar usuarios. Formato de respuesta inválido.';
                noUsersMessage.classList.remove('hidden');
                container.innerHTML = '';
                return;
            }
            
            if (users.length === 0) {
                noUsersMessage.classList.remove('hidden');
                container.innerHTML = '';
                return;
            }
            
            noUsersMessage.classList.add('hidden');
            container.innerHTML = '';
            
            users.forEach(user => {
                const userCard = document.createElement('div');
                userCard.className = 'bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow';
                userCard.innerHTML = `
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 class="font-semibold text-gray-900 dark:text-gray-100">${user.username}</h3>
                            <p class="text-sm text-gray-600 dark:text-gray-400">${user.email || 'Sin email'}</p>
                            <p class="text-xs text-gray-500 dark:text-gray-500">Registrado: ${new Date(user.createdAt).toLocaleDateString()}</p>
                            <p class="text-xs text-gray-500 dark:text-gray-500">Rol: ${user.roles?.name || 'Sin asignar'}</p>
                        </div>
                        <div class="flex flex-col sm:flex-row gap-2">
                            <button onclick="showApproveConfirmation('${user.uuid}', '${user.username.replace(/'/g, "\\'")}')" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                                Aprobar
                            </button>
                            <button onclick="showRejectConfirmation('${user.uuid}', '${user.username.replace(/'/g, "\\'")}')" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                                Rechazar
                            </button>
                        </div>
                    </div>
                `;
                container.appendChild(userCard);
            });
        })
        .catch(error => {
            console.error('Error loading pending users:', error);
            if (noUsersMessage) {
                noUsersMessage.textContent = `Error al cargar usuarios: ${error.message}`;
                noUsersMessage.classList.remove('hidden');
            }
        });
    }
    
    // Funciones globales para los botones
    window.showApproveConfirmation = function(userUuid, username) {
        showConfirmationModal('approve', userUuid, username);
    };
    
    window.showRejectConfirmation = function(userUuid, username) {
        showConfirmationModal('reject', userUuid, username);
    };
    
    // Función para aprobar usuario
    function approveUser(userUuid) {
        fetch(`/api/users/${userUuid}/approve`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.message) {
                showResultModal(true, '¡Éxito!', 'Usuario aprobado correctamente.');
                loadPendingUsers();
            } else {
                showResultModal(false, 'Error', data.error || 'Error desconocido al aprobar usuario.');
            }
        })
        .catch(error => {
            console.error('Error approving user:', error);
            showResultModal(false, 'Error', 'Error al aprobar usuario: ' + error.message);
        });
    }
    
    // Función para rechazar usuario
    function rejectUser(userUuid) {
        fetch(`/api/users/${userUuid}/reject`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.message) {
                showResultModal(true, '¡Éxito!', 'Usuario rechazado correctamente.');
                loadPendingUsers();
            } else {
                showResultModal(false, 'Error', data.error || 'Error desconocido al rechazar usuario.');
            }
        })
        .catch(error => {
            console.error('Error rejecting user:', error);
            showResultModal(false, 'Error', 'Error al rechazar usuario: ' + error.message);
        });
    }
    
    // Cargar usuarios al iniciar
    loadPendingUsers();
});