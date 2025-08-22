// products.js
document.addEventListener('DOMContentLoaded', () => {
    // Obteniendo elementos del DOM
    const form = document.getElementById('product-form');
    const productsTableBody = document.getElementById('products-table-body');
    const themeToggle = document.getElementById('theme-toggle');
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');
    const modal = document.getElementById('product-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const openAddModalBtn = document.getElementById('open-add-modal');
    const adminFields = document.getElementById('admin-fields');
    const importanceStars = document.getElementById('importance-stars');
    const importanceInput = document.getElementById('importance');
    const filterCategorySelect = document.getElementById('filter-category');
    const sortBySelect = document.getElementById('sort-by');
    const readyToggle = document.getElementById('ready');
    const notesContainer = document.getElementById('notes-container');
    const newNoteTextarea = document.getElementById('note-new');
    const addNoteBtn = document.getElementById('add-note-btn');
    const noNotesMessage = document.getElementById('no-notes-message');
    const categorySelect = document.getElementById('category'); // Nuevo

    const deleteModal = document.getElementById('delete-modal');
    const closeDeleteModalBtn = document.getElementById('close-delete-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

    let editingProductId = null;
    let deleteProductId = null;
    let currentNotes = []; // Almacena las notas del producto que se está editando

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
        const messageContainer = document.getElementById('message-container');
        if (!messageContainer) return;
        messageContainer.innerHTML = '';
        const p = document.createElement('p');
        p.textContent = message;
        p.className = `p-3 mt-4 rounded-md font-medium text-sm text-center ${type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200' :
            'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200'
            }`;
        messageContainer.appendChild(p);
        setTimeout(() => p.remove(), 3000);
    };

    /**
     * Actualiza la visualización de las estrellas.
     */
    const updateStarDisplay = (value) => {
        importanceStars.querySelectorAll('svg').forEach(star => {
            const starValue = parseInt(star.dataset.value);
            if (starValue <= value) {
                star.classList.add('text-yellow-400');
                star.classList.remove('text-gray-300');
            } else {
                star.classList.add('text-gray-300');
                star.classList.remove('text-yellow-400');
            }
        });
    };

    /**
     * Resetea el formulario y los valores de edición.
     */
    const resetForm = () => {
        form.reset();
        editingProductId = null;
        document.querySelector('#modal-title').textContent = 'Agregar Producto';
        document.querySelector('button[type="submit"]').textContent = 'Guardar Producto';
        updateStarDisplay(0);
        readyToggle.checked = false;
        notesContainer.innerHTML = '';
        currentNotes = [];
        noNotesMessage.classList.remove('hidden');
        renderAdminFields(); // Se asegura que los campos de admin estén correctamente ocultos/visibles
    };

    /**
     * Muestra u oculta los campos de admin y ajusta la categoría.
     */
    const renderAdminFields = () => {
        if (userRole === 'admin') {
            adminFields.classList.remove('hidden');
            Array.from(categorySelect.options).forEach(option => {
                option.disabled = false;
            });
        } else {
            adminFields.classList.add('hidden');
            // Restringe las opciones de categoría para el rol 'user'
            categorySelect.value = 'Faltantes';
            Array.from(categorySelect.options).forEach(option => {
                if (option.value === 'Realizado') {
                    option.disabled = true;
                }
            });
        }
    };
    
    // Ejecutar al cargar la página para aplicar las reglas de rol
    renderAdminFields();

    /**
     * Renderiza las notas en el modal.
     */
    const renderNotes = (notes) => {
        notesContainer.innerHTML = '';
        if (notes && notes.length > 0) {
            noNotesMessage.classList.add('hidden');
            notes.forEach(note => {
                const noteDiv = document.createElement('div');
                noteDiv.className = 'p-2 my-2 rounded-md bg-gray-200 dark:bg-gray-600';
                noteDiv.innerHTML = `
                    <p class="text-xs text-gray-600 dark:text-gray-300 font-bold">${note.user} <span class="font-normal text-gray-500 dark:text-gray-400">- ${new Date(note.date).toLocaleString()}</span></p>
                    <p class="text-sm text-gray-800 dark:text-gray-200">${note.text}</p>
                `;
                notesContainer.appendChild(noteDiv);
            });
        } else {
            noNotesMessage.classList.remove('hidden');
        }
        notesContainer.scrollTop = notesContainer.scrollHeight;
    };
    
    // Agregar un evento de input para la funcionalidad de @etiquetar
    newNoteTextarea.addEventListener('input', async (e) => {
        const text = e.target.value;
        const lastAtSignIndex = text.lastIndexOf('@');

        if (lastAtSignIndex !== -1 && (text.length === lastAtSignIndex + 1 || text.charAt(lastAtSignIndex + 1).trim() !== '')) {
            const query = text.substring(lastAtSignIndex + 1).trim();
            // Llama a la API para buscar usuarios
            try {
                const res = await fetch(`/api/users/search?q=${query}`);
                if (!res.ok) throw new Error('Error fetching users');
                const users = await res.json();
                
                // Crea una lista de sugerencias de usuarios
                const suggestionsList = document.getElementById('user-suggestions');
                if (suggestionsList) suggestionsList.remove(); // Elimina la lista anterior si existe

                const newSuggestionsList = document.createElement('ul');
                newSuggestionsList.id = 'user-suggestions';
                newSuggestionsList.className = 'absolute z-10 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md mt-1 shadow-lg';

                users.forEach(user => {
                    const listItem = document.createElement('li');
                    listItem.className = 'p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-sm text-gray-900 dark:text-gray-100';
                    listItem.textContent = user.username;
                    listItem.addEventListener('click', () => {
                        const newText = text.substring(0, lastAtSignIndex) + `@${user.username} `;
                        newNoteTextarea.value = newText;
                        newSuggestionsList.remove();
                        newNoteTextarea.focus();
                    });
                    newSuggestionsList.appendChild(listItem);
                });

                if (users.length > 0) {
                    newNoteTextarea.parentNode.style.position = 'relative';
                    newNoteTextarea.parentNode.appendChild(newSuggestionsList);
                }

            } catch (err) {
                console.error('Error al buscar usuarios:', err);
            }
        } else {
            const suggestionsList = document.getElementById('user-suggestions');
            if (suggestionsList) suggestionsList.remove();
        }
    });

    /**
     * Obtiene y muestra todos los productos desde el backend, con filtros y ordenamiento.
     */
    const fetchProducts = async () => {
        const category = filterCategorySelect.value;
        const sortBy = sortBySelect.value;
        let url = '/api/products';
        const params = new URLSearchParams();

        if (category) {
            params.append('category', category);
        }
        if (sortBy) {
            const [field, order] = sortBy.split('_');
            params.append('sort', field);
            params.append('order', order);
        }
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        
        try {
            const res = await fetch(url);
            if (!res.ok) {
                if (res.status === 403) {
                    showMessage('Acceso denegado. No tienes permiso para ver los productos.', 'error');
                } else {
                    showMessage('Error al cargar los productos.', 'error');
                }
                productsTableBody.innerHTML = '<tr><td colspan="10" class="text-center py-4 text-gray-500 dark:text-gray-400">No se pudo cargar la lista de productos.</td></tr>';
                return;
            }

            const products = await res.json();
            productsTableBody.innerHTML = ''; // Limpiar tabla

            products.forEach(product => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-100 dark:hover:bg-gray-700';

                // Determina la visualización de notas
                let notesHtml = `<td class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">N/A</td>`;
                if (product.nota && product.nota.length > 0) {
                    try {
                         const notes = JSON.parse(product.nota);
                         if (notes.length > 0) {
                              notesHtml = `
                                  <td class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                      <span class="relative inline-block" title="${notes.map(n => n.text).join('\n')}">
                                          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 hover:text-indigo-600 transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                          </svg>
                                      </span>
                                  </td>
                              `;
                          }
                    } catch (e) {
                        // Si la nota no es un JSON válido, mostrarla como texto simple
                        notesHtml = `
                          <td class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              <span class="relative inline-block" title="${product.nota}">
                                  <svg class="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.395 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                              </span>
                          </td>
                        `;
                    }
                }
                // Determina si se muestran los campos de admin
                let adminFieldsHtml = '';
                let actionsHtml = `<td class="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><button onclick="editProduct('${product.id}')" class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-600"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg></button></td>`;
                if (userRole === 'admin') {
                    const readyText = product.listo ? 'Sí' : 'No';
                    adminFieldsHtml = `
                        <td class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${product.cantidad}</td>
                        <td class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">$${product.precio_compra}</td>
                        <td class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${product.proveedor || 'N/A'}</td>
                        <td class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${readyText}</td>
                    `;
                    actionsHtml = `
                        <td class="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button onclick="editProduct('${product.id}')" class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-600">
                                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg>
                            </button>
                            <button onclick="deleteProduct('${product.id}')" class="ml-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-600">
                                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                            </button>
                        </td>
                    `;
                }

                row.innerHTML = `
                    <td class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">${product.SKU}</td>
                    <td class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${product.nombre}</td>
                    ${adminFieldsHtml}
                    <td class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${product.usuario}</td>
                    <td class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${product.categoria}</td>
                    <td class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${'⭐'.repeat(product.importancia)}</td>
                    ${notesHtml}
                    ${actionsHtml}
                `;
                productsTableBody.appendChild(row);
            });

            if (products.length === 0) {
                productsTableBody.innerHTML = '<tr><td colspan="10" class="text-center py-4 text-gray-500 dark:text-gray-400">No hay productos para mostrar.</td></tr>';
            }

        } catch (err) {
            console.error('Error al obtener productos:', err);
            showMessage('Error al cargar los productos.', 'error');
            productsTableBody.innerHTML = '<tr><td colspan="10" class="text-center py-4 text-gray-500 dark:text-gray-400">No se pudo cargar la lista de productos.</td></tr>';
        }
    };

    /**
     * Muestra el modal con los datos del producto para edición.
     */
    window.editProduct = async (id) => {
        try {
            const res = await fetch(`/api/products/${id}`);
            if (!res.ok) throw new Error('Producto no encontrado.');
            const product = await res.json();
            
            // Restricción de acceso a la edición
            if (userRole !== 'admin') {
                showMessage('Acceso denegado. Solo un administrador puede editar productos.', 'error');
                return;
            }

            editingProductId = id;
            document.querySelector('#modal-title').textContent = 'Editar Producto';
            document.querySelector('button[type="submit"]').textContent = 'Actualizar Producto';

            document.getElementById('sku').value = product.SKU;
            document.getElementById('name').value = product.nombre;
            document.getElementById('quantity').value = product.cantidad;
            document.getElementById('category').value = product.categoria;
            document.getElementById('importance').value = product.importancia;
            document.getElementById('purchasePrice').value = product.precio_compra;
            document.getElementById('supplier').value = product.proveedor;
            readyToggle.checked = product.listo;
            
            // Cargar notas
            try {
                currentNotes = product.nota ? JSON.parse(product.nota) : [];
            } catch (e) {
                currentNotes = product.nota ? [{ text: product.nota, user: 'sistema', date: new Date().toISOString() }] : [];
            }
            renderNotes(currentNotes);

            updateStarDisplay(product.importancia);
            modal.classList.remove('hidden');

        } catch (err) {
            console.error('Error al obtener el producto para editar:', err);
            showMessage('Error al cargar el producto para edición.', 'error');
        }
    };
    
    // Función para eliminar un producto
    window.deleteProduct = (id) => {
        // Restricción de acceso a la eliminación
        if (userRole !== 'admin') {
            showMessage('Acceso denegado. Solo un administrador puede eliminar productos.', 'error');
            return;
        }

        deleteProductId = id;
        deleteModal.classList.remove('hidden');
    };

    // Evento para agregar nota
    addNoteBtn.addEventListener('click', (e) => {
        const newNoteText = newNoteTextarea.value.trim();
        if (newNoteText) {
            const newNote = {
                text: newNoteText,
                user: '<%- username %>',
                date: new Date().toISOString()
            };
            currentNotes.push(newNote);
            renderNotes(currentNotes);
            newNoteTextarea.value = ''; // Limpiar el campo
        }
    });

    // Eventos del formulario
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Manejar las notas como un array JSON
        data.note = JSON.stringify(currentNotes);

        const url = editingProductId ? `/api/products/${editingProductId}` : '/api/products';
        const method = editingProductId ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await res.json();

            if (res.ok) {
                showMessage(result.message, 'success');
                modal.classList.add('hidden');
                resetForm();
                fetchProducts();
            } else {
                showMessage(result.error, 'error');
            }

        } catch (err) {
            console.error('Error al guardar el producto:', err);
            showMessage('Error de conexión. Inténtalo de nuevo.', 'error');
        }
    });

    // Eventos para el modal
    openAddModalBtn.addEventListener('click', () => {
        resetForm();
        modal.classList.remove('hidden');
    });
    closeModalBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });

    // Eventos para las estrellas
    importanceStars.addEventListener('mouseover', (e) => {
        const value = e.target.dataset.value;
        if (value) {
            updateStarDisplay(parseInt(value));
        }
    });

    importanceStars.addEventListener('mouseout', () => {
        const currentValue = importanceInput.value;
        updateStarDisplay(parseInt(currentValue));
    });

    importanceStars.addEventListener('click', (e) => {
        const value = e.target.dataset.value;
        if (value) {
            importanceInput.value = value;
            updateStarDisplay(parseInt(value));
        }
    });

    // Eventos para filtros y ordenamiento
    filterCategorySelect.addEventListener('change', fetchProducts);
    sortBySelect.addEventListener('change', fetchProducts);

    // Eventos del modal de eliminación
    closeDeleteModalBtn.addEventListener('click', () => deleteModal.classList.add('hidden'));
    cancelDeleteBtn.addEventListener('click', () => deleteModal.classList.add('hidden'));

    confirmDeleteBtn.addEventListener('click', async () => {
        try {
            const res = await fetch(`/api/products/${deleteProductId}`, {
                method: 'DELETE'
            });

            const result = await res.json();

            if (res.ok) {
                showMessage(result.message, 'success');
                deleteModal.classList.add('hidden');
                fetchProducts();
            } else {
                showMessage(result.error, 'error');
            }

        } catch (err) {
            console.error('Error al eliminar el producto:', err);
            showMessage('Error de conexión al eliminar el producto.', 'error');
        }
    });

    // Carga inicial de productos
    fetchProducts();
});