    
document.addEventListener('DOMContentLoaded', function() {
    // Sistema de pestañas
    const tabs = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Desactivar todas las pestañas
            tabs.forEach(t => t.classList.remove('bg-indigo-100', 'dark:bg-indigo-900', 'text-indigo-700', 'dark:text-indigo-300', 'font-medium'));
            tabs.forEach(t => t.classList.add('text-gray-700', 'dark:text-gray-300', 'hover:bg-gray-100', 'dark:hover:bg-gray-700'));
            
            // Activar pestaña actual
            this.classList.remove('text-gray-700', 'dark:text-gray-300', 'hover:bg-gray-100', 'dark:hover:bg-gray-700');
            this.classList.add('bg-indigo-100', 'dark:bg-indigo-900', 'text-indigo-700', 'dark:text-indigo-300', 'font-medium');
            
            // Ocultar todos los contenidos
            tabContents.forEach(content => content.classList.add('hidden'));
            
            // Mostrar contenido correspondiente
            const contentId = this.id.replace('tab-', '') + '-section';
            document.getElementById(contentId).classList.remove('hidden');
        });
    });
    
    // Cambiar contraseña
    const passwordForm = document.getElementById('password-form');
    const passwordMessage = document.getElementById('password-message');
    
    passwordForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        if (newPassword !== confirmPassword) {
            showMessage(passwordMessage, 'Las contraseñas no coinciden.', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/settings/password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showMessage(passwordMessage, data.message, 'success');
                passwordForm.reset();
            } else {
                showMessage(passwordMessage, data.error, 'error');
            }
        } catch (error) {
            showMessage(passwordMessage, 'Error al cambiar la contraseña.', 'error');
        }
    });
    
    // Cambiar nombre de usuario
    const usernameForm = document.getElementById('username-form');
    const usernameMessage = document.getElementById('username-message');
    
    usernameForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const newUsername = document.getElementById('new-username').value;
        
        try {
            const response = await fetch('/api/settings/username', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ newUsername })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showMessage(usernameMessage, data.message, 'success');
                document.getElementById('current-username').value = data.newUsername;
                usernameForm.reset();
            } else {
                showMessage(usernameMessage, data.error, 'error');
            }
        } catch (error) {
            showMessage(usernameMessage, 'Error al cambiar el nombre de usuario.', 'error');
        }
    });
    
    // Subir foto de perfil
    const profileUpload = document.getElementById('profile-picture-upload');
    const profileMessage = document.getElementById('profile-message');
    const profilePicture = document.getElementById('profile-picture');
    const removeProfileButton = document.getElementById('remove-profile-picture');
    
    profileUpload.addEventListener('change', async function(e) {
        if (!this.files || this.files.length === 0) return;
        
        const formData = new FormData();
        formData.append('profilePicture', this.files[0]);
        
        try {
            const response = await fetch('/api/settings/profile-picture', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showMessage(profileMessage, data.message, 'success');
                profilePicture.src = data.profilePicture;
            } else {
                showMessage(profileMessage, data.error, 'error');
            }
        } catch (error) {
            showMessage(profileMessage, 'Error al subir la imagen.', 'error');
        }
        
        this.value = ''; // Resetear input
    });
    
    // Eliminar foto de perfil
    removeProfileButton.addEventListener('click', async function() {
        try {
            const response = await fetch('/api/settings/profile-picture', {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showMessage(profileMessage, data.message, 'success');
                profilePicture.src = '/img/user.png';
            } else {
                showMessage(profileMessage, data.error, 'error');
            }
        } catch (error) {
            showMessage(profileMessage, 'Error al eliminar la imagen.', 'error');
        }
    });
    
    // Función para mostrar mensajes
    function showMessage(element, message, type) {
        element.textContent = message;
        element.classList.remove('hidden', 'bg-green-100', 'text-green-700', 'bg-red-100', 'text-red-700');
        
        if (type === 'success') {
            element.classList.add('bg-green-100', 'text-green-700');
        } else {
            element.classList.add('bg-red-100', 'text-red-700');
        }
        
        element.classList.remove('hidden');
        
        // Ocultar mensaje después de 5 segundos
        setTimeout(() => {
            element.classList.add('hidden');
        }, 5000);
    }
});

