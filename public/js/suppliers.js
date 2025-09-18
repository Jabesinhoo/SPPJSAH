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

// ================== NOTIFICACIONES ==================
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg transition-opacity ${type === 'success'
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

        const response = await fetch(action, {
            method: method,
            body: formData,
            credentials: 'include'
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showNotification(result.message, 'success');
            closeModal();

            setTimeout(() => {
                window.location.reload();
            }, 1500);
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

// ================== BÚSQUEDA AJAX ==================
async function fetchSuppliers(query = '', category = '', city = '') {
    // Buscar tanto en tabla desktop como móvil
    const desktopTableBody = document.querySelector('table tbody');
    const mobileContainer = document.querySelector('.bg-white.dark\\:bg-gray-800.rounded-lg.shadow.md\\:hidden');
    
    
    try {
        const url = new URL('/api/suppliers', window.location.origin);
        if (query) url.searchParams.append('search', query);
        if (category) url.searchParams.append('category', category);
        if (city) url.searchParams.append('city', city);


        const res = await fetch(url, { credentials: 'include' });
        const result = await res.json();


        if (result.success) {
            // Actualizar tabla desktop
            if (desktopTableBody) {
                desktopTableBody.innerHTML = '';

                if (result.data.length === 0) {
                    desktopTableBody.innerHTML = `
                        <tr>
                            <td colspan="11" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                No se encontraron asesores de marca.
                            </td>
                        </tr>`;
                } else {
                    result.data.forEach(s => {
                        const row = document.createElement('tr');
                        row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors';
                        row.innerHTML = `
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
                                    data-id="${s.id}" 
                                    data-marca="${s.marca || ''}"
                                    data-categoria="${s.categoria}"
                                    data-nombre="${s.nombre}"
                                    data-celular="${s.celular}"
                                    data-tipo-asesor="${s.tipoAsesor}"
                                    data-nombre-empresa="${s.nombreEmpresa || ''}"
                                    data-ciudad="${s.ciudad}"
                                    data-nota="${s.nota || ''}"
                                    data-imagen="${s.imagen || ''}"
                                    data-correo="${s.correo || ''}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="delete-btn text-red-600 hover:text-red-900 transition-colors ml-2" 
                                    data-id="${s.id}" data-nombre="${s.nombre}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        `;
                        desktopTableBody.appendChild(row);
                    });
                }
            }

            // Actualizar vista móvil - método más robusto
            if (mobileContainer) {
                // Limpiar todo el contenido del contenedor móvil
                mobileContainer.innerHTML = '';
                
                if (result.data.length === 0) {
                    console.log('Sin resultados, mostrando mensaje vacío');
                    const emptyDiv = document.createElement('div');
                    emptyDiv.className = 'p-4';
                    emptyDiv.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400">No se encontraron asesores de marca.</p>`;
                    mobileContainer.appendChild(emptyDiv);
                } else {
                    result.data.forEach((s, index) => {
                        const itemDiv = document.createElement('div');
                        // Añadir divider excepto para el último elemento
                        itemDiv.className = index < result.data.length - 1 
                            ? 'p-4 border-b border-gray-200 dark:border-gray-700'
                            : 'p-4';
                            
                        itemDiv.innerHTML = `
                            <div class="flex items-center mb-2">
                                ${s.imagen
                                    ? `<img src="${s.imagen}" alt="Imagen" class="h-12 w-12 rounded-full object-cover mr-4">`
                                    : `<div class="h-12 w-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center mr-4">
                                         <i class="fas fa-image text-gray-600 dark:text-gray-400"></i>
                                       </div>`}
                                <div>
                                    <p class="text-lg font-semibold text-gray-900 dark:text-white">${s.nombre}</p>
                                    <p class="text-sm text-gray-500 dark:text-gray-400">${s.marca || ''}</p>
                                </div>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400 mt-2">
                                <div><strong>Categoría:</strong> ${s.categoria}</div>
                                <div><strong>Celular:</strong> ${s.celular}</div>
                                <div><strong>Correo:</strong> ${s.correo || 'N/A'}</div>
                                <div><strong>Tipo Asesor:</strong> ${s.tipoAsesor}</div>
                                <div><strong>Empresa:</strong> ${s.nombreEmpresa || 'N/A'}</div>
                                <div><strong>Ciudad:</strong> ${s.ciudad}</div>
                                <div class="sm:col-span-2"><strong>Nota:</strong> ${s.nota || 'N/A'}</div>
                            </div>
                            <div class="flex justify-end mt-4 space-x-2">
                                <button class="edit-btn text-blue-600 hover:text-blue-900 transition-colors flex items-center" 
                                    data-id="${s.id}" 
                                    data-marca="${s.marca || ''}"
                                    data-categoria="${s.categoria}"
                                    data-nombre="${s.nombre}"
                                    data-celular="${s.celular}"
                                    data-tipo-asesor="${s.tipoAsesor}"
                                    data-nombre-empresa="${s.nombreEmpresa || ''}"
                                    data-ciudad="${s.ciudad}"
                                    data-nota="${s.nota || ''}"
                                    data-imagen="${s.imagen || ''}"
                                    data-correo="${s.correo || ''}">
                                    <i class="fas fa-edit mr-1"></i> Editar
                                </button>
                                <button class="delete-btn text-red-600 hover:text-red-900 transition-colors flex items-center"
                                    data-id="${s.id}" data-nombre="${s.nombre}">
                                    <i class="fas fa-trash mr-1"></i> Eliminar
                                </button>
                            </div>
                        `;
                        mobileContainer.appendChild(itemDiv);
                    });
                }
            } else {
            }
        } else {
            console.error('Error en la respuesta:', result);
        }
    } catch (err) {
        console.error('Error en búsqueda dinámica:', err);
        showNotification('Error al realizar la búsqueda', 'error');
    }
}
// ================== VARIABLES GLOBALES ==================
let searchTimeout;

// ================== EVENTOS ==================
document.addEventListener('DOMContentLoaded', () => {
    
    // Crear
    const openCreateBtn = document.getElementById('openCreateBtn');
    if (openCreateBtn) {
        openCreateBtn.addEventListener('click', openCreateModal);
    }

    // Cerrar modales
    const closeModalIconBtn = document.getElementById('closeModalIconBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const closeDeleteModalIconBtn = document.getElementById('closeDeleteModalIconBtn');
    const cancelDeleteModalBtn = document.getElementById('cancelDeleteModalBtn');

    if (closeModalIconBtn) closeModalIconBtn.addEventListener('click', closeModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);
    if (closeDeleteModalIconBtn) closeDeleteModalIconBtn.addEventListener('click', closeDeleteModal);
    if (cancelDeleteModalBtn) cancelDeleteModalBtn.addEventListener('click', closeDeleteModal);

    // Formularios
    const supplierForm = document.getElementById('supplierForm');
    const deleteForm = document.getElementById('deleteForm');
    
    if (supplierForm) {
        supplierForm.addEventListener('submit', handleFormSubmit);
    }
    if (deleteForm) {
        deleteForm.addEventListener('submit', handleDelete);
    }

    // Delegación de eventos editar/eliminar con mejor manejo
    document.body.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (editBtn) {
            e.preventDefault();
            e.stopPropagation();
            
            const dataset = editBtn.dataset;
            console.log('Edit button clicked:', dataset);
            
            openEditModal(
                dataset.id, 
                dataset.marca, 
                dataset.categoria, 
                dataset.nombre, 
                dataset.celular, 
                dataset.tipoAsesor || dataset['tipo-asesor'], // Manejo de ambos formatos
                dataset.nombreEmpresa || dataset['nombre-empresa'], 
                dataset.ciudad, 
                dataset.nota, 
                dataset.imagen, 
                dataset.correo
            );
        }
        
        if (deleteBtn) {
            e.preventDefault();
            e.stopPropagation();
            
            const dataset = deleteBtn.dataset;
            console.log('Delete button clicked:', dataset);
            openDeleteModal(dataset.id, dataset.nombre);
        }
    });

    // Preview de imagen
    const imagenInput = document.getElementById('imagen');
    if (imagenInput) {
        imagenInput.addEventListener('change', function (e) {
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
    }

    // Validación celular
    const celularInput = document.getElementById('celular');
    if (celularInput) {
        celularInput.addEventListener('input', function (e) {
            const value = e.target.value;
            const errorElement = document.getElementById('celularError');

            e.target.value = value.replace(/\D/g, '');
            if (e.target.value.length > 10) e.target.value = e.target.value.slice(0, 10);

            if (e.target.value.length === 10 || e.target.value.length === 0) {
                errorElement.classList.add('hidden');
                e.target.classList.remove('input-error');
            } else {
                errorElement.textContent = 'El celular debe tener exactamente 10 dígitos';
                errorElement.classList.remove('hidden');
                e.target.classList.add('input-error');
            }
        });
    }

    // ================== Búsqueda y Filtros dinámicos (patrón de products.js) ==================
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const cityFilter = document.getElementById('cityFilter');


    // Búsqueda con debounce usando el patrón de products.js
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const query = searchInput.value.trim();
                const category = categoryFilter ? categoryFilter.value : '';
                const city = cityFilter ? cityFilter.value : '';
                
                console.log('Aplicando filtros desde búsqueda:', { query, category, city });
                fetchSuppliers(query, category, city);
            }, 300);
        });
        
        // Eventos adicionales para móvil
        searchInput.addEventListener('change', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const query = searchInput.value.trim();
                const category = categoryFilter ? categoryFilter.value : '';
                const city = cityFilter ? cityFilter.value : '';
                
                console.log('Aplicando filtros desde change:', { query, category, city });
                fetchSuppliers(query, category, city);
            }, 100);
        });
        
    } else {
        console.error('searchInput no encontrado');
    }

    // Filtros inmediatos para selects
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            const query = searchInput ? searchInput.value.trim() : '';
            const category = categoryFilter.value;
            const city = cityFilter ? cityFilter.value : '';
            
            fetchSuppliers(query, category, city);
        });
    } else {
    }

    if (cityFilter) {
        cityFilter.addEventListener('change', () => {
            const query = searchInput ? searchInput.value.trim() : '';
            const category = categoryFilter ? categoryFilter.value : '';
            const city = cityFilter.value;
            
            console.log('Aplicando filtros desde ciudad:', { query, category, city });
            fetchSuppliers(query, category, city);
        });
    } else {
        console.error('cityFilter no encontrado');
    }

    // Cerrar modales al hacer clic fuera
    window.addEventListener('click', function (e) {
        if (e.target.id === 'supplierModal') closeModal();
        if (e.target.id === 'deleteModal') closeDeleteModal();
    });

    // Cerrar con Escape
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeModal();
            closeDeleteModal();
        }
    });

});