// products.js - Completamente modificado con sistema de menciones mejorado
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('product-form');
    const productsTableBodyUser = document.getElementById('products-table-body-user');
    const productsTableBodyAdmin = document.getElementById('products-table-body-admin');
    const themeToggle = document.getElementById('theme-toggle');
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');
    const modal = document.getElementById('product-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const openAddModalBtn = document.getElementById('open-add-modal');
    const importanceStars = document.getElementById('importance-stars');
    const importanceInput = document.getElementById('importance');
    const filterCategorySelect = document.getElementById('filter-category');
    const sortBySelect = document.getElementById('sort-by');
    const sortOrderSelect = document.getElementById('sort-order');
    const searchInput = document.getElementById('search-products');
    const filterReadySelect = document.getElementById('filter-ready');
    const readyToggle = document.getElementById('ready');
    const notesContainer = document.getElementById('notes-container');
    const newNoteTextarea = document.getElementById('note-new');
    const addNoteBtn = document.getElementById('add-note-btn');
    const noNotesMessage = document.getElementById('no-notes-message');
    const userSuggestions = document.getElementById('user-suggestions');
    const suggestionsList = document.getElementById('suggestions-list');

    const deleteModal = document.getElementById('delete-modal');
    const closeDeleteModalBtn = document.getElementById('close-delete-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

    let editingProductId = null;
    let deleteProductId = null;
    let currentNotes = [];
    let searchTimeout;
    let availableUsers = [];

    function formatCurrency(value) {
        if (!value) return "$0.00";
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    // ==================== FUNCIÓN PARA PROCESAR MENCIONES ====================
    const processMentionsInNotes = async (notes, productId, productName) => {
        try {
            const mentions = [];
            const mentionRegex = /@(\w+)/g;

            // Buscar todas las menciones en todas las notas
            notes.forEach(note => {
                let match;
                while ((match = mentionRegex.exec(note.text)) !== null) {
                    if (!mentions.includes(match[1])) {
                        mentions.push(match[1]);
                    }
                }
            });

            if (mentions.length === 0) {
                return;
            }

            // Enviar menciones al servidor para procesar
            const response = await fetch('/api/notifications/process-mentions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content
                },
                body: JSON.stringify({
                    text: notes.map(n => n.text).join(' '),
                    mentions: mentions,
                    context: {
                        section: 'productos',
                        redirectUrl: `/products#product-${productId}`,
                        metadata: {
                            productId: productId,
                            productName: productName,
                            productSKU: document.getElementById('sku').value,
                            targetElement: `product-${productId}`
                        }
                    }
                })
            });

            const result = await response.json();
            if (result.success) {
                console.log('✅ Menciones procesadas correctamente');
            } else {
                console.error('❌ Error al procesar menciones:', result.error);
            }
        } catch (error) {
            console.error('❌ Error en procesamiento de menciones:', error);
        }
    };

    // ==================== SISTEMA DE SUGERENCIAS DE USUARIOS ====================
    const loadAvailableUsers = async () => {
        try {
            const response = await fetch('/api/notifications/available-users');
            if (response.ok) {
                const data = await response.json();
                availableUsers = data.users || [];
            }
        } catch (error) {
            console.error('❌ Error al cargar usuarios disponibles:', error);
        }
    };

    const showUserSuggestions = (element, query) => {
        if (!availableUsers.length || !query) {
            hideUserSuggestions();
            return;
        }

        const filteredUsers = availableUsers.filter(user =>
            user.username.toLowerCase().includes(query.toLowerCase())
        );

        if (filteredUsers.length === 0) {
            hideUserSuggestions();
            return;
        }

        suggestionsList.innerHTML = '';
        filteredUsers.forEach(user => {
            const suggestion = document.createElement('div');
            suggestion.className = 'px-3 py-2 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-800 text-sm flex items-center';
            suggestion.innerHTML = `
                <div class="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs mr-2">
                    ${user.username.charAt(0).toUpperCase()}
                </div>
                <span>@${user.username}</span>
            `;

            suggestion.addEventListener('click', () => {
                insertMention(element, user.username);
            });

            suggestionsList.appendChild(suggestion);
        });

        userSuggestions.classList.remove('hidden');
        positionSuggestions(element);
    };

    const hideUserSuggestions = () => {
        userSuggestions.classList.add('hidden');
    };

    const positionSuggestions = (element) => {
        const rect = element.getBoundingClientRect();
        userSuggestions.style.top = `${rect.bottom + window.scrollY}px`;
        userSuggestions.style.left = `${rect.left + window.scrollX}px`;
        userSuggestions.style.width = `${rect.width}px`;
    };

    const insertMention = (element, username) => {
        const currentValue = element.value;
        const cursorPos = element.selectionStart;

        const beforeCursor = currentValue.substring(0, cursorPos);
        const lastAtIndex = beforeCursor.lastIndexOf('@');

        if (lastAtIndex !== -1) {
            const newText = currentValue.substring(0, lastAtIndex) + `@${username} ` + currentValue.substring(cursorPos);
            element.value = newText;

            // Posicionar cursor después del mention
            const newCursorPos = lastAtIndex + username.length + 2;
            element.setSelectionRange(newCursorPos, newCursorPos);
        }

        hideUserSuggestions();
        element.focus();
    };

    // ==================== MANEJO DE MENCIONES EN TEXTAREA ====================
    newNoteTextarea.addEventListener('input', (e) => {
        const text = e.target.value;
        const cursorPos = e.target.selectionStart;

        const beforeCursor = text.substring(0, cursorPos);
        const lastAtIndex = beforeCursor.lastIndexOf('@');

        if (lastAtIndex !== -1) {
            const textAfterAt = beforeCursor.substring(lastAtIndex + 1);
            if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
                showUserSuggestions(newNoteTextarea, textAfterAt);
                return;
            }
        }

        hideUserSuggestions();
    });

    newNoteTextarea.addEventListener('click', (e) => {
        hideUserSuggestions();
    });

    document.addEventListener('click', (e) => {
        if (!userSuggestions.contains(e.target) && !newNoteTextarea.contains(e.target)) {
            hideUserSuggestions();
        }
    });

    newNoteTextarea.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideUserSuggestions();
        }
    });

    // ==================== FUNCIÓN HELPER PARA ESCAPAR HTML ====================
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ==================== RENDERIZADO MEJORADO DE NOTAS ====================
    /**
     * Renderiza las notas en el modal con estructura identificable para menciones.
     */
    const renderNotes = (notes, productId = null) => {
        notesContainer.innerHTML = '';

        if (notes && notes.length > 0) {
            noNotesMessage.classList.add('hidden');
            notes.forEach((note, index) => {
                const noteDiv = document.createElement('div');
                noteDiv.className = 'p-3 my-2 rounded-md bg-gray-100 dark:bg-gray-600 border-l-4 border-indigo-500 relative group';

                // ✅ MEJORA: Agregar IDs únicos y data attributes para búsqueda
                const noteUniqueId = productId ? `note-${productId}-${index}` : `note-${index}`;
                noteDiv.id = noteUniqueId;
                noteDiv.setAttribute('data-note', 'true');
                noteDiv.setAttribute('data-product-id', productId || '');
                noteDiv.setAttribute('data-note-index', index);

                // Formatear fecha y hora
                const noteDate = new Date(note.date);
                const formattedDate = noteDate.toLocaleDateString();
                const formattedTime = noteDate.toLocaleTimeString();

                // ✅ MEJORA: Procesar menciones manteniendo el texto original
                let noteText = note.text;
                const mentionRegex = /@(\w+)/g;
                const processedNoteText = noteText.replace(mentionRegex,
                    '<span class="bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300 px-1 rounded font-medium mention-tag">@$1</span>'
                );

                // Verificar si el usuario actual puede editar/eliminar esta nota
                const canEditDelete = note.user === currentUsername || userRole === 'admin';

                noteDiv.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <p class="text-xs text-gray-600 dark:text-gray-300 font-bold">${note.user}</p>
                    <div class="text-right">
                        <span class="text-xs text-gray-500 dark:text-gray-400 block">${formattedDate}</span>
                        <span class="text-xs text-gray-500 dark:text-gray-400">${formattedTime}</span>
                    </div>
                </div>
                
                <!-- ✅ MEJORA: Contenedor de texto con data attribute para búsqueda -->
                <div class="note-content" data-original-text="${escapeHtml(noteText)}">
                    <p class="text-sm text-gray-800 dark:text-gray-200 mb-2" id="note-text-${index}">
                        ${processedNoteText}
                    </p>
                </div>
                
                ${canEditDelete ? `
                <div class="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button type="button" onclick="editNote(${index})" 
                            class="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200 flex items-center">
                        <svg class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Editar
                    </button>
                    <button type="button" onclick="deleteNote(${index})" 
                            class="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 flex items-center">
                        <svg class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Eliminar
                    </button>
                </div>
                ` : ''}
                
                <!-- Formulario de edición (oculto inicialmente) -->
                <div id="note-edit-form-${index}" class="hidden mt-2">
                    <textarea id="note-edit-text-${index}" rows="3" 
                        class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 resize-none">${note.text}</textarea>
                    <div class="flex justify-end space-x-2 mt-2">
                        <button type="button" onclick="cancelEditNote(${index})" 
                                class="px-3 py-1 text-xs bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500">
                            Cancelar
                        </button>
                        <button type="button" onclick="saveEditedNote(${index})" 
                                class="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700">
                            Guardar
                        </button>
                    </div>
                </div>
            `;
                notesContainer.appendChild(noteDiv);
            });
        } else {
            noNotesMessage.classList.remove('hidden');
        }

        notesContainer.scrollTop = notesContainer.scrollHeight;
    };

    /**
     * Renderiza las notas en la tabla principal con estructura identificable
     */
    function renderNotesInTable(notes, productId) {
        if (!notes || notes.length === 0) {
            return '<div class="text-gray-500 dark:text-gray-400 text-sm italic">No hay notas</div>';
        }

        // Ordenar notas por fecha (más reciente primero)
        const sortedNotes = [...notes].sort((a, b) => new Date(b.date) - new Date(a.date));

        return sortedNotes.map((note, index) => {
            const noteId = `table-note-${productId}-${index}`;
            const date = new Date(note.date).toLocaleString('es-ES');

            // ✅ MEJORA: Procesar menciones y agregar estructura identificable
            let noteText = note.text;
            const mentionRegex = /@(\w+)/g;
            const processedNoteText = noteText.replace(mentionRegex,
                '<span class="bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300 px-1 rounded text-xs mention-tag">@$1</span>'
            );

            return `
                <div id="${noteId}" class="note-item mb-2 p-2 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700" 
                     data-note="true" data-product-id="${productId}" data-original-text="${escapeHtml(noteText)}">
                    <div class="flex justify-between items-start mb-1">
                        <span class="text-xs font-medium text-gray-700 dark:text-gray-300">${note.user || 'Usuario'}</span>
                        <span class="text-xs text-gray-500 dark:text-gray-400">${date}</span>
                    </div>
                    <p class="note-text text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">${processedNoteText}</p>
                </div>
            `;
        }).join('');
    }

    // Lógica del modo oscuro
    const isDarkMode = () => document.documentElement.classList.contains('dark');
    const updateIcons = () => {
        if (isDarkMode()) {
            sunIcon.classList.remove('hidden');
            moonIcon.classList.add('hidden');
        } else {
            sunIcon.classList.add('hidden');
            moonIcon.classList.remove('hidden');
        }
    };
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            if (isDarkMode()) {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            } else {
                document.documentElement.classList.add('dark');
                localStorage.setItem('theme', 'dark');
            }
            updateIcons();
        });
    }

    updateIcons();

    // Aplicar tema guardado
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    }
    updateIcons();

    themeToggle.addEventListener('click', () => {
        if (isDarkMode()) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }
        updateIcons();
    });

    /**
     * Muestra un mensaje al usuario.
     */
    // Asegúrate de tener esta función en products.js
const showMessage = (message, type = 'info') => {
    // Eliminar mensajes anteriores
    const existingMessages = document.querySelectorAll('.global-message');
    existingMessages.forEach(msg => msg.remove());
    
    // Crear nuevo mensaje
    const messageDiv = document.createElement('div');
    messageDiv.className = `global-message fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 transform translate-x-0 opacity-100 ${
        type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
        type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
        'bg-blue-100 text-blue-800 border border-blue-200'
    }`;
    
    messageDiv.innerHTML = `
        <div class="flex items-center">
            ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
            <span class="ml-2 font-medium">${message}</span>
        </div>
    `;
    
    document.body.appendChild(messageDiv);
    
    // Auto-eliminar después de 5 segundos
    setTimeout(() => {
        messageDiv.style.transform = 'translateX(100%)';
        messageDiv.style.opacity = '0';
        setTimeout(() => messageDiv.remove(), 300);
    }, 5000);
};

    /**
     * Actualiza la visualización de las estrellas de importancia.
     */
    const updateStarDisplay = (value) => {
        const stars = importanceStars.querySelectorAll('span');
        stars.forEach((star, index) => {
            const starValue = parseInt(star.dataset.value);
            if (starValue <= value) {
                star.classList.add('text-yellow-400');
                star.classList.remove('text-gray-400');
            } else {
                star.classList.add('text-gray-400');
                star.classList.remove('text-yellow-400');
            }
        });
        importanceInput.value = value;
    };

    /**
     * Resetea el formulario y los valores de edición.
     */
    const resetForm = () => {
        form.reset();
        editingProductId = null;
        document.querySelector('#modal-title').textContent = 'Añadir Nuevo Producto';
        document.querySelector('#submit-btn').textContent = 'Añadir Producto';
        updateStarDisplay(1);
        if (readyToggle) readyToggle.checked = false;

        // Resetear notas
        notesContainer.innerHTML = '';
        noNotesMessage.classList.remove('hidden');
        currentNotes = [];
        newNoteTextarea.value = '';
        hideUserSuggestions();

        // Resetear categoría para usuarios normales
        if (userRole !== 'admin') {
            document.getElementById('category').value = 'Faltantes';
        }
    };

    /**
     * Editar una nota existente
     */
    window.editNote = (index) => {
        // Prevenir la propagación del evento
        event.stopPropagation();
        event.preventDefault();

        // Ocultar el texto de la nota y mostrar el formulario de edición
        document.getElementById(`note-text-${index}`).classList.add('hidden');
        document.getElementById(`note-edit-form-${index}`).classList.remove('hidden');

        // Ocultar botones de acción
        const noteDiv = document.getElementById(`note-${index}`);
        const actionButtons = noteDiv.querySelector('.flex.justify-end');
        if (actionButtons) {
            actionButtons.classList.add('hidden');
        }
    };

    /**
     * Cancelar la edición de una nota
     */
    window.cancelEditNote = (index) => {
        // Prevenir la propagación del evento
        event.stopPropagation();
        event.preventDefault();

        // Mostrar el texto de la nota y ocultar el formulario de edición
        document.getElementById(`note-text-${index}`).classList.remove('hidden');
        document.getElementById(`note-edit-form-${index}`).classList.add('hidden');

        // Mostrar botones de acción
        const noteDiv = document.getElementById(`note-${index}`);
        const actionButtons = noteDiv.querySelector('.flex.justify-end');
        if (actionButtons) {
            actionButtons.classList.remove('hidden');
        }
    };

    /**
     * Guardar una nota editada
     */
    window.saveEditedNote = async (index) => {
        // Prevenir la propagación del evento
        event.stopPropagation();
        event.preventDefault();

        const editedText = document.getElementById(`note-edit-text-${index}`).value.trim();

        if (!editedText) {
            showMessage('La nota no puede estar vacía', 'error');
            return;
        }

        try {
            // Actualizar la nota en el array local
            currentNotes[index].text = editedText;
            currentNotes[index].date = new Date().toISOString();
            currentNotes[index].edited = true;

            // Re-renderizar las notas
            renderNotes(currentNotes);

            showMessage('Nota actualizada correctamente', 'success');

        } catch (error) {
            console.error('Error al guardar la nota editada:', error);
            showMessage('Error al actualizar la nota', 'error');
        }
    };

    /**
     * Eliminar una nota
     */
    window.deleteNote = (index) => {
        // Prevenir la propagación del evento
        event.stopPropagation();
        event.preventDefault();

        // Mostrar modal de confirmación para eliminar
        const modalHtml = `
        <div class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-6">
                <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Confirmar Eliminación</h3>
                <p class="text-gray-600 dark:text-gray-300 mb-6">¿Estás seguro de que deseas eliminar esta nota? Esta acción no se puede deshacer.</p>
                
                <div class="flex justify-end gap-3">
                    <button type="button" id="cancel-delete-note" 
                            class="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md shadow-sm hover:bg-gray-400 dark:hover:bg-gray-500">
                        Cancelar
                    </button>
                    <button type="button" id="confirm-delete-note" 
                            class="px-4 py-2 bg-red-600 text-white rounded-md shadow-sm hover:bg-red-700">
                        Eliminar
                    </button>
                </div>
            </div>
        </div>
    `;

        // Agregar el modal al DOM
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);

        // Configurar event listeners con prevención de propagación
        document.getElementById('cancel-delete-note').addEventListener('click', (e) => {
            e.stopPropagation();
            modalContainer.remove();
        });

        document.getElementById('confirm-delete-note').addEventListener('click', (e) => {
            e.stopPropagation();

            // Eliminar la nota del array
            currentNotes.splice(index, 1);

            // Re-renderizar las notas
            renderNotes(currentNotes);

            // Remover el modal
            modalContainer.remove();

            showMessage('Nota eliminada correctamente', 'success');
        });

        // Cerrar modal al hacer clic fuera
        modalContainer.querySelector('.fixed').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                modalContainer.remove();
            }
        });

        // Prevenir que el clic dentro del modal cierre el modal padre
        modalContainer.querySelector('.bg-white, .dark\\:bg-gray-800').addEventListener('click', (e) => {
            e.stopPropagation();
        });
    };

    /**
     * Obtiene y muestra todos los productos desde el backend, con filtros y ordenamiento.
     */
    const fetchProducts = async () => {
        const category = filterCategorySelect.value;
        const sortBy = sortBySelect.value;
        const sortOrder = sortOrderSelect.value;
        const searchTerm = searchInput.value.trim();
        const readyFilter = filterReadySelect.value;

        let url = '/api/products';
        const params = new URLSearchParams();

        if (category) params.append('category', category);
        if (sortBy) params.append('sort', sortBy);
        if (sortOrder) params.append('order', sortOrder);
        if (searchTerm) params.append('search', searchTerm);
        if (readyFilter) params.append('ready', readyFilter);

        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        try {
            const res = await fetch(url);
            if (!res.ok) {
                showMessage('Error al cargar los productos.', 'error');
                if (productsTableBodyUser) productsTableBodyUser.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-gray-500 dark:text-gray-400">No se pudo cargar la lista de productos.</td></tr>';
                if (productsTableBodyAdmin) productsTableBodyAdmin.innerHTML = '<tr><td colspan="11" class="text-center py-4 text-gray-500 dark:text-gray-400">No se pudo cargar la lista de productos.</td></tr>';
                return;
            }

            const products = await res.json();

            // Limpiar tablas
            if (userRole !== 'admin' && productsTableBodyUser) {
                productsTableBodyUser.innerHTML = '';
            } else if (productsTableBodyAdmin) {
                productsTableBodyAdmin.innerHTML = '';
            }

            products.forEach(product => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200';

                // Renderizar estrellas de importancia
                const starsHtml = '★'.repeat(product.importancia || 0) + '☆'.repeat(5 - (product.importancia || 0));

                // Formatear fecha y hora del producto
                const productDate = new Date(product.fecha || product.createdAt);
                const formattedDate = productDate.toLocaleDateString();
                const formattedTime = productDate.toLocaleTimeString();

                // Switch para "Listo"
                const readySwitch = `
  <div class="relative group">
    <label class="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        ${product.categoria === 'Faltantes' ? '' : (product.listo ? 'checked' : '')}
        ${userRole !== 'admin' ? 'disabled' : ''}
        data-id="${product.id}"
        data-categoria="${product.categoria}"
        onchange="handleReadyToggle(this)"
        class="sr-only peer"
        aria-label="Marcar producto como listo"
        ${product.categoria === 'Faltantes' ? 'aria-disabled="true"' : ''}
      >
      <div
        class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full
               peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white
               after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full
               after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"
      ></div>
    </label>

    ${product.categoria === 'Faltantes' ? `
      <div class="absolute z-10 invisible group-hover:visible bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded-md whitespace-nowrap">
        No puede marcarse "Listo" si está en "Faltantes"
      </div>` : ''}
  </div>
`;

                // Notas con modal - ✅ USAR NUEVA FUNCIÓN MEJORADA
                let notesHtml = `<td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">-</td>`;
                if (product.nota && product.nota.length > 0) {
                    try {
                        const notes = JSON.parse(product.nota);
                        if (notes.length > 0) {
                            const notePreview = notes[notes.length - 1].text.substring(0, 20) + (notes[notes.length - 1].text.length > 20 ? '...' : '');
                            notesHtml = `
                                <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                    <button onclick="showNotesModal('${product.id}')" class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                                        <div class="flex items-center space-x-2">
                                            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                            </svg>
                                            <span class="truncate max-w-xs">${notePreview}</span>
                                            <span class="bg-indigo-100 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 px-2 py-1 rounded-full text-xs">${notes.length}</span>
                                        </div>
                                    </button>
                                </td>
                            `;
                        }
                    } catch (e) {
                        notesHtml = `
                            <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                <button onclick="showNotesModal('${product.id}')" class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                                    ${product.nota.substring(0, 20)}${product.nota.length > 20 ? '...' : ''}
                                </button>
                            </td>
                        `;
                    }
                }

                if (userRole !== 'admin' && productsTableBodyUser) {
                    // Tabla para usuarios normales
                    row.innerHTML = `
        <td class="px-3 py-4 whitespace-nowrap">
            <input type="checkbox" class="product-checkbox h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" value="${product.id}">
        </td>
        <td class="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
            <span class="font-mono">${product.SKU}</span>
        </td>
        <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
            <span title="${product.nombre}">${truncateText(product.nombre, 30)}</span>
        </td>
        <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
            ${product.usuario}
        </td>
        <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${product.cantidad > 0 ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'}">
                ${product.cantidad}
            </span>
        </td>
        <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(product.categoria)}">
                ${product.categoria}
            </span>
        </td>
        <td class="px-3 py-4 whitespace-nowrap text-sm text-yellow-400">
            <span title="Importancia: ${product.importancia}/5">${starsHtml}</span>
        </td>
        <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
            <span class="text-xs">${formattedDate}</span><br>
            <span class="text-xs">${formattedTime}</span>
        </td>
        <td class="px-3 py-4 whitespace-nowrap text-sm font-medium">
            ${readySwitch}
        </td>
        ${notesHtml}
        <td class="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
            <button onclick="editProduct('${product.id}')" class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors duration-200" title="Editar producto">
                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                    <path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" />
                </svg>
            </button>
        </td>
    `;
                    productsTableBodyUser.appendChild(row);
                } else if (productsTableBodyAdmin) {
                    // Tabla para administradores
                    row.innerHTML = `
        <td class="px-3 py-4 whitespace-nowrap">
            <input type="checkbox" class="product-checkbox h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" value="${product.id}">
        </td>
        <td class="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
            <span class="font-mono">${product.SKU}</span>
        </td>
        <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
            <span title="${product.nombre}">${truncateText(product.nombre, 30)}</span>
        </td>
        <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
            ${product.usuario}
        </td>
        <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${product.cantidad > 0 ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'}">
                ${product.cantidad}
            </span>
        </td>
        <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(product.categoria)}">
                ${product.categoria}
            </span>
        </td>
        <td class="px-3 py-4 whitespace-nowrap text-sm text-yellow-400">
            <span title="Importancia: ${product.importancia}/5">${starsHtml}</span>
        </td>
        <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
            ${product.precio_compra ? formatCurrency(product.precio_compra) : '-'}
        </td>
        <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
            ${product.proveedor || '-'}
        </td>
        <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
            ${product.brand || '-'}
        </td>
        <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
            <span class="text-xs">${formattedDate}</span><br>
            <span class="text-xs">${formattedTime}</span>
        </td>
        <td class="px-3 py-4 whitespace-nowrap text-sm font-medium">
            ${readySwitch}
        </td>
        ${notesHtml}
        <td class="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
            <div class="flex justify-end space-x-2">
                <button onclick="editProduct('${product.id}')" class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors duration-200" title="Editar producto">
                    <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                        <path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" />
                    </svg>
                </button>
                <button onclick="deleteProduct('${product.id}')" class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200" title="Eliminar producto">
                    <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
        </td>
    `;
                    productsTableBodyAdmin.appendChild(row);
                }
            });
        } catch (err) {
            showMessage('Error de conexión. Inténtalo de nuevo.', 'error');
        }
    };

    /**
     * Obtiene el color de la categoría
     */
    const getCategoryColor = (category) => {
        switch (category) {
            case 'Faltantes':
                return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100';
            case 'Bajo Pedido':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100';
            case 'Agotados con el Proveedor':
                return 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100';
            case 'Demasiadas Existencias':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100';
            case 'Realizado':
                return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-100';
            case 'Descontinuado':
                return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
            case 'Reemplazado':
                return 'bg-teal-100 text-teal-800 dark:bg-teal-800 dark:text-teal-100';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
        }
    };

    /**
     * Maneja el envío del formulario.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();

        const formData = new FormData(form);

        // Solo incluir campos de admin si es admin
        const productData = {
            SKU: formData.get('sku'),
            name: formData.get('name'),
            quantity: Math.max(0, parseInt(formData.get('quantity')) || 0),
            importance: parseInt(importanceInput.value) || 1,
            category: formData.get('category') || 'Faltantes'
        };

        // ✅ Marca la pueden poner todos los roles
        productData.brand = formData.get('brand') || '';

        if (userRole === 'admin') {
            productData.purchasePrice = Math.max(0, parseFloat(formData.get('purchasePrice')) || 0);
            productData.supplier = formData.get('supplier') || '';
            productData.ready = readyToggle ? readyToggle.checked : false;
        } else {
            // Para usuarios normales, forzar valores por defecto
            productData.purchasePrice = 0;
            productData.supplier = 'N/A';
            productData.ready = false;
        }

        // Manejar notas - ahora incluye las notas editadas/eliminadas
        const newNoteText = newNoteTextarea.value.trim();
        if (newNoteText) {
            const newNote = {
                text: newNoteText,
                user: currentUsername,
                date: new Date().toISOString()
            };
            const updatedNotes = [...currentNotes, newNote];
            productData.notes = JSON.stringify(updatedNotes);
        } else {
            productData.notes = JSON.stringify(currentNotes);
        }

        const url = editingProductId ? `/api/products/${editingProductId}` : '/api/products';
        const method = editingProductId ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData),
            });

            const data = await res.json();

            if (res.ok) {
                showMessage(data.message || 'Producto guardado correctamente', 'success');

                // ✅ PROCESAR MENCIONES DESPUÉS DE GUARDAR
                const productName = formData.get('name');
                let notesToProcess = currentNotes;

                // Si hay una nueva nota, agregarla al procesamiento
                if (newNoteText) {
                    notesToProcess = [...currentNotes, { text: newNoteText, user: currentUsername }];
                }

                if (notesToProcess.length > 0) {
                    const productId = editingProductId || data.product?.id;
                    if (productId) {
                        // Procesar menciones de forma asíncrona (no esperar)
                        processMentionsInNotes(notesToProcess, productId, productName)
                            .catch(error => console.error('Error en procesamiento de menciones:', error));
                    }
                }

                closeModal();
                fetchProducts();
            } else {
                showMessage(data.error || 'Error al guardar el producto', 'error');
            }
        } catch (error) {
            showMessage('Error de conexión. Inténtalo de nuevo.', 'error');
            console.error('Error:', error);
        }
    };

    /**
     * Cierra el modal y limpia el formulario.
     */
    const closeModal = () => {
        modal.classList.add('hidden');
        resetForm();
    };

    /**
     * Rellena el formulario con los datos de un producto para editar.
     */
    window.editProduct = async (id) => {
        try {
            const res = await fetch(`/api/products/${id}`);
            const product = await res.json();

            if (res.ok) {
                editingProductId = id;
                document.querySelector('#modal-title').textContent = 'Editar Producto';
                document.querySelector('#submit-btn').textContent = 'Guardar Cambios';

                document.getElementById('sku').value = product.SKU;
                document.getElementById('name').value = product.nombre;
                document.getElementById('quantity').value = product.cantidad;
                document.getElementById('category').value = product.categoria;
                updateStarDisplay(product.importancia || 1);

                // ✅ Marca editable por todos
                document.getElementById('brand').value = product.brand || '';

                if (userRole === 'admin') {
                    document.getElementById('purchase-price').value = product.precio_compra || '';
                    document.getElementById('supplier').value = product.proveedor || '';

                    if (readyToggle) readyToggle.checked = product.listo || false;
                }

                // Cargar y renderizar notas
                if (product.nota) {
                    try {
                        currentNotes = JSON.parse(product.nota);
                        renderNotes(currentNotes, id); // ✅ Pasar productId para mejor estructura
                    } catch (e) {
                        currentNotes = [{
                            text: product.nota,
                            user: 'Sistema',
                            date: new Date().toISOString()
                        }];
                        renderNotes(currentNotes, id); // ✅ Pasar productId para mejor estructura
                    }
                } else {
                    currentNotes = [];
                    renderNotes([], id); // ✅ Pasar productId para mejor estructura
                }

                modal.classList.remove('hidden');
            } else {
                showMessage(product.error || 'Error al cargar el producto', 'error');
            }
        } catch (err) {
            showMessage('Error de conexión. Inténtalo de nuevo.', 'error');
            console.error('Error:', err);
        }
    };

    /**
     * Muestra el modal de confirmación de eliminación.
     */
    window.deleteProduct = (id) => {
        deleteProductId = id;
        deleteModal.classList.remove('hidden');
    };

    /**
     * Elimina un producto.
     */
    const handleDelete = async () => {
        try {
            const res = await fetch(`/api/products/${deleteProductId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                const data = await res.json();
                showMessage(data.message || 'Producto eliminado correctamente', 'success');
                deleteModal.classList.add('hidden');
                fetchProducts();
            } else {
                const errorData = await res.json();
                showMessage(errorData.error || 'Error al eliminar el producto', 'error');
            }
        } catch (err) {
            showMessage('Error de conexión. Inténtalo de nuevo.', 'error');
            console.error('Error:', err);
        }
    };

    /**
     * Función para toggle de "Listo"
     */
    window.handleReadyToggle = async (checkbox) => {
        const productId = checkbox.dataset.id;
        const isReady = checkbox.checked;
        const categoria = checkbox.dataset.categoria;

        // Verificar si se puede cambiar a "Listo"
        if (isReady && categoria === 'Faltantes') {
            showMessage('No se puede marcar como listo un producto en categoría "Faltantes"', 'error');
            // Revertir el cambio visual
            checkbox.checked = false;
            return;
        }

        try {
            // Si está desmarcando "Listo", volver a la categoría anterior o por defecto
            let newCategory = categoria;
            if (isReady) {
                newCategory = 'Realizado';
            } else {
                // Al desmarcar, volver a la categoría por defecto
                newCategory = 'Bajo Pedido';
            }

            const res = await fetch(`/api/products/${productId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ready: isReady,
                    category: newCategory
                }),
            });

            if (res.ok) {
                showMessage('Producto actualizado correctamente', 'success');
                fetchProducts();
            } else {
                const errorData = await res.json();
                showMessage(errorData.error || 'Error al actualizar el producto', 'error');
                // Revertir en caso de error
                checkbox.checked = !isReady;
                fetchProducts();
            }
        } catch (error) {
            showMessage('Error de conexión. Inténtalo de nuevo.', 'error');
            // Revertir en caso de error
            checkbox.checked = !isReady;
            fetchProducts();
        }
    };

    /**
     * Función para mostrar modal de notas MEJORADO
     */
    window.showNotesModal = async (productId) => {
        try {
            const res = await fetch(`/api/products/${productId}`);
            const product = await res.json();

            if (res.ok) {
                let notes = [];
                if (product.nota) {
                    try {
                        notes = JSON.parse(product.nota);
                    } catch (e) {
                        notes = [{ text: product.nota, user: 'Sistema', date: new Date().toISOString() }];
                    }
                }

                // ✅ MEJORA: Crear modal con estructura identificable
                // En products.js, modifica la función initExcelExport o el modal HTML
                const modalHtml = `
  <div id="export-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50 hidden">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
      <div class="p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Exportar a Excel</h3>
          <button id="close-export-modal" class="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
            ✕
          </button>
        </div>

        <form id="export-form">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <input type="checkbox" name="applyCurrentFilters" checked class="mr-2">
                Aplicar filtros actuales de la vista
              </label>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Filtrar por categoría:
              </label>
              <select name="category" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                <option value="">Todas las categorías</option>
                <option value="Faltantes">Faltantes</option>
                <option value="Bajo Pedido">Bajo Pedido</option>
                <option value="Agotados con el Proveedor">Agotados con el Proveedor</option>
                <option value="Demasiadas Existencias">Demasiadas Existencias</option>
                <option value="Realizado">Realizado</option>
                <option value="Descontinuado">Descontinuado</option>
                <option value="Reemplazado">Reemplazado</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <input type="checkbox" name="includeRealizados" checked class="mr-2">
                Incluir productos "Realizados"
              </label>
            </div>

            <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Columnas a incluir:
              </h4>
              
              <div class="space-y-2">
                <label class="flex items-center">
                  <input type="checkbox" name="includePurchasePrice" checked class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                  <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Precio de compra</span>
                </label>
                
                <label class="flex items-center">
                  <input type="checkbox" name="includeSupplier" checked class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                  <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Proveedor</span>
                </label>
                
                <label class="flex items-center">
                  <input type="checkbox" name="includeNotes" checked class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                  <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Notas</span>
                </label>
              </div>
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <button type="button" id="cancel-export" class="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md shadow-sm hover:bg-gray-400 dark:hover:bg-gray-500">
              Cancelar
            </button>
            <button type="button" id="generate-export" class="px-4 py-2 bg-emerald-600 text-white rounded-md shadow-sm hover:bg-emerald-700">
              Generar Exportación
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
`;

                document.body.insertAdjacentHTML('beforeend', modalHtml);
            }
        } catch (err) {
            showMessage('Error al cargar las notas', 'error');
        }
    };

    // Función auxiliar para truncar texto
    const truncateText = (text, maxLength) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    // Configuración de autocompletado para SKU
    const setupSKUautocomplete = () => {
        const skuInput = document.getElementById('sku');
        let searchTimeout;
        let suggestionsContainer = null;

        // Crear contenedor de sugerencias
        const createSuggestionsContainer = () => {
            if (suggestionsContainer) return suggestionsContainer;

            suggestionsContainer = document.createElement('div');
            suggestionsContainer.id = 'sku-suggestions';
            suggestionsContainer.className = 'absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto hidden';
            skuInput.parentElement.style.position = 'relative';
            skuInput.parentElement.appendChild(suggestionsContainer);
            return suggestionsContainer;
        };

        const showSuggestions = (products) => {
            const container = createSuggestionsContainer();
            container.innerHTML = '';

            if (products.length === 0) {
                container.classList.add('hidden');
                return;
            }

            products.forEach(product => {
                const suggestion = document.createElement('div');
                suggestion.className = 'px-3 py-2 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-800 text-sm';
                suggestion.innerHTML = `
                    <div class="font-mono text-xs">${product.sku}</div>
                    <div class="text-gray-700 dark:text-gray-300 truncate">${product.name}</div>
                `;

                suggestion.addEventListener('click', () => {
                    skuInput.value = product.sku;
                    document.getElementById('name').value = product.name;
                    container.classList.add('hidden');
                });

                container.appendChild(suggestion);
            });

            container.classList.remove('hidden');
        };

        const hideSuggestions = () => {
            if (suggestionsContainer) {
                suggestionsContainer.classList.add('hidden');
            }
        };

        skuInput.addEventListener('input', async (e) => {
            const sku = e.target.value.trim();

            clearTimeout(searchTimeout);

            if (sku.length < 2) {
                hideSuggestions();
                return;
            }

            searchTimeout = setTimeout(async () => {
                try {
                    const res = await fetch(`/api/excel/search?search=${encodeURIComponent(sku)}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.success) {
                            showSuggestions(data.products);
                        }
                    }
                } catch (error) {
                    hideSuggestions();
                }
            }, 300);
        });

        // Ocultar sugerencias al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!skuInput.contains(e.target) && (!suggestionsContainer || !suggestionsContainer.contains(e.target))) {
                hideSuggestions();
            }
        });

        // Manejar teclas en el input
        skuInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                hideSuggestions();
            }
        });

        // Buscar producto exacto al perder foco
        skuInput.addEventListener('blur', () => {
            const sku = skuInput.value.trim();
            if (sku) {
                buscarProductoPorSKU();
            }
            // Pequeño delay para permitir el click en sugerencias
            setTimeout(hideSuggestions, 200);
        });
    };

    // Función mejorada para buscar producto por SKU
    window.buscarProductoPorSKU = async () => {
        const sku = document.getElementById('sku').value.trim();

        if (!sku) {
            showMessage('Ingresa un SKU para buscar', 'error');
            return;
        }

        try {
            const res = await fetch(`/api/excel/search/${encodeURIComponent(sku)}`);
            if (!res.ok) {
                return;
            }

            const data = await res.json();

            if (data.success) {
                document.getElementById('name').value = data.product.name;
                showMessage(`Producto encontrado: ${data.product.name}`, 'success');
            } else {
                showMessage('No se encontró producto con ese SKU en el Excel', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('Error al buscar el producto', 'error');
        }
    };

    // Event Listeners
    form.addEventListener('submit', handleSubmit);

    openAddModalBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
        resetForm();
    });

    closeModalBtn.addEventListener('click', closeModal);
    document.getElementById('cancel-add-modal').addEventListener('click', closeModal);

    confirmDeleteBtn.addEventListener('click', handleDelete);
    cancelDeleteBtn.addEventListener('click', () => deleteModal.classList.add('hidden'));
    closeDeleteModalBtn.addEventListener('click', () => deleteModal.classList.add('hidden'));

    // Eventos para las estrellas de importancia
    importanceStars.addEventListener('mouseover', (e) => {
        const value = e.target.dataset.value;
        if (value) {
            updateStarDisplay(parseInt(value));
        }
    });

    importanceStars.addEventListener('mouseout', () => {
        const currentValue = importanceInput.value || 1;
        updateStarDisplay(parseInt(currentValue));
    });

    importanceStars.addEventListener('click', (e) => {
        const value = e.target.dataset.value;
        if (value) {
            updateStarDisplay(parseInt(value));
        }
    });

    // Evento para agregar nota
    addNoteBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevenir propagación
        e.preventDefault(); // Prevenir comportamiento por defecto

        const newNoteText = newNoteTextarea.value.trim();
        if (newNoteText) {
            const newNote = {
                text: newNoteText,
                user: currentUsername,
                date: new Date().toISOString()
            };
            currentNotes.push(newNote);
            renderNotes(currentNotes, editingProductId); // ✅ Pasar productId para mejor estructura
            newNoteTextarea.value = '';
            hideUserSuggestions();
        }
    });

    // Eventos para filtros y ordenamiento
    filterCategorySelect.addEventListener('change', fetchProducts);
    sortBySelect.addEventListener('change', fetchProducts);
    sortOrderSelect.addEventListener('change', fetchProducts);
    filterReadySelect.addEventListener('change', fetchProducts);

    // Búsqueda con debounce
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            fetchProducts();
        }, 300);
    });

    // Cerrar modal al hacer clic fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) {
            deleteModal.classList.add('hidden');
        }
    });

    // ==================== FUNCIONALIDAD DE SELECCIÓN MÚLTIPLE ====================

    let selectedProducts = new Set();

    // Función para actualizar el contador de seleccionados
    const updateSelectedCount = () => {
        const count = selectedProducts.size;
        document.getElementById('selected-count').textContent = count;
        document.getElementById('apply-bulk-action').disabled = count === 0;
    };

    // Seleccionar/deseleccionar todos
    document.getElementById('select-all')?.addEventListener('change', function (e) {
        const checkboxes = document.querySelectorAll('.product-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = e.target.checked;
            if (e.target.checked) {
                selectedProducts.add(checkbox.value);
            } else {
                selectedProducts.delete(checkbox.value);
            }
        });
        updateSelectedCount();
    });

    // Manejar selección individual
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('product-checkbox')) {
            if (e.target.checked) {
                selectedProducts.add(e.target.value);
            } else {
                selectedProducts.delete(e.target.value);
                document.getElementById('select-all').checked = false;
            }
            updateSelectedCount();
        }
    });

    // Limpiar selección
    document.getElementById('clear-selection')?.addEventListener('click', () => {
        selectedProducts.clear();
        document.querySelectorAll('.product-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        document.getElementById('select-all').checked = false;
        updateSelectedCount();
    });

    // Aplicar acción en lote
    document.getElementById('apply-bulk-action')?.addEventListener('click', () => {
        const action = document.getElementById('bulk-action').value;
        if (!action) return;

        showBulkActionModal(action);
    });

    // Mostrar modal de acción en lote
    const showBulkActionModal = (action) => {
        const modal = document.getElementById('bulk-action-modal');
        const title = document.getElementById('bulk-modal-title');
        const content = document.getElementById('bulk-action-content');

        let modalContent = '';

        switch (action) {
            case 'change-category':
                title.textContent = 'Cambiar Categoría';
                modalContent = `
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nueva categoría:</label>
                    <select id="bulk-category" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                        <option value="Faltantes">Faltantes</option>
                        <option value="Bajo Pedido">Bajo Pedido</option>
                        <option value="Agotados con el Proveedor">Agotados con el Proveedor</option>
                        <option value="Demasiadas Existencias">Demasiadas Existencias</option>
                        <option value="Descontinuado">Descontinuado</option>
                        <option value="Reemplazado">Reemplazado</option>
                        ${userRole === 'admin' ? '<option value="Realizado">Realizado</option>' : ''}
                    </select>
                `;
                break;

            case 'change-ready':
                title.textContent = 'Cambiar Estado "Listo"';
                modalContent = `
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nuevo estado:</label>
                    <select id="bulk-ready" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                        <option value="true">Marcar como Listo</option>
                        <option value="false">Marcar como No Listo</option>
                    </select>
                `;
                break;

            case 'change-quantity':
                title.textContent = 'Cambiar Cantidad';
                modalContent = `
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nueva cantidad:</label>
                    <input type="number" id="bulk-quantity" min="0" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                `;
                break;

            case 'change-importance':
                title.textContent = 'Cambiar Importancia';
                modalContent = `
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nueva importancia (1-5):</label>
                    <input type="number" id="bulk-importance" min="1" max="5" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                `;
                break;

            case 'change-supplier':
                title.textContent = 'Cambiar Proveedor';
                modalContent = `
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nuevo proveedor:</label>
                    <input type="text" id="bulk-supplier" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                `;
                break;

            case 'change-brand':
                title.textContent = 'Cambiar Marca';
                modalContent = `
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nueva marca:</label>
                    <input type="text" id="bulk-brand" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                `;
                break;

            case 'delete':
                title.textContent = 'Eliminar Productos';
                modalContent = `
                    <p class="text-red-600 dark:text-red-400 font-medium">¿Estás seguro de que deseas eliminar ${selectedProducts.size} producto(s)?</p>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">Esta acción no se puede deshacer.</p>
                `;
                break;
        }

        content.innerHTML = modalContent;
        modal.classList.remove('hidden');
    };

    document.getElementById('confirm-bulk-action')?.addEventListener('click', async () => {
        const action = document.getElementById('bulk-action').value;
        const productIds = Array.from(selectedProducts);

        if (productIds.length === 0) {
            showMessage('No hay productos seleccionados', 'error');
            return;
        }

        try {
            let updateData = {};
            let isValid = true;
            let errorMessage = '';

            switch (action) {
                case 'change-category':
                    const newCategory = document.getElementById('bulk-category').value;
                    if (!newCategory) {
                        isValid = false;
                        errorMessage = 'Debes seleccionar una categoría';
                    } else {
                        updateData.category = newCategory;
                    }
                    break;

                case 'change-ready':
                    const readyValue = document.getElementById('bulk-ready').value;
                    updateData.ready = readyValue === 'true';
                    break;

                case 'change-quantity':
                    const quantityValue = document.getElementById('bulk-quantity').value;
                    const parsedQuantity = parseInt(quantityValue);
                    if (isNaN(parsedQuantity) || parsedQuantity < 0) {
                        isValid = false;
                        errorMessage = 'La cantidad debe ser un número válido mayor o igual a 0';
                    } else {
                        updateData.quantity = parsedQuantity;
                    }
                    break;

                case 'change-importance':
                    const importanceValue = document.getElementById('bulk-importance').value;
                    const parsedImportance = parseInt(importanceValue);
                    if (isNaN(parsedImportance) || parsedImportance < 1 || parsedImportance > 5) {
                        isValid = false;
                        errorMessage = 'La importancia debe ser un número entre 1 y 5';
                    } else {
                        updateData.importance = parsedImportance;
                    }
                    break;

                case 'change-supplier':
                    updateData.supplier = document.getElementById('bulk-supplier').value || 'N/A';
                    break;

                case 'change-brand':
                    updateData.brand = document.getElementById('bulk-brand').value || 'N/A';
                    break;
            }

            if (!isValid) {
                showMessage(errorMessage, 'error');
                return;
            }

            if (action === 'delete') {
                // Eliminar múltiples productos
                const deletePromises = productIds.map(id =>
                    fetch(`/api/products/${id}`, { method: 'DELETE' })
                );

                const results = await Promise.allSettled(deletePromises);
                const successfulDeletes = results.filter(result => result.status === 'fulfilled' && result.value.ok).length;

                showMessage(`${successfulDeletes} producto(s) eliminado(s) correctamente`, 'success');
            } else {
                // Actualizar múltiples productos - SOLO enviar los campos que se están actualizando
                const updatePromises = productIds.map(id =>
                    fetch(`/api/products/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updateData)
                    })
                );

                const results = await Promise.allSettled(updatePromises);

                // Procesar resultados
                const updateResults = await Promise.all(
                    results.map(async (result, index) => {
                        if (result.status === 'fulfilled') {
                            const response = result.value;
                            if (response.ok) {
                                return { success: true, id: productIds[index] };
                            } else {
                                const errorData = await response.json();
                                return {
                                    success: false,
                                    id: productIds[index],
                                    error: errorData.errors || errorData.error
                                };
                            }
                        } else {
                            return {
                                success: false,
                                id: productIds[index],
                                error: result.reason.message
                            };
                        }
                    })
                );

                const successfulUpdates = updateResults.filter(r => r.success).length;
                const failedUpdates = updateResults.filter(r => !r.success);

                if (successfulUpdates > 0) {
                    showMessage(`${successfulUpdates} producto(s) actualizado(s) correctamente`, 'success');
                }

                if (failedUpdates.length > 0) {
                    console.error('❌ Errores en actualizaciones:', failedUpdates);
                    const errorMessages = failedUpdates.map(f => f.error).filter(e => e);
                    if (errorMessages.length > 0) {
                        showMessage(`Algunas actualizaciones fallaron: ${errorMessages.join(', ')}`, 'error');
                    }
                }
            }

            // Cerrar modal y limpiar
            document.getElementById('bulk-action-modal').classList.add('hidden');
            document.getElementById('bulk-action').value = '';
            selectedProducts.clear();
            document.querySelectorAll('.product-checkbox').forEach(cb => cb.checked = false);
            document.getElementById('select-all').checked = false;
            updateSelectedCount();

            // Recargar productos
            fetchProducts();

        } catch (error) {
            console.error('Error en acción en lote:', error);
            showMessage('Error al procesar la acción en lote', 'error');
        }
    });

    // Cancelar acción en lote
    document.getElementById('cancel-bulk-action')?.addEventListener('click', () => {
        document.getElementById('bulk-action-modal').classList.add('hidden');
    });

    // =========================
    // 📜 FUNCIÓN DE HISTORIAL (modal + revertir cambios)
    // =========================

    const initHistory = () => {
        console.log("🧠 Inicializando historial...");

        const viewHistoryBtn = document.getElementById("view-history");
        const historyModal = document.getElementById("history-modal");
        const closeHistoryModal = document.getElementById("close-history-modal");
        const historyContent = document.getElementById("history-content");

        if (!viewHistoryBtn || !historyModal) {
            console.warn("⚠️ Elementos del historial no encontrados");
            return;
        }

        // ✅ Abrir modal al hacer clic en "Ver Historial"
        viewHistoryBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            console.log("🟢 Abriendo modal de historial...");
            historyModal.classList.remove("hidden");

            // Loader
            historyContent.innerHTML = `
            <div class="flex justify-center items-center p-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span class="ml-2 text-gray-600 dark:text-gray-400">Cargando historial...</span>
            </div>
        `;

            try {
                // 🔥 Consulta al backend
                const res = await fetch("/api/history/recent");
                if (!res.ok) throw new Error(`Error HTTP ${res.status}: ${res.statusText}`);

                const data = await res.json();
                console.log("📊 Historial recibido:", data);

                if (!data || data.length === 0) {
                    historyContent.innerHTML = `
                    <div class="text-center p-8">
                        <p class="text-gray-500 dark:text-gray-400">No hay registros en el historial.</p>
                    </div>
                `;
                    return;
                }

                // 🧱 Renderizar tabla
                historyContent.innerHTML = `
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead class="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Fecha</th>
                                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Acción</th>
                                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Producto</th>
                                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Usuario</th>
                                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Cambios</th>
                                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                            ${data.map(h => {
                    const date = new Date(h.createdAt);
                    const fecha = date.toLocaleDateString('es-ES');
                    const hora = date.toLocaleTimeString('es-ES');
                    const cambios = h.changedFields
                        ? Object.keys(h.changedFields).join(', ')
                        : (h.action === 'CREATE' ? 'Creación de producto' : h.action === 'DELETE' ? 'Eliminación' : 'Cambio general');

                    return `
                                    <tr class="hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <td class="px-4 py-3 text-sm text-gray-800 dark:text-gray-100">
                                            ${fecha}<br><span class="text-xs text-gray-500">${hora}</span>
                                        </td>
                                        <td class="px-4 py-3 text-sm">
                                            <span class="px-2 py-1 rounded-full text-xs font-semibold ${h.action === 'CREATE' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                            h.action === 'UPDATE' ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' :
                                h.action === 'DELETE' ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' :
                                    h.action === 'REVERT' ? 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100' :
                                        h.action === 'BULK_UPDATE' ? 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100' :
                                            'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
                        }">${h.action}</span>
                                        </td>
                                        <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                            ${h.product?.nombre || h.product?.SKU || '—'}
                                        </td>
                                        <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                            ${h.userName || 'Sistema'}
                                        </td>
                                        <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">${cambios}</td>
                                        <td class="px-4 py-3 text-center">
                                            ${h.action !== 'REVERT' && h.oldData ? `
                                                <button onclick="revertChange('${h.id}')" class="px-3 py-1 text-xs font-medium text-white bg-purple-600 rounded hover:bg-purple-700">
                                                    Revertir
                                                </button>
                                            ` : '-'}
                                        </td>
                                    </tr>
                                `;
                }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            } catch (error) {
                console.error("❌ Error al cargar historial:", error);
                historyContent.innerHTML = `
                <div class="text-center p-8 text-red-600 dark:text-red-400">
                    <p>Error al cargar el historial</p>
                    <p class="text-sm">${error.message}</p>
                </div>
            `;
            }
        });

        // ✅ Cerrar modal (botón)
        if (closeHistoryModal) {
            closeHistoryModal.addEventListener("click", () => {
                historyModal.classList.add("hidden");
            });
        }

        // ✅ Cerrar haciendo clic fuera del contenido
        historyModal.addEventListener("click", (e) => {
            if (e.target === historyModal) {
                historyModal.classList.add("hidden");
            }
        });

        // ✅ Cerrar con tecla ESC
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && !historyModal.classList.contains("hidden")) {
                historyModal.classList.add("hidden");
            }
        });

        console.log("✅ Módulo de historial inicializado correctamente");
    };

    // 🟣 Función global para revertir cambios
    window.revertChange = (historyId) => {
        const modal = document.getElementById("revert-modal");
        const confirmBtn = document.getElementById("confirm-revert-btn");
        const cancelBtn = document.getElementById("cancel-revert-btn");

        if (!modal || !confirmBtn || !cancelBtn) {
            console.error("❌ Modal de reversión no encontrado");
            return;
        }

        // Mostrar modal
        modal.classList.remove("hidden");

        // Limpiar handlers anteriores para evitar duplicados
        const newConfirm = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);

        const newCancel = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

        // Acción de confirmar
        newConfirm.addEventListener("click", async () => {
            newConfirm.disabled = true;
            newConfirm.textContent = "Revirtiendo...";

            try {
                const res = await fetch(`/api/history/revert/${historyId}`, { method: "POST" });
                const data = await res.json();

                if (res.ok) {
                    showMessage(data.message || "Cambio revertido con éxito", "success");
                    modal.classList.add("hidden");
                    fetchProducts();
                } else {
                    showMessage(data.error || "No se pudo revertir el cambio", "error");
                }
            } catch (err) {
                console.error("Error al revertir:", err);
                showMessage("Error de conexión al revertir", "error");
            } finally {
                newConfirm.disabled = false;
                newConfirm.textContent = "Revertir";
                modal.classList.add("hidden");
            }
        });

        // Acción de cancelar
        newCancel.addEventListener("click", () => {
            modal.classList.add("hidden");
        });

        // Cerrar modal con clic fuera
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                modal.classList.add("hidden");
            }
        });

        notesContainer.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // También prevenir en el textarea de nueva nota
        newNoteTextarea.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Y en el contenedor de sugerencias de usuarios
        if (userSuggestions) {
            userSuggestions.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    };

// En products.js, reemplaza la función initExcelExport con esta versión simplificada:
const initExcelExport = () => {
    const exportModal = document.getElementById('export-modal');
    const closeExportModal = document.getElementById('close-export-modal');
    const cancelExportBtn = document.getElementById('cancel-export');
    const generateExportBtn = document.getElementById('generate-export');
    const exportForm = document.getElementById('export-form');

    // Abrir modal
    document.addEventListener('click', (e) => {
        if (e.target.id === 'export-excel-btn' || e.target.closest('#export-excel-btn')) {
            if (exportModal) {
                exportModal.classList.remove('hidden');
            }
        }
    });

    // Cerrar modal
    if (closeExportModal) {
        closeExportModal.addEventListener('click', () => {
            exportModal.classList.add('hidden');
        });
    }

    if (cancelExportBtn) {
        cancelExportBtn.addEventListener('click', () => {
            exportModal.classList.add('hidden');
        });
    }

    // Cerrar modal al hacer clic fuera
    if (exportModal) {
        exportModal.addEventListener('click', (e) => {
            if (e.target === exportModal) {
                exportModal.classList.add('hidden');
            }
        });
    }

    // Generar exportación
    if (generateExportBtn) {
        generateExportBtn.addEventListener('click', async () => {
            if (!exportForm) return;

            const formData = new FormData(exportForm);
            const params = new URLSearchParams();
            
            // Parámetros básicos
            const category = formData.get('category');
            if (category && category !== '') {
                params.append('category', category);
            }

            // Campos opcionales - USANDO LOS NOMBRES CORRECTOS
            if (formData.get('includeCategoria') === 'on') {
                params.append('includeCategoria', 'true');
            }
            
            if (formData.get('includeImportancia') === 'on') {
                params.append('includeImportancia', 'true');
            }
            
            if (formData.get('includeEstado') === 'on') {
                params.append('includeEstado', 'true');
            }
            
            if (formData.get('includeUsuario') === 'on') {
                params.append('includeUsuario', 'true');
            }
            
            if (formData.get('includeFecha') === 'on') {
                params.append('includeFecha', 'true');
            }
            
            if (formData.get('includeMarca') === 'on') {
                params.append('includeMarca', 'true');
            }
            
            if (userRole === 'admin' && formData.get('includePrecioCompra') === 'on') {
                params.append('includePurchasePrice', 'true');
            }
            
            if (userRole === 'admin' && formData.get('includeProveedor') === 'on') {
                params.append('includeSupplier', 'true');
            }
            
            if (formData.get('includeNotas') === 'on') {
                params.append('includeNotes', 'true');
            }

            // Deshabilitar botón durante la generación
            const originalText = generateExportBtn.innerHTML;
            generateExportBtn.disabled = true;
            generateExportBtn.innerHTML = `
                <span class="flex items-center">
                    <svg class="animate-spin h-4 w-4 mr-2 text-white" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generando...
                </span>
            `;

            try {
                // Mostrar mensaje de inicio
                showMessage('Generando archivo Excel...', 'success');
                
                // Generar y descargar archivo
                const url = `/api/excel/export?${params.toString()}`;
                
                // Usar window.open para la descarga
                window.open(url, '_blank');
                
                // Cerrar modal
                setTimeout(() => {
                    if (exportModal) exportModal.classList.add('hidden');
                    showMessage('✅ Archivo Excel generado correctamente', 'success');
                }, 1000);

            } catch (error) {
                console.error('Error al generar exportación:', error);
                showMessage('❌ Error al generar la exportación', 'error');
            } finally {
                // Restaurar estado del botón
                setTimeout(() => {
                    generateExportBtn.disabled = false;
                    generateExportBtn.innerHTML = originalText;
                }, 2000);
            }
        });
    }

    // Manejar la tecla ESC para cerrar modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && exportModal && !exportModal.classList.contains('hidden')) {
            exportModal.classList.add('hidden');
        }
    });
};

    const init = async () => {
        setupSKUautocomplete();
        fetchProducts();
        updateStarDisplay(1);
        await loadAvailableUsers();
        initExcelExport(); // ← Agrega esta línea
        initHistory(); // ✅ Agregamos inicialización del historial
    };

    // Iniciar la aplicación
    init();
});