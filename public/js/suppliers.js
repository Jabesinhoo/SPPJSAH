// ================== MODALES ==================
function openCreateModal() {
    document.getElementById('modalTitle').textContent = 'Crear Proveedor';
    document.getElementById('supplierForm').setAttribute('data-action', '/api/suppliers');
    document.getElementById('supplierForm').removeAttribute('data-method');
    document.getElementById('supplierForm').reset();
    document.getElementById('imagePreview').classList.add('hidden');
    document.getElementById('fileName').textContent = 'Ningún archivo seleccionado';
    clearErrorMessages();
    document.getElementById('supplierModal').classList.remove('hidden');
}

function openEditModal(id, marca, categoria, nombre, celular, tipoAsesor, nombreEmpresa, ciudad, nota, imagen, correo) {
    document.getElementById('modalTitle').textContent = 'Editar Proveedor';
    document.getElementById('supplierForm').setAttribute('data-action', `/api/suppliers/${id}`);
    document.getElementById('supplierForm').setAttribute('data-method', 'PUT');
    document.getElementById('marca').value = marca || '';
    document.getElementById('categoria').value = categoria;
    document.getElementById('nombre').value = nombre;
    document.getElementById('celular').value = celular;
    document.getElementById('tipoAsesor').value = tipoAsesor;
    document.getElementById('nombreEmpresa').value = nombreEmpresa || '';
    document.getElementById('ciudad').value = ciudad;
    document.getElementById('nota').value = nota || '';
    document.getElementById('correo').value = correo || '';

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
    document.querySelectorAll('.error-message').forEach(el => {
        el.classList.add('hidden');
        el.textContent = '';
    });
    document.querySelectorAll('input, select').forEach(el => {
        el.classList.remove('input-error');
    });
}

