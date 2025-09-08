// Funciones para modales
function openCreateModal() {
    document.getElementById('modalTitle').textContent = 'Crear Proveedor';
    document.getElementById('supplierForm').setAttribute('data-action', '/api/suppliers');
    document.getElementById('supplierForm').reset();
    document.getElementById('imagePreview').classList.add('hidden');
    document.getElementById('fileName').textContent = 'Ningún archivo seleccionado';
    clearErrorMessages();
    document.getElementById('supplierModal').classList.remove('hidden');
}

function openEditModal(id, marca, categoria, nombre, celular, tipoAsesor, nombreEmpresa, ciudad, nota, imagen) {
    document.getElementById('modalTitle').textContent = 'Editar Proveedor';
    document.getElementById('supplierForm').setAttribute('data-action', `/api/suppliers/${id}`);
    document.getElementById('supplierForm').setAttribute('data-method', 'PUT');
    document.getElementById('marca').value = marca;
    document.getElementById('categoria').value = categoria;
    document.getElementById('nombre').value = nombre;
    document.getElementById('celular').value = celular;
    document.getElementById('tipoAsesor').value = tipoAsesor;
    document.getElementById('nombreEmpresa').value = nombreEmpresa || '';
    document.getElementById('ciudad').value = ciudad;
    document.getElementById('nota').value = nota || '';
    document.getElementById('fileName').textContent = imagen ? 'Imagen actual' : 'Ningún archivo seleccionado';
    clearErrorMessages();

    if (imagen) {
        document.getElementById('imagePreview').classList.remove('hidden');
        document.getElementById('previewImage').src = imagen;
    } else {
        document.getElementById('imagePreview').classList.add('hidden');
    }

    document.getElementById('supplierModal').classList.remove('hidden');
}

function openDeleteModal(id, nombre) {
    document.getElementById('deleteSupplierName').textContent = nombre;
    document.getElementById('deleteForm').setAttribute('data-id', id);
    document.getElementById('deleteModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('supplierModal').classList.add('hidden');
    document.getElementById('supplierForm').removeAttribute('data-action');
    document.getElementById('supplierForm').removeAttribute('data-method');
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.add('hidden');
    document.getElementById('deleteForm').removeAttribute('data-id');
}

function clearErrorMessages() {
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(el => {
        el.classList.add('hidden');
        el.textContent = '';
    });
    
    const inputElements = document.querySelectorAll('input, select');
    inputElements.forEach(el => {
        el.classList.remove('input-error');
    });
}

// Función para mostrar notificaciones
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg transition-opacity ${
        type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Función para manejar el envío del formulario
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const action = form.getAttribute('data-action');
    const method = form.getAttribute('data-method') || 'POST';
    const formData = new FormData(form);
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    try {
        // Mostrar loading
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Procesando...';
        submitBtn.disabled = true;
        
        const response = await fetch(action, {
            method: method,
            body: formData,
            credentials: 'include',
            headers: {
                // No necesitamos Content-Type para FormData, el navegador lo setea automáticamente
            }
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showNotification(result.message, 'success');
            closeModal();
            
            // Esperar un momento antes de recargar para que se vea la notificación
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            // Mostrar errores de validación
            if (result.errors) {
                result.errors.forEach(error => {
                    const field = error.path;
                    const errorElement = document.getElementById(`${field}Error`);
                    if (errorElement) {
                        errorElement.textContent = error.msg;
                        errorElement.classList.remove('hidden');
                        document.getElementById(field)?.classList.add('input-error');
                    }
                });
                showNotification('Por favor corrige los errores del formulario', 'error');
            } else {
                showNotification(result.error || 'Error desconocido', 'error');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error de conexión. Intenta nuevamente.', 'error');
    } finally {
        // Restaurar botón
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Función para manejar la eliminación
async function handleDelete(e) {
    e.preventDefault();
    
    const form = e.target;
    const id = form.getAttribute('data-id');
    const deleteBtn = form.querySelector('button[type="submit"]');
    const originalText = deleteBtn.innerHTML;
    
    try {
        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Eliminando...';
        deleteBtn.disabled = true;
        
        const response = await fetch(`/api/suppliers/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showNotification(result.message, 'success');
            closeDeleteModal();
            
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showNotification(result.error || 'Error al eliminar', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error de conexión. Intenta nuevamente.', 'error');
    } finally {
        deleteBtn.innerHTML = originalText;
        deleteBtn.disabled = false;
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Abrir modal de crear
    document.getElementById('openCreateBtn').addEventListener('click', openCreateModal);

    // Cerrar modal de crear/editar
    document.getElementById('closeModalIconBtn').addEventListener('click', closeModal);
    document.getElementById('cancelModalBtn').addEventListener('click', closeModal);

    // Cerrar modal de eliminar
    document.getElementById('closeDeleteModalIconBtn').addEventListener('click', closeDeleteModal);
    document.getElementById('cancelDeleteModalBtn').addEventListener('click', closeDeleteModal);
    
    // Manejar envío de formulario
    document.getElementById('supplierForm').addEventListener('submit', handleFormSubmit);
    
    // Manejar eliminación
    document.getElementById('deleteForm').addEventListener('submit', handleDelete);
    
    // Delegación de eventos para los botones de editar y eliminar
    document.body.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (editBtn) {
            const { id, marca, categoria, nombre, celular, tipoAsesor, nombreEmpresa, ciudad, nota, imagen } = editBtn.dataset;
            openEditModal(id, marca, categoria, nombre, celular, tipoAsesor, nombreEmpresa, ciudad, nota, imagen);
        }

        if (deleteBtn) {
            const { id, nombre } = deleteBtn.dataset;
            openDeleteModal(id, nombre);
        }
    });

    // Preview de imagen
    document.getElementById('imagen').addEventListener('change', function (e) {
        const file = e.target.files[0];
        const fileNameElement = document.getElementById('fileName');
        
        if (file) {
            fileNameElement.textContent = file.name;
            
            const reader = new FileReader();
            reader.onload = function (e) {
                document.getElementById('imagePreview').classList.remove('hidden');
                document.getElementById('previewImage').src = e.target.result;
            }
            reader.readAsDataURL(file);
        } else {
            fileNameElement.textContent = 'Ningún archivo seleccionado';
            document.getElementById('imagePreview').classList.add('hidden');
        }
    });

    // Validación en tiempo real para el campo celular
    document.getElementById('celular').addEventListener('input', function(e) {
        const value = e.target.value;
        const errorElement = document.getElementById('celularError');
        
        // Solo permitir números
        e.target.value = value.replace(/\D/g, '');
        
        // Validar longitud
        if (e.target.value.length > 10) {
            e.target.value = e.target.value.slice(0, 10);
        }
        
        // Mostrar error si no tiene 10 dígitos
        if (e.target.value.length === 10 || e.target.value.length === 0) {
            errorElement.classList.add('hidden');
            e.target.classList.remove('input-error');
        } else {
            errorElement.textContent = 'El celular debe tener exactamente 10 dígitos';
            errorElement.classList.remove('hidden');
            e.target.classList.add('input-error');
        }
    });

    // Cerrar modales al hacer clic fuera
    window.addEventListener('click', function (e) {
        if (e.target.id === 'supplierModal') closeModal();
        if (e.target.id === 'deleteModal') closeDeleteModal();
    });

    // Cerrar modales con la tecla Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
            closeDeleteModal();
        }
    });
});