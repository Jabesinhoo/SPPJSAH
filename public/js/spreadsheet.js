// Variables globales
let currentSpreadsheetId = null;
let currentSpreadsheetData = null;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    loadSpreadsheets();
    setupEventListeners();
});

// Configurar event listeners
function setupEventListeners() {
    // Formulario crear spreadsheet
    const createForm = document.getElementById('createSpreadsheetForm');
    if (createForm) {
        createForm.addEventListener('submit', createSpreadsheet);
    }
    
    // Formulario agregar columna
    const columnForm = document.getElementById('addColumnForm');
    if (columnForm) {
        columnForm.addEventListener('submit', handleAddColumn);
    }
}

// Funciones para modales
function openCreateModal() {
    document.getElementById('createSpreadsheetModal').classList.remove('hidden');
    document.getElementById('createSpreadsheetModal').classList.add('flex');
}

function closeCreateModal() {
    document.getElementById('createSpreadsheetModal').classList.add('hidden');
    document.getElementById('createSpreadsheetModal').classList.remove('flex');
}

function addColumn() {
    document.getElementById('addColumnModal').classList.remove('hidden');
    document.getElementById('addColumnModal').classList.add('flex');
    document.getElementById('addColumnForm').reset();
    toggleSelectOptions();
}

function closeColumnModal() {
    document.getElementById('addColumnModal').classList.add('hidden');
    document.getElementById('addColumnModal').classList.remove('flex');
}

// Cargar lista de spreadsheets
async function loadSpreadsheets() {
    try {
        const response = await fetch('/api/spreadsheets');
        const result = await response.json();
        
        if (result.success) {
            renderSpreadsheetsList(result.data);
        } else {
            showAlert('Error al cargar las hojas de cálculo', 'danger');
        }
    } catch (error) {
        console.error('Error loading spreadsheets:', error);
        showAlert('Error de conexión', 'danger');
    }
}

