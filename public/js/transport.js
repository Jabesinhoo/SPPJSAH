// Variables globales
let currentSearchTerm = '';
let currentFilter = '';
let tiposVehiculo = [];

// Función para escapar HTML (evitar problemas con comillas)
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Funciones para el modal de Crear
function openCreateModal() {
  document.getElementById('createForm').reset();
  document.getElementById('createModal').classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
}

function closeCreateModal() {
  document.getElementById('createModal').classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
}

// Funciones para el modal de Editar - CORREGIDAS
function openEditModal(placa, nombreConductor, telefono, tipoVehiculo) {
  console.log('📝 Abriendo modal editar para placa:', placa);
  
  document.getElementById('originalPlaca').value = placa;
  document.getElementById('editPlaca').value = placa;
  document.getElementById('editNombreConductor').value = nombreConductor;
  document.getElementById('editTelefono').value = telefono;
  document.getElementById('editTipoVehiculo').value = tipoVehiculo;
  
  // RUTA ABSOLUTA DINÁMICA
  document.getElementById('editForm').action = `/transport/${placa}/update`;
  
  document.getElementById('editModal').classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
}

function closeEditModal() {
  document.getElementById('editModal').classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
}

// Funciones para el modal de Eliminar
function openDeleteModal(placa) {
  console.log('🗑️ Abriendo modal eliminar para placa:', placa);
  
  document.getElementById('deletePlaca').value = placa;
  document.getElementById('deletePlacaText').textContent = placa;
  
  // RUTA ABSOLUTA DINÁMICA
  document.getElementById('deleteForm').action = `/transport/${placa}/delete`;
  
  document.getElementById('deleteModal').classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
}

function closeDeleteModal() {
  document.getElementById('deleteModal').classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
}

// Cerrar modales con click fuera o ESC
document.addEventListener('click', function(event) {
  const createModal = document.getElementById('createModal');
  const editModal = document.getElementById('editModal');
  const deleteModal = document.getElementById('deleteModal');
  
  if (event.target === createModal) closeCreateModal();
  if (event.target === editModal) closeEditModal();
  if (event.target === deleteModal) closeDeleteModal();
});

document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    closeCreateModal();
    closeEditModal();
    closeDeleteModal();
  }
});

// =============== FUNCIONES DE BÚSQUEDA Y FILTROS ===============
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Cargar tipos de vehículo desde la base de datos
async function loadTiposVehiculo() {
  try {
    const response = await fetch('/api/transport/tipos');
    if (!response.ok) throw new Error('Error al cargar tipos de vehículo');
    
    tiposVehiculo = await response.json();
    
    // Llenar el datalist para autocompletado
    const datalist = document.getElementById('tipoVehiculoOptions');
    if (datalist && tiposVehiculo.length > 0) {
      datalist.innerHTML = tiposVehiculo.map(tipo => 
        `<option value="${escapeHtml(tipo)}">${escapeHtml(tipo)}</option>`
      ).join('');
    }
    
    // Llenar el select de filtro
    const filterSelect = document.getElementById('filterTipoVehiculo');
    if (filterSelect && tiposVehiculo.length > 0) {
      filterSelect.innerHTML = '<option value="">Todos los tipos de vehículo</option>' +
        tiposVehiculo.map(tipo => 
          `<option value="${escapeHtml(tipo)}">${escapeHtml(tipo)}</option>`
        ).join('');
    }
    
  } catch (error) {
    console.error('Error al cargar tipos de vehículo:', error);
  }
}

// Función de búsqueda
const searchTransportes = debounce(async function() {
  const searchTerm = document.getElementById('searchInput').value.trim();
  const filterValue = document.getElementById('filterTipoVehiculo').value;
  
  currentSearchTerm = searchTerm;
  currentFilter = filterValue;
  
  await loadTransportes(searchTerm, filterValue);
}, 300);

