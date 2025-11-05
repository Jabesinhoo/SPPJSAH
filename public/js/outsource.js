class OutsourceManager {
  constructor() {
    this.currentPage = 1;
    this.limit = 10;
    this.searchTerm = '';
    this.filterService = '';
    this.pendingDeleteId = null;

    this.init();
  }

  init() {
    this.bindEvents();
    this.loadOutsources();
    this.loadServiceTypes();
  }

  bindEvents() {
    // Búsqueda con debounce
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
      this.searchTerm = e.target.value;
      this.currentPage = 1;
      this.debounce(() => this.loadOutsources(), 500);
    });

    // Filtro por servicio
    const filterService = document.getElementById('filterService');
    filterService.addEventListener('change', (e) => {
      this.filterService = e.target.value;
      this.currentPage = 1;
      this.loadOutsources();
    });

    // Limpiar filtros
    document.getElementById('clearFiltersBtn').addEventListener('click', () => {
      this.clearFilters();
    });

    // Modal events
    document.getElementById('addOutsourceBtn').addEventListener('click', () => this.openModal());
    document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
    document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
    document.getElementById('outsourceForm').addEventListener('submit', (e) => this.handleSubmit(e));

    // Modal de eliminación
    document.getElementById('cancelDeleteBtn').addEventListener('click', () => this.closeDeleteModal());
    document.getElementById('confirmDeleteBtn').addEventListener('click', () => this.confirmDelete());

    // Close modals on outside click
    document.getElementById('outsourceModal').addEventListener('click', (e) => {
      if (e.target.id === 'outsourceModal') this.closeModal();
    });
    document.getElementById('deleteModal').addEventListener('click', (e) => {
      if (e.target.id === 'deleteModal') this.closeDeleteModal();
    });
  }

  debounce(func, wait) {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(func, wait);
  }

  async loadServiceTypes() {
    try {
      const response = await fetch('/api/outsources/services');
      const result = await response.json();

      if (result.success) {
        this.renderServiceFilter(result.data);
      }
    } catch (error) {
      console.error('Error al cargar tipos de servicio:', error);
    }
  }

  renderServiceFilter(services) {
    const filterSelect = document.getElementById('filterService');
    filterSelect.innerHTML = '<option value="">Todos los servicios</option>';
    
    services.forEach(service => {
      const option = document.createElement('option');
      option.value = service;
      option.textContent = service;
      filterSelect.appendChild(option);
    });
  }

  clearFilters() {
    this.searchTerm = '';
    this.filterService = '';
    this.currentPage = 1;
    
    document.getElementById('searchInput').value = '';
    document.getElementById('filterService').value = '';
    
    this.loadOutsources();
  }

  async loadOutsources() {
    this.showLoading(true);
    
    try {
      const params = new URLSearchParams({
        page: this.currentPage,
        limit: this.limit,
        ...(this.searchTerm && { search: this.searchTerm }),
        ...(this.filterService && { filterService: this.filterService })
      });

      const response = await fetch(`/api/outsources?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();

      if (result.success) {
        this.renderTable(result.data);
        this.renderPagination(result.pagination);
      } else {
        this.showAlert(result.error || 'Error al cargar los técnicos', 'error');
      }
    } catch (error) {
      console.error('Error al cargar técnicos:', error);
      this.showAlert('Error de conexión al cargar los técnicos', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  renderTable(outsources) {
    const tbody = document.getElementById('outsourceTableBody');
    
    if (outsources.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
            <div class="flex flex-col items-center">
              <svg class="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p class="text-lg font-medium mb-2">No se encontraron técnicos</p>
              <p class="text-sm">${this.searchTerm || this.filterService ? 'Intenta con otros términos de búsqueda' : 'Comienza agregando un nuevo técnico'}</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = outsources.map(outsource => `
      <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
        <td class="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-gray-900 dark:text-gray-100">
          #${outsource.sku || 'N/A'}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
          <div class="flex items-center">
            <svg class="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            ${this.escapeHtml(outsource.nombre_tecnico)}
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
          <div class="flex items-center">
            <svg class="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
            </svg>
            ${this.escapeHtml(outsource.telefono)}
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-gray-100">
          ${outsource.cc}
        </td>
        <td class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
          <div class="flex flex-wrap gap-1">
            ${(outsource.tipo_servicio || []).map(service => `
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                ${this.escapeHtml(service.trim())}
              </span>
            `).join('')}
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
          <button 
            onclick="outsourceManager.editOutsource(${outsource.id})"
            class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors duration-200 flex items-center"
            title="Editar"
          >
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button 
            onclick="outsourceManager.deleteOutsource(${outsource.id}, '${this.escapeHtml(outsource.nombre_tecnico)}')"
            class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200 flex items-center"
            title="Eliminar"
          >
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </td>
      </tr>
    `).join('');
  }

  renderPagination(pagination) {
    const container = document.getElementById('paginationContainer');
    const { currentPage, totalPages } = pagination;

    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="text-sm text-gray-700 dark:text-gray-300">
          Página ${currentPage} de ${totalPages}
        </div>
        <div class="flex space-x-2">
          <button 
            ${currentPage === 1 ? 'disabled' : ''}
            onclick="outsourceManager.changePage(${currentPage - 1})"
            class="px-3 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center"
          >
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Anterior
          </button>
          <button 
            ${currentPage === totalPages ? 'disabled' : ''}
            onclick="outsourceManager.changePage(${currentPage + 1})"
            class="px-3 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center"
          >
            Siguiente
            <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  openModal(outsource = null) {
    const modal = document.getElementById('outsourceModal');
    const title = document.getElementById('modalTitleText');
    const submitText = document.getElementById('submitBtnText');
    const form = document.getElementById('outsourceForm');
    const skuField = document.getElementById('sku');

    if (outsource) {
      title.textContent = 'Editar Técnico';
      submitText.textContent = 'Actualizar';
      this.populateForm(outsource);
      // Habilitar campo SKU pero hacerlo de solo lectura al editar
      skuField.disabled = false;
      skuField.readOnly = true;
      skuField.classList.add('bg-gray-100', 'dark:bg-gray-600', 'cursor-not-allowed');
    } else {
      title.textContent = 'Nuevo Técnico';
      submitText.textContent = 'Guardar';
      form.reset();
      document.getElementById('outsourceId').value = '';
      // Habilitar campo SKU para escritura al crear
      skuField.disabled = false;
      skuField.readOnly = false;
      skuField.classList.remove('bg-gray-100', 'dark:bg-gray-600', 'cursor-not-allowed');
    }

    modal.classList.remove('hidden');
  }

  closeModal() {
    const skuField = document.getElementById('sku');
    document.getElementById('outsourceModal').classList.add('hidden');
    document.getElementById('outsourceForm').reset();
    // Restaurar campo SKU
    skuField.disabled = false;
    skuField.readOnly = false;
    skuField.classList.remove('bg-gray-100', 'dark:bg-gray-600', 'cursor-not-allowed');
  }

  populateForm(outsource) {
    document.getElementById('outsourceId').value = outsource.id;
    document.getElementById('sku').value = outsource.sku;
    document.getElementById('nombre_tecnico').value = outsource.nombre_tecnico || '';
    document.getElementById('telefono').value = outsource.telefono || '';
    document.getElementById('cc').value = outsource.cc || '';
    
    // Convertir array de servicios a string separado por comas
    const serviciosString = (outsource.tipo_servicio || []).join(', ');
    document.getElementById('tipo_servicio').value = serviciosString;
  }

  async handleSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const submitText = document.getElementById('submitBtnText');
    const originalText = submitText.textContent;
    
    try {
      submitBtn.disabled = true;
      submitText.textContent = 'Guardando...';

      // Obtener valores directamente de los inputs
      const skuInput = document.getElementById('sku');
      const nombreInput = document.getElementById('nombre_tecnico');
      const telefonoInput = document.getElementById('telefono');
      const ccInput = document.getElementById('cc');
      const serviciosInput = document.getElementById('tipo_servicio');

      const skuValue = skuInput.value.trim();
      const nombreValue = nombreInput.value.trim();
      const telefonoValue = telefonoInput.value.trim();
      const ccValue = ccInput.value.trim();
      const serviciosValue = serviciosInput.value;

      // DEBUG: Mostrar valores en consola
      console.log('=== DEBUG: VALORES DEL FORMULARIO ===');
      console.log('SKU:', skuValue, 'Tipo:', typeof skuValue);
      console.log('Nombre:', nombreValue);
      console.log('Teléfono:', telefonoValue);
      console.log('Cédula:', ccValue);
      console.log('Servicios (string):', serviciosValue);

      // Validar SKU
      if (!skuValue) {
        this.showAlert('El SKU es obligatorio', 'error');
        submitBtn.disabled = false;
        submitText.textContent = originalText;
        return;
      }

      const skuNumber = parseInt(skuValue);
      if (isNaN(skuNumber) || skuNumber <= 0) {
        this.showAlert('El SKU debe ser un número positivo', 'error');
        submitBtn.disabled = false;
        submitText.textContent = originalText;
        return;
      }

      // Convertir string de servicios a array, limpiando espacios y filtrando vacíos
      const serviciosArray = serviciosValue
        .split(',')
        .map(servicio => servicio.trim())
        .filter(servicio => servicio.length > 0);

      console.log('Servicios (array):', serviciosArray);

      // Validar que haya al menos un servicio
      if (serviciosArray.length === 0) {
        this.showAlert('Debe ingresar al menos un tipo de servicio', 'error');
        submitBtn.disabled = false;
        submitText.textContent = originalText;
        return;
      }

      const formData = {
        nombre_tecnico: nombreValue,
        telefono: telefonoValue,
        cc: ccValue,
        sku: skuNumber, // Enviar como número
        tipo_servicio: serviciosArray
      };

      console.log('=== DATOS QUE SE ENVIARÁN AL SERVIDOR ===');
      console.log('FormData completo:', formData);
      console.log('SKU en formData:', formData.sku, 'Tipo:', typeof formData.sku);

      // Validar campos obligatorios
      if (!formData.nombre_tecnico || !formData.telefono || !formData.cc) {
        this.showAlert('Todos los campos son obligatorios', 'error');
        submitBtn.disabled = false;
        submitText.textContent = originalText;
        return;
      }

      const outsourceId = document.getElementById('outsourceId').value;
      const url = outsourceId ? `/api/outsources/${outsourceId}` : '/api/outsources';
      const method = outsourceId ? 'PUT' : 'POST';

      console.log('URL:', url, 'Método:', method);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        },
        body: JSON.stringify(formData)
      });

      console.log('Respuesta del servidor - Status:', response.status);

      const result = await response.json();
      console.log('Respuesta del servidor - Data:', result);

      if (result.success) {
        this.showAlert(
          outsourceId ? 'Técnico actualizado exitosamente' : 'Técnico creado exitosamente',
          'success'
        );
        this.closeModal();
        this.loadOutsources();
      } else {
        console.error('Error del servidor:', result.error);
        this.showAlert(result.error || 'Error al guardar', 'error');
      }
    } catch (error) {
      console.error('Error en la solicitud:', error);
      this.showAlert('Error de conexión: ' + error.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitText.textContent = originalText;
    }
  }

  async editOutsource(id) {
    try {
      console.log('Editando técnico ID:', id);
      const response = await fetch(`/api/outsources/${id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Datos del técnico para editar:', result);

      if (result.success) {
        this.openModal(result.data);
      } else {
        this.showAlert(result.error || 'Error al cargar el técnico', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      this.showAlert('Error de conexión al cargar el técnico', 'error');
    }
  }

  // Modal de eliminación
  openDeleteModal(id, nombre) {
    this.pendingDeleteId = id;
    const deleteModal = document.getElementById('deleteModal');
    const deleteText = document.getElementById('deleteModalText');
    
    deleteText.textContent = `¿Estás seguro de que deseas eliminar al técnico "${nombre}"? Esta acción no se puede deshacer.`;
    deleteModal.classList.remove('hidden');
  }

  closeDeleteModal() {
    this.pendingDeleteId = null;
    document.getElementById('deleteModal').classList.add('hidden');
  }

  async confirmDelete() {
    if (!this.pendingDeleteId) return;

    try {
      console.log('Eliminando técnico ID:', this.pendingDeleteId);
      const response = await fetch(`/api/outsources/${this.pendingDeleteId}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        }
      });

      const result = await response.json();
      console.log('Respuesta de eliminación:', result);

      if (result.success) {
        this.showAlert('Técnico eliminado exitosamente', 'success');
        this.closeDeleteModal();
        this.loadOutsources();
      } else {
        this.showAlert(result.error || 'Error al eliminar', 'error');
        this.closeDeleteModal();
      }
    } catch (error) {
      console.error('Error:', error);
      this.showAlert('Error de conexión', 'error');
      this.closeDeleteModal();
    }
  }

  deleteOutsource(id, nombre) {
    this.openDeleteModal(id, nombre);
  }

  changePage(page) {
    this.currentPage = page;
    this.loadOutsources();
  }

  showLoading(show) {
    const loading = document.getElementById('loadingIndicator');
    const table = document.getElementById('outsourceTableBody');
    
    if (show) {
      loading.classList.remove('hidden');
      table.innerHTML = '';
    } else {
      loading.classList.add('hidden');
    }
  }

  showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    
    const alert = document.createElement('div');
    alert.className = `p-4 mb-4 rounded-lg border ${
      type === 'success' 
        ? 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200' 
        : type === 'error'
        ? 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
        : 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
    }`;
    
    alert.innerHTML = `
      <div class="flex justify-between items-center">
        <div class="flex items-center">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${
              type === 'success' 
                ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                : type === 'error'
                ? 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'
                : 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
            }"/>
          </svg>
          <span>${message}</span>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" class="text-current hover:opacity-70">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `;
    
    alertContainer.appendChild(alert);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (alert.parentElement) {
        alert.remove();
      }
    }, 5000);
  }

  escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  window.outsourceManager = new OutsourceManager();
});