// Renderizar lista de spreadsheets
function renderSpreadsheetsList(spreadsheets) {
    const container = document.getElementById('spreadsheetsContainer');
    
    if (spreadsheets.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12">
                <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"></path>
                </svg>
                <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No hay hojas de cálculo</h3>
                <p class="text-gray-500 dark:text-gray-400">Crea tu primera hoja de cálculo haciendo clic en "Nueva Hoja"</p>
            </div>
        `;
        return;
    }
    
    const html = spreadsheets.map(spreadsheet => `
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div class="flex-1">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        ${escapeHtml(spreadsheet.name)}
                    </h3>
                    <p class="text-gray-600 dark:text-gray-400 text-sm mb-2">
                        ${spreadsheet.description || 'Sin descripción'}
                    </p>
                    <div class="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                        <span class="flex items-center">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"></path>
                            </svg>
                            ${spreadsheet.columns?.length || 0} columnas
                        </span>
                        <span class="flex items-center">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            ${new Date(spreadsheet.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>
                <div class="flex space-x-2">
                    <button 
                        onclick="openSpreadsheet(${spreadsheet.id})" 
                        class="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                        Abrir
                    </button>
                    <button 
                        onclick="deleteSpreadsheet(${spreadsheet.id}, '${escapeHtml(spreadsheet.name)}')" 
                        class="inline-flex items-center px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

// Crear nuevo spreadsheet
async function createSpreadsheet(e) {
    e.preventDefault();
    
    const name = document.getElementById('spreadsheetName').value.trim();
    const description = document.getElementById('spreadsheetDescription').value.trim();
    
    if (!name) {
        showAlert('El nombre es requerido', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/spreadsheets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, description })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('Hoja de cálculo creada exitosamente', 'success');
            document.getElementById('createSpreadsheetForm').reset();
            closeCreateModal();
            loadSpreadsheets();
        } else {
            showAlert(result.message || 'Error al crear la hoja de cálculo', 'danger');
        }
    } catch (error) {
        console.error('Error creating spreadsheet:', error);
        showAlert('Error de conexión', 'danger');
    }
}

// Abrir spreadsheet para edición
async function openSpreadsheet(id) {
    try {
        const response = await fetch(`/api/spreadsheets/${id}`);
        const result = await response.json();
        
        if (result.success) {
            currentSpreadsheetId = id;
            currentSpreadsheetData = result.data;
            renderSpreadsheetEditor(result.data);
            
            // Ocultar lista y mostrar editor
            document.getElementById('spreadsheetsList').style.display = 'none';
            document.getElementById('spreadsheetEditor').style.display = 'block';
        } else {
            showAlert('Error al cargar la hoja de cálculo', 'danger');
        }
    } catch (error) {
        console.error('Error loading spreadsheet:', error);
        showAlert('Error de conexión', 'danger');
    }
}

// Renderizar editor de spreadsheet
function renderSpreadsheetEditor(data) {
    // Actualizar información del header
    document.getElementById('currentSpreadsheetName').textContent = data.name;
    document.getElementById('currentSpreadsheetDesc').textContent = data.description || '';
    
    const thead = document.getElementById('tableHeader');
    const tbody = document.getElementById('tableBody');
    
    // Limpiar tabla
    thead.innerHTML = '';
    tbody.innerHTML = '';
    
    if (!data.columns || data.columns.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="100%" class="text-center py-12">
                    <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"></path>
                    </svg>
                    <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No hay columnas</h3>
                    <p class="text-gray-500 dark:text-gray-400">Agrega tu primera columna haciendo clic en "Columna"</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Crear header con clases de Tailwind
    const headerRow = document.createElement('tr');
    
    // Columna de acciones de fila
    const actionsHeader = document.createElement('th');
    actionsHeader.className = 'row-actions bg-gray-50 dark:bg-gray-700 p-3 text-center border-r border-gray-200 dark:border-gray-600';
    actionsHeader.innerHTML = `
        <svg class="w-5 h-5 text-gray-500 dark:text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.84 2.37 2.37a1.724 1.724 0 00.462 2.697c.956.56.956 2.085 0 2.645a1.724 1.724 0 00-.462 2.697c.94 1.543-.84 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.84-2.37-2.37a1.724 1.724 0 00-.462-2.697c-.956-.56-.956-2.085 0-2.645a1.724 1.724 0 00.462-2.697c-.94-1.543.84-3.31 2.37-2.37a1.724 1.724 0 002.573-1.066z"></path>
        </svg>
    `;
    headerRow.appendChild(actionsHeader);
    
    // Headers de columnas
    data.columns.forEach(column => {
        const th = document.createElement('th');
        th.className = 'column-header bg-gray-50 dark:bg-gray-700 p-3 border-r border-gray-200 dark:border-gray-600 relative group';
        th.innerHTML = `
            <div class="flex flex-col">
                <span class="font-medium text-gray-900 dark:text-gray-100">${escapeHtml(column.name)}</span>
                <small class="text-gray-500 dark:text-gray-400">${getColumnTypeLabel(column.columnType)}</small>
            </div>
            <button 
                onclick="deleteColumn(${column.id})" 
                title="Eliminar columna"
                class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded bg-red-600 hover:bg-red-700 text-white">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
            </button>
        `;
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    
    // Crear filas
    if (!data.rows || data.rows.length === 0) {
        const emptyRow = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = data.columns.length + 1;
        td.className = 'text-center py-12';
        td.innerHTML = `
            <svg class="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M12 4v16m8-8H4"></path>
            </svg>
            <span class="text-gray-500 dark:text-gray-400">No hay filas. Agrega la primera fila haciendo clic en "Fila"</span>
        `;
        emptyRow.appendChild(td);
        tbody.appendChild(emptyRow);
        return;
    }
    
    data.rows.forEach(row => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200';
        
        // Columna de acciones de fila
        const actionsTd = document.createElement('td');
        actionsTd.className = 'row-actions bg-gray-50 dark:bg-gray-700 p-3 text-center border-r border-gray-200 dark:border-gray-600';
        actionsTd.innerHTML = `
            <button 
                onclick="deleteRow(${row.id})" 
                title="Eliminar fila"
                class="p-1 rounded bg-red-600 hover:bg-red-700 text-white transition-colors duration-200">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
            </button>
        `;
        tr.appendChild(actionsTd);
        
        // Celdas de datos
        data.columns.forEach(column => {
            const cell = row.cells?.find(c => c.columnId === column.id);
            const td = document.createElement('td');
            td.className = 'editable-cell p-3 border-r border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200';
            td.setAttribute('data-row-id', row.id);
            td.setAttribute('data-column-id', column.id);
            td.setAttribute('data-column-type', column.columnType);
            
            if (column.selectOptions) {
                td.setAttribute('data-select-options', JSON.stringify(column.selectOptions));
            }
            
            const value = cell?.value || '';
            td.innerHTML = formatCellValue(value, column.columnType);
            
            // Agregar event listener para edición
            td.addEventListener('click', () => editCell(td));
            
            tr.appendChild(td);
        });
        
        tbody.appendChild(tr);
    });
}

// Editar celda
function editCell(cellElement) {
    if (cellElement.querySelector('.cell-input')) return; // Ya está editándose
    
    const currentValue = cellElement.textContent.trim();
    const columnType = cellElement.getAttribute('data-column-type');
    const selectOptions = cellElement.getAttribute('data-select-options');
    
    let input;
    
    if (columnType === 'select' && selectOptions) {
        // Crear select
        input = document.createElement('select');
        input.className = 'cell-input w-full px-2 py-1 border-2 border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100';
        
        const options = JSON.parse(selectOptions);
        input.innerHTML = '<option value="">-- Seleccionar --</option>' +
            options.map(opt => `<option value="${escapeHtml(opt)}" ${opt === currentValue ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('');
            
    } else if (columnType === 'boolean') {
        // Crear select para boolean
        input = document.createElement('select');
        input.className = 'cell-input w-full px-2 py-1 border-2 border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100';
        input.innerHTML = `
            <option value="">--</option>
            <option value="true" ${currentValue === 'Sí' ? 'selected' : ''}>Sí</option>
            <option value="false" ${currentValue === 'No' ? 'selected' : ''}>No</option>
        `;
    } else {
        // Crear input
        input = document.createElement('input');
        input.className = 'cell-input w-full px-2 py-1 border-2 border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100';
        input.value = currentValue === '--' ? '' : currentValue;
        
        // Configurar tipo de input
        switch (columnType) {
            case 'number':
                input.type = 'number';
                input.step = '1';
                break;
            case 'decimal':
                input.type = 'number';
                input.step = 'any';
                break;
            case 'date':
                input.type = 'date';
                break;
            case 'email':
                input.type = 'email';
                break;
            case 'url':
                input.type = 'url';
                break;
            default:
                input.type = 'text';
        }
    }
    
    cellElement.innerHTML = '';
    cellElement.appendChild(input);
    input.focus();
    
    // Eventos para guardar o cancelar
    input.addEventListener('blur', () => saveCell(cellElement, input.value));
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            input.blur();
        } else if (e.key === 'Escape') {
            cancelCellEdit(cellElement, currentValue, columnType);
        }
    });
}

// Guardar celda
async function saveCell(cellElement, newValue) {
    const rowId = cellElement.getAttribute('data-row-id');
    const columnId = cellElement.getAttribute('data-column-id');
    const columnType = cellElement.getAttribute('data-column-type');
    
    try {
        const response = await fetch(`/api/cells/${rowId}/${columnId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ value: newValue })
        });
        
        const result = await response.json();
        
        if (result.success) {
            cellElement.innerHTML = formatCellValue(result.data.value, columnType);
        } else {
            showAlert(result.message || 'Error al guardar la celda', 'danger');
            cancelCellEdit(cellElement, cellElement.textContent, columnType);
        }
    } catch (error) {
        console.error('Error saving cell:', error);
        showAlert('Error de conexión', 'danger');
        cancelCellEdit(cellElement, cellElement.textContent, columnType);
    }
}

// Cancelar edición de celda
function cancelCellEdit(cellElement, originalValue, columnType) {
    cellElement.innerHTML = formatCellValue(originalValue, columnType);
}

// Formatear valor de celda para mostrar
function formatCellValue(value, columnType) {
    if (!value || value === '') return '<span class="text-gray-400 dark:text-gray-500">--</span>';
    
    switch (columnType) {
        case 'boolean':
            return value === 'true' ? 
                '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Sí</span>' : 
                '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">No</span>';
        case 'email':
            return `<a href="mailto:${escapeHtml(value)}" class="text-blue-600 dark:text-blue-400 hover:underline">${escapeHtml(value)}</a>`;
        case 'url':
            return `<a href="${escapeHtml(value)}" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 hover:underline">${escapeHtml(value)}</a>`;
        default:
            return escapeHtml(value);
    }
}

// Manejar formulario agregar columna
async function handleAddColumn(e) {
    e.preventDefault();
    
    const name = document.getElementById('columnName').value.trim();
    const columnType = document.getElementById('columnType').value;
    const defaultValue = document.getElementById('defaultValue').value.trim();
    const isRequired = document.getElementById('isRequired').checked;
    
    if (!name) {
        showAlert('El nombre de la columna es requerido', 'warning');
        return;
    }
    
    const data = {
        name,
        columnType,
        defaultValue: defaultValue || null,
        isRequired
    };
    
    // Agregar opciones de select si es necesario
    if (columnType === 'select') {
        const optionsText = document.getElementById('selectOptions').value.trim();
        if (!optionsText) {
            showAlert('Las opciones de select son requeridas', 'warning');
            return;
        }
        data.selectOptions = optionsText.split('\n').map(opt => opt.trim()).filter(opt => opt);
        if (data.selectOptions.length === 0) {
            showAlert('Debe proporcionar al menos una opción', 'warning');
            return;
        }
    }
    
    try {
        const response = await fetch(`/api/spreadsheets/${currentSpreadsheetId}/columns`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('Columna agregada exitosamente', 'success');
            closeColumnModal();
            openSpreadsheet(currentSpreadsheetId); // Recargar
        } else {
            showAlert(result.message || 'Error al agregar la columna', 'danger');
        }
    } catch (error) {
        console.error('Error adding column:', error);
        showAlert('Error de conexión', 'danger');
    }
}

// Agregar fila
async function addRow() {
    try {
        const response = await fetch(`/api/spreadsheets/${currentSpreadsheetId}/rows`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            openSpreadsheet(currentSpreadsheetId); // Recargar
        } else {
            showAlert(result.message || 'Error al agregar la fila', 'danger');
        }
    } catch (error) {
        console.error('Error adding row:', error);
        showAlert('Error de conexión', 'danger');
    }
}

// Eliminar columna
async function deleteColumn(columnId) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta columna? Se perderán todos los datos de la columna.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/spreadsheets/${currentSpreadsheetId}/columns/${columnId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('Columna eliminada exitosamente', 'success');
            openSpreadsheet(currentSpreadsheetId); // Recargar
        } else {
            showAlert(result.message || 'Error al eliminar la columna', 'danger');
        }
    } catch (error) {
        console.error('Error deleting column:', error);
        showAlert('Error de conexión', 'danger');
    }
}