// Función para cargar transportes
async function loadTransportes(search = '', filter = '') {
  const loadingIndicator = document.getElementById('loadingIndicator');
  const tableBody = document.getElementById('transportTableBody');
  const resultCount = document.getElementById('resultCount');
  
  loadingIndicator.classList.remove('hidden');
  tableBody.innerHTML = '';
  
  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (filter) params.append('tipo_vehiculo', filter);
    
    const response = await fetch(`/api/transport?${params.toString()}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error ${response.status}: ${errorText}`);
    }
    
    const transportes = await response.json();
    
    // Actualizar tabla
    if (transportes.length > 0) {
      tableBody.innerHTML = transportes.map(t => {
        // Escapar valores para usar en atributos HTML
        const placaEscaped = escapeHtml(t.placa);
        const nombreEscaped = escapeHtml(t.nombre_conductor);
        const telefonoEscaped = escapeHtml(t.telefono);
        const tipoEscaped = escapeHtml(t.tipo_vehiculo);
        
        return `
        <tr class="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
          <td class="p-3 font-mono">${placaEscaped}</td>
          <td class="p-3">${nombreEscaped}</td>
          <td class="p-3">${telefonoEscaped}</td>
          <td class="p-3">
            <span class="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs">
              ${tipoEscaped}
            </span>
          </td>
          <td class="p-3">
            <div class="flex space-x-1">
              <button onclick='openEditModal(${JSON.stringify(t.placa)}, ${JSON.stringify(t.nombre_conductor)}, ${JSON.stringify(t.telefono)}, ${JSON.stringify(t.tipo_vehiculo)})' 
                      class="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900 rounded transition-all duration-200"
                      title="Editar transporte">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
              <button onclick='openDeleteModal(${JSON.stringify(t.placa)})' 
                      class="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-all duration-200"
                      title="Eliminar transporte">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `;
      }).join('');
    } else {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center p-8 text-gray-500">
            <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <p class="text-lg">No se encontraron transportes</p>
            <p class="text-sm mt-2">Intenta con otros términos de búsqueda</p>
          </td>
        </tr>
      `;
    }
    
    resultCount.textContent = `${transportes.length} transportes encontrados`;
    
  } catch (error) {
    console.error('Error al cargar transportes:', error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center p-8 text-red-500">
          <svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
          <p class="text-lg">Error al cargar los datos</p>
          <p class="text-sm mt-2">${escapeHtml(error.message)}</p>
        </td>
      </tr>
    `;
    resultCount.textContent = 'Error al cargar transportes';
  } finally {
    loadingIndicator.classList.add('hidden');
  }
}

// Función para resetear filtros
function resetFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('filterTipoVehiculo').value = '';
  currentSearchTerm = '';
  currentFilter = '';
  loadTransportes();
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Inicializando página de transportes');
  
  // Cargar tipos de vehículo primero
  loadTiposVehiculo().then(() => {
    loadTransportes();
  });
  
  // Buscador
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', searchTransportes);
  }
  
  // Filtro por tipo de vehículo
  const filterSelect = document.getElementById('filterTipoVehiculo');
  if (filterSelect) {
    filterSelect.addEventListener('change', searchTransportes);
  }
  
  // Convertir placas a mayúsculas automáticamente
  const placaInputs = document.querySelectorAll('input[name="placa"]');
  placaInputs.forEach(input => {
    input.addEventListener('input', function(e) {
      e.target.value = e.target.value.toUpperCase();
    });
  });
  
  // Recargar tabla después de acciones de formulario
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', function(e) {
      console.log('📤 Enviando formulario:', form.id || form.action);
      
      // Dar tiempo a que se procese el formulario
      setTimeout(() => {
        loadTiposVehiculo().then(() => {
          loadTransportes(currentSearchTerm, currentFilter);
        });
      }, 1000);
    });
  });
  
  console.log('✅ Página inicializada correctamente');
});