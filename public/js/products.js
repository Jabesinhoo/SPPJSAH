// products.js - Modificado con autocompletado desde Excel
document.addEventListener('DOMContentLoaded', () => {
    // Obteniendo elementos del DOM
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
    let availableUsers = []; // Lista de usuarios para etiquetado
    let mentionUsers = []; // Usuarios mencionados en la nota actual
    let searchTimeout;

    // Obtener lista de usuarios para etiquetado
    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users');
            if (res.ok) {
                const users = await res.json();
                availableUsers = users.map(user => ({ username: user }));
                console.log('Usuarios disponibles para etiquetado:', availableUsers);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

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
    const showMessage = (message, type) => {
        // Crear contenedor de mensaje si no existe
        let messageContainer = document.getElementById('message-container');
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.id = 'message-container';
            messageContainer.className = 'fixed top-4 right-4 z-50';
            document.body.appendChild(messageContainer);
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `p-4 rounded-md shadow-lg mb-2 ${type === 'success'
            ? 'bg-green-100 text-green-800 border-green-200'
            : 'bg-red-100 text-red-800 border-red-200'} border`;
        messageDiv.textContent = message;

        messageContainer.appendChild(messageDiv);

        setTimeout(() => {
            messageDiv.remove();
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
        mentionUsers = [];

        // Resetear categoría para usuarios normales
        if (userRole !== 'admin') {
            document.getElementById('category').value = 'Faltantes';
        }
    };

    /**
     * Sistema de etiquetado con @ - CORREGIDO
     */
    const setupMentionSystem = () => {
        let currentQuery = '';
        let mentionStart = -1;

        newNoteTextarea.addEventListener('input', (e) => {
            const text = e.target.value;
            const cursorPos = e.target.selectionStart;

            // Buscar @ más reciente antes del cursor
            const beforeCursor = text.substring(0, cursorPos);
            const lastAtIndex = beforeCursor.lastIndexOf('@');

            if (lastAtIndex !== -1) {
                const textAfterAt = beforeCursor.substring(lastAtIndex + 1);

                // Verificar si no hay espacios después del @
                if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
                    currentQuery = textAfterAt.toLowerCase();
                    mentionStart = lastAtIndex;
                    showUserSuggestions(currentQuery, cursorPos);
                    return;
                }
            }

            hideUserSuggestions();
        });

        newNoteTextarea.addEventListener('keydown', (e) => {
            const suggestions = userSuggestions.querySelectorAll('.user-suggestion');
            const activeSuggestion = userSuggestions.querySelector('.user-suggestion.active');

            if (suggestions.length > 0 && !userSuggestions.classList.contains('hidden')) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const nextSuggestion = activeSuggestion ?
                        activeSuggestion.nextElementSibling || suggestions[0] :
                        suggestions[0];
                    setActiveSuggestion(nextSuggestion);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const prevSuggestion = activeSuggestion ?
                        activeSuggestion.previousElementSibling || suggestions[suggestions.length - 1] :
                        suggestions[suggestions.length - 1];
                    setActiveSuggestion(prevSuggestion);
                } else if (e.key === 'Enter' && activeSuggestion) {
                    e.preventDefault();
                    selectUser(activeSuggestion.dataset.username);
                } else if (e.key === 'Escape') {
                    hideUserSuggestions();
                }
            }
        });

        // Mostrar sugerencias al enfocar
        newNoteTextarea.addEventListener('focus', () => {
            if (availableUsers.length > 0) {
                showAllUsersSuggestions();
            }
        });
    };

    const showUserSuggestions = (query, cursorPos) => {
        console.log('Buscando usuarios con query:', query);
        const filteredUsers = availableUsers.filter(user =>
            user.username.toLowerCase().includes(query)
        );

        console.log('Usuarios filtrados:', filteredUsers);

        if (filteredUsers.length === 0) {
            hideUserSuggestions();
            return;
        }

        suggestionsList.innerHTML = '';
        filteredUsers.forEach((user, index) => {
            const suggestion = document.createElement('div');
            suggestion.className = 'user-suggestion px-3 py-2 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-800 text-sm flex items-center';
            suggestion.dataset.username = user.username;

            suggestion.innerHTML = `
                <div class="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs mr-2">
                    ${user.username.charAt(0).toUpperCase()}
                </div>
                <span>@${user.username}</span>
            `;

            if (index === 0) {
                suggestion.classList.add('active', 'bg-indigo-100', 'dark:bg-indigo-800');
            }

            suggestion.addEventListener('click', () => selectUser(user.username));
            suggestionsList.appendChild(suggestion);
        });

        userSuggestions.classList.remove('hidden');

        // Posicionar el dropdown
        const textareaRect = newNoteTextarea.getBoundingClientRect();
        userSuggestions.style.top = `${textareaRect.height + 5}px`;
        userSuggestions.style.left = '0';
    };

    const showAllUsersSuggestions = () => {
        suggestionsList.innerHTML = '';

        availableUsers.forEach((user, index) => {
            const suggestion = document.createElement('div');
            suggestion.className = 'user-suggestion px-3 py-2 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-800 text-sm flex items-center';
            suggestion.dataset.username = user.username;

            suggestion.innerHTML = `
                <div class="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs mr-2">
                    ${user.username.charAt(0).toUpperCase()}
                </div>
                <span>@${user.username}</span>
            `;

            suggestion.addEventListener('click', () => selectUser(user.username));
            suggestionsList.appendChild(suggestion);
        });

        userSuggestions.classList.remove('hidden');
    };

    const hideUserSuggestions = () => {
        userSuggestions.classList.add('hidden');
        suggestionsList.innerHTML = '';
    };

    const setActiveSuggestion = (suggestion) => {
        userSuggestions.querySelectorAll('.user-suggestion').forEach(s => {
            s.classList.remove('active', 'bg-indigo-100', 'dark:bg-indigo-800');
        });
        suggestion.classList.add('active', 'bg-indigo-100', 'dark:bg-indigo-800');
    };

    const selectUser = (username) => {
        const textarea = newNoteTextarea;
        const currentText = textarea.value;
        const cursorPos = textarea.selectionStart;

        // Encontrar el inicio del @
        const beforeCursor = currentText.substring(0, cursorPos);
        const lastAtIndex = beforeCursor.lastIndexOf('@');

        if (lastAtIndex !== -1) {
            const beforeMention = currentText.substring(0, lastAtIndex);
            const textAfterAt = beforeCursor.substring(lastAtIndex + 1);
            const afterCursor = currentText.substring(cursorPos);

            // Reemplazar solo la parte después del @
            const newText = `${beforeMention}@${username} ${afterCursor}`;

            textarea.value = newText;
            const newCursorPos = lastAtIndex + username.length + 2;
            textarea.setSelectionRange(newCursorPos, newCursorPos);

            // Agregar usuario a la lista de mencionados
            if (!mentionUsers.includes(username)) {
                mentionUsers.push(username);
            }

            console.log('Usuario etiquetado:', username);
            console.log('Mencionados actuales:', mentionUsers);
        }

        hideUserSuggestions();
        textarea.focus();
    };

    /**
     * Renderiza las notas en el modal.
     */
    const renderNotes = (notes) => {
        notesContainer.innerHTML = '';

        if (notes && notes.length > 0) {
            noNotesMessage.classList.add('hidden');
            notes.forEach(note => {
                const noteDiv = document.createElement('div');
                noteDiv.className = 'p-3 my-2 rounded-md bg-gray-100 dark:bg-gray-600 border-l-4 border-indigo-500';

                // Procesar menciones en el texto
                let processedText = note.text;
                const mentionRegex = /@(\w+)/g;
                processedText = processedText.replace(mentionRegex, '<span class="bg-indigo-200 dark:bg-indigo-700 px-1 rounded text-indigo-800 dark:text-indigo-200 font-semibold">@$1</span>');

                // Formatear fecha y hora
                const noteDate = new Date(note.date);
                const formattedDate = noteDate.toLocaleDateString();
                const formattedTime = noteDate.toLocaleTimeString();

                noteDiv.innerHTML = `
                    <div class="flex justify-between items-start mb-2">
                        <p class="text-xs text-gray-600 dark:text-gray-300 font-bold">${note.user}</p>
                        <div class="text-right">
                            <span class="text-xs text-gray-500 dark:text-gray-400 block">${formattedDate}</span>
                            <span class="text-xs text-gray-500 dark:text-gray-400">${formattedTime}</span>
                        </div>
                    </div>
                    <p class="text-sm text-gray-800 dark:text-gray-200">${processedText}</p>
                `;
                notesContainer.appendChild(noteDiv);
            });
        } else {
            noNotesMessage.classList.remove('hidden');
        }

        notesContainer.scrollTop = notesContainer.scrollHeight;
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
        No puede marcarse “Listo” si está en “Faltantes”
      </div>` : ''}
  </div>
`;


                // Notas con modal
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
                            ${product.precio_compra ? `${parseFloat(product.precio_compra).toFixed(2)}` : '-'}
                        </td>
                        <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            ${product.proveedor || '-'}
                        </td>
                        <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
  ${product.marca || '-'} <!-- Nuevo campo marca -->
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
            console.error('Error fetching products:', err);
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

        if (userRole === 'admin') {
            productData.purchasePrice = Math.max(0, parseFloat(formData.get('purchasePrice')) || 0);
            productData.supplier = formData.get('supplier') || '';
            productData.brand = formData.get('brand') || ''; // Nuevo campo marca

            productData.ready = readyToggle ? readyToggle.checked : false;
        } else {
            // Para usuarios normales, forzar valores por defecto
            productData.purchasePrice = 0;
            productData.supplier = 'N/A';
            productData.ready = false;
        }

        // Manejar notas
        const newNoteText = newNoteTextarea.value.trim();
        if (newNoteText) {
            const newNote = {
                text: newNoteText,
                user: currentUsername,
                date: new Date().toISOString(),
                mentions: mentionUsers
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
        hideUserSuggestions();
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

                if (userRole === 'admin') {
                    document.getElementById('purchase-price').value = product.precio_compra || '';
                    document.getElementById('supplier').value = product.proveedor || '';
                    document.getElementById('brand').value = product.marca || ''; // Nuevo campo marca

                    if (readyToggle) readyToggle.checked = product.listo || false;
                }

                // Cargar y renderizar notas
                if (product.nota) {
                    try {
                        currentNotes = JSON.parse(product.nota);
                        renderNotes(currentNotes);
                    } catch (e) {
                        currentNotes = [{
                            text: product.nota,
                            user: 'Sistema',
                            date: new Date().toISOString(),
                            mentions: []
                        }];
                        renderNotes(currentNotes);
                    }
                } else {
                    currentNotes = [];
                    renderNotes([]);
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
    window.toggleReady = async (productId, isReady) => {
        try {
            // Primero obtener el producto actual para verificar la categoría
            const resGet = await fetch(`/api/products/${productId}`);
            const product = await resGet.json();

            if (!resGet.ok) {
                throw new Error('Error al obtener el producto');
            }

            // Verificar si se puede cambiar a "Listo"
            if (isReady && product.categoria === 'Faltantes') {
                showMessage('No se puede marcar como listo un producto en categoría "Faltantes"', 'error');
                // Recargar para revertir el cambio visual
                fetchProducts();
                return;
            }

            // Si está desmarcando "Listo", volver a la categoría anterior o por defecto
            let newCategory = product.categoria;
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
                fetchProducts();
            }
        } catch (error) {
            showMessage('Error de conexión. Inténtalo de nuevo.', 'error');
            fetchProducts();
        }
    };

    /**
     * Función para mostrar modal de notas
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

                // Crear y mostrar modal con todas las notas
                const modalHtml = `
                    <div class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-96 overflow-y-auto">
                            <div class="p-6">
                                <div class="flex justify-between items-center mb-4">
                                    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Notas del Producto: ${product.nombre}</h3>
                                    <button onclick="this.closest('.fixed').remove()" class="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                                        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div class="space-y-3">
                                    ${notes.length > 0 ? notes.map(note => `
                                        <div class="p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
                                            <div class="flex justify-between items-start mb-2">
                                                <p class="text-sm font-medium text-gray-700 dark:text-gray-300">${note.user}</p>
                                                <div class="text-right">
                                                    <span class="text-xs text-gray-500 dark:text-gray-400 block">${new Date(note.date).toLocaleDateString()}</span>
                                                    <span class="text-xs text-gray-500 dark:text-gray-400">${new Date(note.date).toLocaleTimeString()}</span>
                                                </div>
                                            </div>
                                            <p class="text-gray-800 dark:text-gray-200">${note.text}</p>
                                            ${note.mentions && note.mentions.length > 0 ? `
                                                <div class="mt-2">
                                                    <span class="text-xs text-gray-500 dark:text-gray-400">Mencionados: ${note.mentions.join(', ')}</span>
                                                </div>
                                            ` : ''}
                                        </div>
                                    `).join('') : '<p class="text-gray-500 dark:text-gray-400 text-center">No hay notas para este producto.</p>'}
                                </div>
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
                    console.log('Error en búsqueda automática:', error);
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
    addNoteBtn.addEventListener('click', () => {
        const newNoteText = newNoteTextarea.value.trim();
        if (newNoteText) {
            const newNote = {
                text: newNoteText,
                user: currentUsername,
                date: new Date().toISOString(),
                mentions: mentionUsers.slice()
            };
            currentNotes.push(newNote);
            renderNotes(currentNotes);
            newNoteTextarea.value = '';
            mentionUsers = [];
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

    // Cerrar sugerencias al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!userSuggestions.contains(e.target) && e.target !== newNoteTextarea) {
            hideUserSuggestions();
        }
    });

    // Inicialización
    const init = async () => {
        await fetchUsers();
        setupMentionSystem();
        setupSKUautocomplete(); // Configurar autocompletado de SKU
        fetchProducts();
        // Establecer importancia inicial
        updateStarDisplay(1);
    };

    // Iniciar la aplicación
    init();
});