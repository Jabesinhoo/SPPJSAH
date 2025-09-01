// Variables globales
let currentSpreadsheetId = null;
let currentSpreadsheetData = null;

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', function() {
    loadSpreadsheets();
    setupEventListeners();
});

// Configurar event listeners
function setupEventListeners() {
    // Formulario crear spreadsheet
    document.getElementById('createSpreadsheetForm').addEventListener('submit', createSpreadsheet);
    
    // Formulario agregar columna
    document.getElementById('addColumnForm').addEventListener('submit', handleAddColumn);
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
            <div class="text-center py-4">
                <i class="fas fa-table fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">No hay hojas de cálculo</h5>
                <p class="text-muted">Crea tu primera hoja de cálculo haciendo clic en "Nueva Hoja"</p>
            </div>
        `;
        return;
    }
    
    const html = spreadsheets.map(spreadsheet => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-8">
                        <h5 class="card-title mb-1">${escapeHtml(spreadsheet.name)}</h5>
                        <p class="card-text text-muted small mb-1">
                            ${spreadsheet.description || 'Sin descripción'}
                        </p>
                        <small class="text-muted">
                            ${spreadsheet.columns?.length || 0} columnas • 
                            Creado: ${new Date(spreadsheet.createdAt).toLocaleDateString()}
                        </small>
                    </div>
                    <div class="col-md-4 text-end">
                        <button class="btn btn-primary btn-sm me-2" onclick="openSpreadsheet(${spreadsheet.id})">
                            <i class="fas fa-edit me-1"></i>Abrir
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="deleteSpreadsheet(${spreadsheet.id}, '${escapeHtml(spreadsheet.name)}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
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
            bootstrap.Modal.getInstance(document.getElementById('createSpreadsheetModal')).hide();
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
    
    const table = document.getElementById('spreadsheetTable');
    const thead = document.getElementById('tableHeader');
    const tbody = document.getElementById('tableBody');
    
    // Limpiar tabla
    thead.innerHTML = '';
    tbody.innerHTML = '';
    
    if (!data.columns || data.columns.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="100%" class="text-center py-4">
                    <i class="fas fa-columns fa-2x text-muted mb-3"></i>
                    <h6 class="text-muted">No hay columnas</h6>
                    <p class="text-muted mb-0">Agrega tu primera columna haciendo clic en "Columna"</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Crear header
    const headerRow = document.createElement('tr');
    
    // Columna de acciones de fila
    const actionsHeader = document.createElement('th');
    actionsHeader.className = 'row-actions';
    actionsHeader.innerHTML = '<i class="fas fa-cog"></i>';
    headerRow.appendChild(actionsHeader);
    
    // Headers de columnas
    data.columns.forEach(column => {
        const th = document.createElement('th');
        th.className = 'column-header';
        th.innerHTML = `
            <span>${escapeHtml(column.name)}</span>
            <small class="d-block text-muted">${getColumnTypeLabel(column.columnType)}</small>
            <div class="column-actions">
                <button class="btn btn-sm btn-outline-danger" onclick="deleteColumn(${column.id})" title="Eliminar columna">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    
    // Crear filas
    if (!data.rows || data.rows.length === 0) {
        const emptyRow = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = data.columns.length + 1;
        td.className = 'text-center py-3';
        td.innerHTML = `
            <i class="fas fa-plus text-muted me-2"></i>
            <span class="text-muted">No hay filas. Agrega la primera fila haciendo clic en "Fila"</span>
        `;
        emptyRow.appendChild(td);
        tbody.appendChild(emptyRow);
        return;
    }
    
    data.rows.forEach(row => {
        const tr = document.createElement('tr');
        
        // Columna de acciones de fila
        const actionsTd = document.createElement('td');
        actionsTd.className = 'row-actions';
        actionsTd.innerHTML = `
            <button class="btn btn-sm btn-outline-danger" onclick="deleteRow(${row.id})" title="Eliminar fila">
                <i class="fas fa-trash"></i>
            </button>
        `;
        tr.appendChild(actionsTd);
        
        // Celdas de datos
        data.columns.forEach(column => {
            const cell = row.cells?.find(c => c.columnId === column.id);
            const td = document.createElement('td');
            td.className = 'editable-cell';
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
    
    const currentValue = cellElement.textContent;
    const columnType = cellElement.getAttribute('data-column-type');
    const selectOptions = cellElement.getAttribute('data-select-options');
    
    let input;
    
    if (columnType === 'select' && selectOptions) {
        // Crear select
        input = document.createElement('select');
        input.className = 'form-select form-select-sm cell-input';
        
        const options = JSON.parse(selectOptions);
        input.innerHTML = '<option value="">-- Seleccionar --</option>' +
            options.map(opt => `<option value="${escapeHtml(opt)}" ${opt === currentValue ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('');
            
    } else if (columnType === 'boolean') {
        // Crear select para boolean
        input = document.createElement('select');
        input.className = 'form-select form-select-sm cell-input';
        input.innerHTML = `
            <option value="">--</option>
            <option value="true" ${currentValue === 'true' ? 'selected' : ''}>Sí</option>
            <option value="false" ${currentValue === 'false' ? 'selected' : ''}>No</option>
        `;
    } else {
        // Crear input
        input = document.createElement('input');
        input.className = 'form-control form-control-sm cell-input';
        input.value = currentValue;
        
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
    if (!value) return '<span class="text-muted">--</span>';
    
    switch (columnType) {
        case 'boolean':
            return value === 'true' ? 
                '<span class="badge bg-success">Sí</span>' : 
                '<span class="badge bg-secondary">No</span>';
        case 'email':
            return `<a href="mailto:${escapeHtml(value)}">${escapeHtml(value)}</a>`;
        case 'url':
            return `<a href="${escapeHtml(value)}" target="_blank" rel="noopener">${escapeHtml(value)}</a>`;
        default:
            return escapeHtml(value);
    }
}

// Agregar columna
function addColumn() {
    const modal = new bootstrap.Modal(document.getElementById('addColumnModal'));
    document.getElementById('addColumnForm').reset();
    toggleSelectOptions(); // Reset select options visibility
    modal.show();
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
            bootstrap.Modal.getInstance(document.getElementById('addColumnModal')).hide();
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
    
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert" id="${alertId}">
            <i class="fas fa-${getAlertIcon(type)} me-2"></i>
            ${escapeHtml(message)}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    alertContainer.insertAdjacentHTML('beforeend', alertHtml);
    
    // Auto-remove después de 5 segundos
    setTimeout(() => {
        const alert = document.getElementById(alertId);
        if (alert) {
            const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
            bsAlert.close();
        }
    }, 5000);
}

// Obtener icono para alerta
function getAlertIcon(type) {
    const icons = {
        'success': 'check-circle',
        'danger': 'exclamation-triangle',
        'warning': 'exclamation-circle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
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