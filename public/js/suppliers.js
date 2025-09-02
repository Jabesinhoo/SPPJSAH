// Funciones para modales
function openCreateModal() {
    document.getElementById('modalTitle').textContent = 'Crear Proveedor';
    document.getElementById('supplierForm').action = '/suppliers';
    document.getElementById('supplierForm').reset();
    document.getElementById('imagePreview').classList.add('hidden');
    document.getElementById('fileName').textContent = 'Ningún archivo seleccionado';
    clearErrorMessages();
    document.getElementById('supplierModal').classList.remove('hidden');
}

function openEditModal(id, marca, categoria, nombre, celular, tipoAsesor, nombreEmpresa, ciudad, nota, imagen) {
    document.getElementById('modalTitle').textContent = 'Editar Proveedor';
    document.getElementById('supplierForm').action = `/suppliers/${id}/edit`;
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
    document.getElementById('deleteForm').action = `/suppliers/${id}/delete`;
    document.getElementById('deleteModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('supplierModal').classList.add('hidden');
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.add('hidden');
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