// ================== NOTIFICACIONES ==================
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg transition-opacity ${
        type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ================== FORMULARIO ==================
async function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const action = form.getAttribute('data-action');
    const method = form.getAttribute('data-method') || 'POST';
    const formData = new FormData(form);

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    try {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Procesando...';
        submitBtn.disabled = true;

        const response = await fetch(action, { method, body: formData, credentials: 'include' });
        const result = await response.json();

        if (response.ok && result.success) {
            showNotification(result.message, 'success');
            closeModal();
            setTimeout(() => window.location.reload(), 1500);
        } else {
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
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// ================== ELIMINAR ==================
async function handleDelete(e) {
    e.preventDefault();
    const form = e.target;
    const id = form.getAttribute('data-id');
    const deleteBtn = form.querySelector('button[type="submit"]');
    const originalText = deleteBtn.innerHTML;

    try {
        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Eliminando...';
        deleteBtn.disabled = true;

        const response = await fetch(`/api/suppliers/${id}`, { method: 'DELETE', credentials: 'include' });
        const result = await response.json();

        if (response.ok && result.success) {
            showNotification(result.message, 'success');
            closeDeleteModal();
            setTimeout(() => window.location.reload(), 1500);
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

// ================== BÚSQUEDA AJAX ==================
async function fetchSuppliers(query = '', category = '', city = '') {
    const tableBody = document.querySelector('tbody');
    try {
        const url = new URL('/api/suppliers', window.location.origin);
        if (query) url.searchParams.append('search', query);
        if (category) url.searchParams.append('category', category);
        if (city) url.searchParams.append('city', city);

        const res = await fetch(url, { credentials: 'include' });
        const result = await res.json();

        tableBody.innerHTML = '';

        if (result.success && result.data.length > 0) {
            result.data.forEach(s => {
                tableBody.innerHTML += `
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td class="px-6 py-4 whitespace-nowrap">
                    ${s.imagen
                        ? `<img src="${s.imagen}" class="h-10 w-10 rounded-full object-cover shadow">`
                        : `<div class="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center shadow">
                             <i class="fas fa-image text-gray-600 dark:text-gray-400"></i>
                           </div>`}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">${s.marca || ''}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">${s.categoria}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">${s.nombre}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">${s.celular}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">${s.correo || ''}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">${s.tipoAsesor}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">${s.nombreEmpresa || 'N/A'}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">${s.ciudad}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">${s.nota || ''}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button class="edit-btn text-blue-600 hover:text-blue-900 transition-colors flex items-center" 
                      data-id="${s.id}" data-nombre="${s.nombre}">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn text-red-600 hover:text-red-900 transition-colors" 
                      data-id="${s.id}" data-nombre="${s.nombre}">
                      <i class="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>`;
            });
        } else {
            tableBody.innerHTML = `
              <tr>
                <td colspan="10" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  No se encontraron asesores de marca.
                </td>
              </tr>`;
        }
    } catch (err) {
        console.error('Error en búsqueda dinámica:', err);
    }
}

// ================== EVENTOS ==================
document.addEventListener('DOMContentLoaded', () => {
    // Crear
    document.getElementById('openCreateBtn').addEventListener('click', openCreateModal);
    // Cerrar modales
    document.getElementById('closeModalIconBtn').addEventListener('click', closeModal);
    document.getElementById('cancelModalBtn').addEventListener('click', closeModal);
    document.getElementById('closeDeleteModalIconBtn').addEventListener('click', closeDeleteModal);
    document.getElementById('cancelDeleteModalBtn').addEventListener('click', closeDeleteModal);

    // Formularios
    document.getElementById('supplierForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('deleteForm').addEventListener('submit', handleDelete);

    // Delegación editar/eliminar
    document.body.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');
        if (editBtn) {
            const { id, marca, categoria, nombre, celular, tipoAsesor, nombreEmpresa, ciudad, nota, imagen, correo } = editBtn.dataset;
            openEditModal(id, marca, categoria, nombre, celular, tipoAsesor, nombreEmpresa, ciudad, nota, imagen, correo);
        }
        if (deleteBtn) {
            const { id, nombre } = deleteBtn.dataset;
            openDeleteModal(id, nombre);
        }
    });

    // Preview imagen
    document.getElementById('imagen').addEventListener('change', function (e) {
        const file = e.target.files[0];
        const fileNameElement = document.getElementById('fileName');
        if (file) {
            fileNameElement.textContent = file.name;
            const reader = new FileReader();
            reader.onload = e => {
                document.getElementById('imagePreview').classList.remove('hidden');
                document.getElementById('previewImage').src = e.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            fileNameElement.textContent = 'Ningún archivo seleccionado';
            document.getElementById('imagePreview').classList.add('hidden');
        }
    });

    // Validación celular
    document.getElementById('celular').addEventListener('input', function (e) {
        const value = e.target.value.replace(/\D/g, '');
        e.target.value = value.slice(0, 10);
        const errorElement = document.getElementById('celularError');
        if (e.target.value.length === 10 || e.target.value.length === 0) {
            errorElement.classList.add('hidden');
            e.target.classList.remove('input-error');
        } else {
            errorElement.textContent = 'El celular debe tener exactamente 10 dígitos';
            errorElement.classList.remove('hidden');
            e.target.classList.add('input-error');
        }
    });

    // Filtros dinámicos
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const cityFilter = document.getElementById('cityFilter');

    function applyFilters() {
        fetchSuppliers(searchInput.value, categoryFilter.value, cityFilter.value);
    }

    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
        searchInput.addEventListener('change', applyFilters); // 👈 fix móvil
    }
    if (categoryFilter) {
        categoryFilter.addEventListener('change', applyFilters);
    }
    if (cityFilter) {
        cityFilter.addEventListener('change', applyFilters);
    }

    // Cerrar modales clic fuera
    window.addEventListener('click', e => {
        if (e.target.id === 'supplierModal') closeModal();
        if (e.target.id === 'deleteModal') closeDeleteModal();
    });

    // Escape
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeModal();
            closeDeleteModal();
        }
    });
});