// Eliminar fila
async function deleteRow(rowId) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta fila?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/spreadsheets/${currentSpreadsheetId}/rows/${rowId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('Fila eliminada exitosamente', 'success');
            openSpreadsheet(currentSpreadsheetId); // Recargar
        } else {
            showAlert(result.message || 'Error al eliminar la fila', 'danger');
        }
    } catch (error) {
        console.error('Error deleting row:', error);
        showAlert('Error de conexión', 'danger');
    }
}

// Eliminar spreadsheet
async function deleteSpreadsheet(id, name) {
    if (!confirm(`¿Estás seguro de que deseas eliminar la hoja "${name}"? Esta acción no se puede deshacer.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/spreadsheets/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('Hoja de cálculo eliminada exitosamente', 'success');
            loadSpreadsheets(); // Recargar lista
        } else {
            showAlert(result.message || 'Error al eliminar la hoja de cálculo', 'danger');
        }
    } catch (error) {
        console.error('Error deleting spreadsheet:', error);
        showAlert('Error de conexión', 'danger');
    }
}

// Volver a la lista
function backToList() {
    currentSpreadsheetId = null;
    currentSpreadsheetData = null;
    document.getElementById('spreadsheetEditor').style.display = 'none';
    document.getElementById('spreadsheetsList').style.display = 'block';
    loadSpreadsheets();
}

// Toggle opciones de select
function toggleSelectOptions() {
    const columnType = document.getElementById('columnType').value;
    const container = document.getElementById('selectOptionsContainer');
    
    if (columnType === 'select') {
        container.style.display = 'block';
        document.getElementById('selectOptions').required = true;
    } else {
        container.style.display = 'none';
        document.getElementById('selectOptions').required = false;
    }
}

// Obtener etiqueta del tipo de columna
function getColumnTypeLabel(type) {
    const labels = {
        'text': 'Texto',
        'number': 'Número',
        'decimal': 'Decimal',
        'boolean': 'Sí/No',
        'date': 'Fecha',
        'select': 'Lista',
        'email': 'Email',
        'url': 'URL'
    };
    return labels[type] || type;
}

// Mostrar alerta
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    const alertId = 'alert-' + Date.now();
    
    const typeClasses = {
        'success': 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-200',
        'danger': 'bg-red-100 border-red-500 text-red-700 dark:bg-red-900 dark:border-red-700 dark:text-red-200',
        'warning': 'bg-yellow-100 border-yellow-500 text-yellow-700 dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-200',
        'info': 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200'
    };
    
    const iconPaths = {
        'success': 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
        'danger': 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        'warning': 'M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        'info': 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    };
    
    const alertHtml = `
        <div class="border-l-4 p-4 rounded-r-lg ${typeClasses[type]} transition-all duration-300 transform translate-x-full" id="${alertId}">
            <div class="flex items-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${iconPaths[type]}"></path>
                </svg>
                <span class="text-sm font-medium">${escapeHtml(message)}</span>
                <button onclick="removeAlert('${alertId}')" class="ml-auto text-current hover:opacity-70">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        </div>
    `;
    
    alertContainer.insertAdjacentHTML('beforeend', alertHtml);
    
    // Animar entrada
    setTimeout(() => {
        const alert = document.getElementById(alertId);
        if (alert) {
            alert.classList.remove('translate-x-full');
            alert.classList.add('translate-x-0');
        }
    }, 10);
    
    // Auto-remove después de 5 segundos
    setTimeout(() => {
        removeAlert(alertId);
    }, 5000);
}

function removeAlert(alertId) {
    const alert = document.getElementById(alertId);
    if (alert) {
        alert.classList.add('translate-x-full');
        setTimeout(() => {
            alert.remove();
        }, 300);
    }
}

// Escapar HTML
function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Cerrar modales con escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeCreateModal();
        closeColumnModal();
    }
});

// Cerrar modales al hacer clic fuera
document.getElementById('createSpreadsheetModal').addEventListener('click', function(e) {
    if (e.target === this) closeCreateModal();
});

document.getElementById('addColumnModal').addEventListener('click', function(e) {
    if (e.target === this) closeColumnModal();
});