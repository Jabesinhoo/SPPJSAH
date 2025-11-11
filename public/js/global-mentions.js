// public/js/global-mentions.js
// Sistema global de menciones que funciona en toda la aplicación

class GlobalMentionSystem {
  constructor() {
    this.availableUsers = [];
    this.currentUser = window.currentUsername || '';
    this.activeDropdown = null;
    this.observers = new Set();
    this.init();
  }

  async init() {
    
    // Cargar usuarios disponibles
    await this.loadAvailableUsers();
    
    // Configurar observer para elementos dinámicos
    this.setupDOMObserver();
    
    // Configurar elementos existentes
    this.setupExistingElements();
    
    // Configurar eventos globales
    this.setupGlobalEvents();
    
  }

  async loadAvailableUsers() {
    try {
      const response = await fetch('/api/notifications/available-users');
      if (response.ok) {
        const data = await response.json();
        this.availableUsers = data.users || [];
      }
    } catch (error) {
    }
  }

  setupDOMObserver() {
    // Observer para detectar nuevos elementos de texto agregados dinámicamente
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.processNewElement(node);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    this.observers.add(observer);
  }

  processNewElement(element) {
    // Buscar textareas e inputs de texto en el nuevo elemento
    const textElements = element.querySelectorAll ? 
      element.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]') : [];
    
    textElements.forEach(textElement => {
      this.addMentionSupport(textElement);
    });

    // Si el elemento mismo es un campo de texto
    if (this.isTextElement(element)) {
      this.addMentionSupport(element);
    }
  }

  setupExistingElements() {
    // Configurar todos los elementos de texto existentes
    const textElements = document.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]');
    textElements.forEach(element => {
      this.addMentionSupport(element);
    });
  }

  setupGlobalEvents() {
    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (this.activeDropdown && 
          !this.activeDropdown.contains(e.target) && 
          !this.activeDropdown.parentElement.contains(e.target)) {
        this.hideDropdown(this.activeDropdown);
      }
    });

    // Cerrar dropdown con Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeDropdown) {
        this.hideDropdown(this.activeDropdown);
      }
    });
  }

  isTextElement(element) {
    return element.tagName === 'TEXTAREA' || 
           (element.tagName === 'INPUT' && element.type === 'text') ||
           element.contentEditable === 'true';
  }

  addMentionSupport(element) {
    // Evitar agregar soporte múltiples veces
    if (element.dataset.mentionSupport === 'enabled') {
      return;
    }

    element.dataset.mentionSupport = 'enabled';

    // Eventos para detección de menciones
    element.addEventListener('input', (e) => this.handleInput(e, element));
    element.addEventListener('keydown', (e) => this.handleKeydown(e, element));
    element.addEventListener('focus', () => this.handleFocus(element));
    element.addEventListener('blur', () => this.handleBlur(element));

  }

  handleInput(event, element) {
    const text = this.getElementText(element);
    const cursorPos = this.getCursorPosition(element);

    // Buscar @ más reciente antes del cursor
    const beforeCursor = text.substring(0, cursorPos);
    const lastAtIndex = beforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = beforeCursor.substring(lastAtIndex + 1);

      // Verificar si no hay espacios después del @
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        this.showSuggestions(element, textAfterAt, lastAtIndex);
        return;
      }
    }

    this.hideSuggestions(element);
  }

  handleKeydown(event, element) {
    const dropdown = this.getDropdownForElement(element);
    if (!dropdown || dropdown.classList.contains('hidden')) {
      return;
    }

    const suggestions = dropdown.querySelectorAll('.mention-suggestion');
    const activeSuggestion = dropdown.querySelector('.mention-suggestion.active');

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.navigateSuggestions(dropdown, 'down');
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.navigateSuggestions(dropdown, 'up');
        break;
      case 'Enter':
        if (activeSuggestion) {
          event.preventDefault();
          this.selectUser(element, activeSuggestion.dataset.username);
        }
        break;
      case 'Escape':
        this.hideSuggestions(element);
        break;
    }
  }

  handleFocus(element) {
    // Opcional: lógica adicional cuando el elemento recibe foco
  }

  handleBlur(element) {
    // Retrasar el ocultado para permitir clic en sugerencias
    setTimeout(() => {
      this.hideSuggestions(element);
    }, 200);
  }

  getElementText(element) {
    return element.contentEditable === 'true' ? element.innerText : element.value;
  }

  getCursorPosition(element) {
    if (element.contentEditable === 'true') {
      const selection = window.getSelection();
      return selection.anchorOffset;
    }
    return element.selectionStart;
  }

  setCursorPosition(element, position) {
    if (element.contentEditable === 'true') {
      const range = document.createRange();
      const selection = window.getSelection();
      range.setStart(element.firstChild, position);
      range.setEnd(element.firstChild, position);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      element.setSelectionRange(position, position);
    }
  }

  showSuggestions(element, query, atPosition) {
    const filteredUsers = this.availableUsers.filter(user =>
      user.username.toLowerCase().includes(query.toLowerCase())
    );

    if (filteredUsers.length === 0) {
      this.hideSuggestions(element);
      return;
    }

    let dropdown = this.getDropdownForElement(element);
    if (!dropdown) {
      dropdown = this.createDropdown(element);
    }

    this.renderSuggestions(dropdown, filteredUsers);
    this.showDropdown(dropdown, element);
  }

  hideSuggestions(element) {
    const dropdown = this.getDropdownForElement(element);
    if (dropdown) {
      this.hideDropdown(dropdown);
    }
  }

  getDropdownForElement(element) {
    return element.parentElement.querySelector('.global-mention-dropdown');
  }

  createDropdown(element) {
    // Asegurar que el contenedor padre tenga posición relativa
    if (getComputedStyle(element.parentElement).position === 'static') {
      element.parentElement.style.position = 'relative';
    }

    const dropdown = document.createElement('div');
    dropdown.className = 'global-mention-dropdown absolute z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto hidden';
    dropdown.style.minWidth = '200px';

    element.parentElement.appendChild(dropdown);
    return dropdown;
  }

  renderSuggestions(dropdown, users) {
    dropdown.innerHTML = '';

    users.forEach((user, index) => {
      const suggestion = document.createElement('div');
      suggestion.className = 'mention-suggestion px-3 py-2 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-800 text-sm flex items-center';
      suggestion.dataset.username = user.username;

      if (index === 0) {
        suggestion.classList.add('active', 'bg-indigo-100', 'dark:bg-indigo-800');
      }

      suggestion.innerHTML = `
        <div class="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs mr-2">
          ${user.username.charAt(0).toUpperCase()}
        </div>
        <span>@${user.username}</span>
      `;

      suggestion.addEventListener('click', () => {
        this.selectUser(dropdown.parentElement.querySelector('[data-mention-support]'), user.username);
      });

      dropdown.appendChild(suggestion);
    });
  }

  showDropdown(dropdown, element) {
    dropdown.classList.remove('hidden');
    this.activeDropdown = dropdown;
    this.positionDropdown(dropdown, element);
  }

  hideDropdown(dropdown) {
    dropdown.classList.add('hidden');
    if (this.activeDropdown === dropdown) {
      this.activeDropdown = null;
    }
  }

  positionDropdown(dropdown, element) {
    // Posicionar el dropdown debajo del elemento
    const rect = element.getBoundingClientRect();
    const parentRect = element.parentElement.getBoundingClientRect();
    
    dropdown.style.top = `${rect.bottom - parentRect.top}px`;
    dropdown.style.left = `${rect.left - parentRect.left}px`;
    dropdown.style.width = `${Math.max(rect.width, 200)}px`;
  }

  navigateSuggestions(dropdown, direction) {
    const suggestions = dropdown.querySelectorAll('.mention-suggestion');
    const activeSuggestion = dropdown.querySelector('.mention-suggestion.active');
    
    let newIndex = 0;
    
    if (activeSuggestion) {
      const currentIndex = Array.from(suggestions).indexOf(activeSuggestion);
      if (direction === 'down') {
        newIndex = (currentIndex + 1) % suggestions.length;
      } else {
        newIndex = currentIndex === 0 ? suggestions.length - 1 : currentIndex - 1;
      }
    }

    // Remover active de todos
    suggestions.forEach(s => {
      s.classList.remove('active', 'bg-indigo-100', 'dark:bg-indigo-800');
    });

    // Agregar active al nuevo
    suggestions[newIndex].classList.add('active', 'bg-indigo-100', 'dark:bg-indigo-800');
  }

  selectUser(element, username) {
    const text = this.getElementText(element);
    const cursorPos = this.getCursorPosition(element);

    // Encontrar el @ más reciente
    const beforeCursor = text.substring(0, cursorPos);
    const lastAtIndex = beforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const beforeMention = text.substring(0, lastAtIndex);
      const afterCursor = text.substring(cursorPos);

      const newText = `${beforeMention}@${username} ${afterCursor}`;
      
      if (element.contentEditable === 'true') {
        element.innerText = newText;
      } else {
        element.value = newText;
      }

      const newCursorPos = lastAtIndex + username.length + 2;
      this.setCursorPosition(element, newCursorPos);

      // Disparar evento de input para que otros sistemas lo detecten
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }

    this.hideSuggestions(element);
    element.focus();

  }

  // Método público para procesar menciones en un texto específico
  async processMentions(text, context = {}) {
  console.log('🔄 Frontend - processMentions llamado con:', {
    text: text?.substring(0, 100),
    context: context,
    currentUrl: window.location.href
  });

  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }

  console.log('📝 Menciones extraídas en frontend:', mentions);

    if (mentions.length === 0) {
      return { success: true, notificationsCreated: 0 };
    }

    try {
      const response = await fetch('/api/notifications/process-mentions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content
        },
        body: JSON.stringify({
          text,
          mentions, // SOLO enviar menciones explícitas, NO extraer del texto
          context: {
            section: context.section || 'general',
            redirectUrl: context.redirectUrl || window.location.href,
            metadata: {
              currentUrl: window.location.href,
              timestamp: new Date().toISOString(),
              targetElement: context.targetElement,
              scrollTo: context.scrollTo,
              highlight: context.highlight,
              commentId: context.commentId,
              postId: context.postId,
              ...context.metadata
            }
          }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        
        // Actualizar contador de notificaciones si existe
        if (window.notificationSystem) {
          window.notificationSystem.loadUnreadCount();
        }
      }

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Método para interceptar envío de formularios
  interceptFormSubmission(form, context = {}) {
    if (form.dataset.mentionIntercepted === 'true') {
      return; // Ya interceptado
    }

    form.dataset.mentionIntercepted = 'true';

    const originalSubmit = form.onsubmit;
    
    form.addEventListener('submit', async (e) => {
      // Buscar campos de texto con menciones
      const textFields = form.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]');
      let allMentions = [];
      let allText = '';

      textFields.forEach(field => {
        const text = this.getElementText(field);
        if (text.includes('@')) {
          allText += ` ${text}`;
          
          // SOLUCIÓN: Extraer menciones solo una vez
          const mentionRegex = /@(\w+)/g;
          let match;
          while ((match = mentionRegex.exec(text)) !== null) {
            if (!allMentions.includes(match[1])) {
              allMentions.push(match[1]);
            }
          }
        }
      });

      // Procesar menciones si se encontraron
      if (allMentions.length > 0) {
        
        // No esperar la respuesta para no bloquear el envío del formulario
        this.processMentions(allText.trim(), {
          section: context.section || 'formulario',
          redirectUrl: context.redirectUrl || window.location.href,
          targetElement: context.targetElement,
          scrollTo: context.scrollTo,
          highlight: context.highlight,
          commentId: context.commentId,
          postId: context.postId,
          metadata: {
            formId: form.id,
            formClass: form.className,
            ...context.metadata
          }
        }).catch(error => {
        });
      }
    });

  }

  // Método público para configurar un formulario específico
  setupForm(formSelector, context = {}) {
    const form = document.querySelector(formSelector);
    if (form) {
      this.interceptFormSubmission(form, context);
      
      // Asegurar soporte de menciones en campos de texto del formulario
      const textFields = form.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]');
      textFields.forEach(field => {
        this.addMentionSupport(field);
      });
    }
  }

  // Método para limpiar recursos
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    
    // Remover dropdowns
    document.querySelectorAll('.global-mention-dropdown').forEach(dropdown => {
      dropdown.remove();
    });

  }
}

window.globalMentionSystem = new GlobalMentionSystem();

// En global-mentions.js - mejorar la función de búsqueda en notas
document.addEventListener('DOMContentLoaded', () => {
  console.log('📍 Iniciando detección de parámetros de URL...');
  
  const urlParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash;
  
  console.log('🔍 Parámetros detectados:', {
    queryParams: Object.fromEntries(urlParams.entries()),
    hash: hash,
    fullUrl: window.location.href
  });
  
  // Función mejorada para buscar en notas dinámicas
  const searchInDynamicNotes = (searchText, productId) => {
    console.log('📝 Buscando en notas dinámicas del producto:', productId, 'Texto:', searchText);
    
    // Buscar el producto específico
    const productElement = document.getElementById(`product-${productId}`);
    if (!productElement) {
      console.warn('❌ Producto no encontrado:', productId);
      return false;
    }
    
    // Buscar TODOS los contenedores que puedan tener notas
    const possibleNoteContainers = productElement.querySelectorAll(
      '[class*="note"], [class*="Note"], [data-note], .notes-container, [id*="note"]'
    );
    
    console.log('🔍 Contenedores potenciales de notas:', possibleNoteContainers.length);
    
    let found = false;
    
    possibleNoteContainers.forEach((container, index) => {
      console.log(`📋 Revisando contenedor ${index + 1}:`, container);
      
      // Buscar texto en todo el contenedor
      if (container.textContent && container.textContent.includes(searchText)) {
        console.log('✅ Texto encontrado en contenedor:', container);
        
        // Resaltar el contenedor completo
        container.classList.add(
          'bg-yellow-100', 'dark:bg-yellow-800', 
          'p-3', 'rounded-lg', 'border-2', 'border-yellow-400',
          'shadow-lg', 'transition-all', 'duration-500'
        );
        
        // Scroll al contenedor
        setTimeout(() => {
          container.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
        }, 800);
        
        found = true;
        
        // Intentar resaltar el texto específico dentro del contenedor
        highlightSpecificText(container, searchText);
      }
    });
    
    // Si no se encontró en contenedores específicos, buscar en todo el producto
    if (!found) {
      console.log('🔍 Buscando en todo el producto...');
      if (productElement.textContent && productElement.textContent.includes(searchText)) {
        console.log('✅ Texto encontrado en el producto completo');
        
        productElement.classList.add(
          'bg-yellow-100', 'dark:bg-yellow-800', 
          'p-3', 'rounded-lg', 'border-2', 'border-yellow-400',
          'shadow-lg', 'transition-all', 'duration-500'
        );
        
        setTimeout(() => {
          productElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
        }, 800);
        
        found = true;
      }
    }
    
    return found;
  };
  
  // Función para resaltar texto específico
  const highlightSpecificText = (container, searchText) => {
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    const textNodes = [];
    
    while (node = walker.nextNode()) {
      if (node.textContent.includes(searchText)) {
        textNodes.push(node);
      }
    }
    
    // Resaltar los nodos de texto encontrados
    textNodes.forEach(textNode => {
      if (textNode.parentNode && !textNode.parentNode.classList.contains('highlighted-mention')) {
        const span = document.createElement('span');
        span.className = 'highlighted-mention bg-yellow-300 dark:bg-yellow-600 px-1 rounded font-bold animate-pulse';
        span.textContent = textNode.textContent;
        
        textNode.parentNode.replaceChild(span, textNode);
        
        console.log('🔦 Texto específico resaltado:', textNode.textContent);
      }
    });
  };
  
  // Función principal mejorada
  const handleMentionRedirection = () => {
    const productId = urlParams.get('productId');
    const targetElement = urlParams.get('target');
    const mentionType = urlParams.get('mentionType');
    const highlightText = urlParams.get('highlightText') ? decodeURIComponent(urlParams.get('highlightText')) : null;
    const mentionText = urlParams.get('mentionText') ? decodeURIComponent(urlParams.get('mentionText')) : null;
    
    console.log('🎯 Parámetros de mención:', {
      productId,
      targetElement,
      mentionType,
      highlightText,
      mentionText
    });
    
    // Pequeño delay para asegurar que el JavaScript dinámico haya cargado
    setTimeout(() => {
      // ESTRATEGIA 1: Si tenemos texto específico para buscar
      if (highlightText || mentionText) {
        const searchText = highlightText || mentionText;
        console.log('🔍 Buscando texto específico:', searchText);
        
        // Buscar en el producto específico si tenemos productId
        if (productId) {
          const foundInNotes = searchInDynamicNotes(searchText, productId);
          if (foundInNotes) {
            console.log('✅ Texto encontrado en notas del producto');
            return;
          }
        }
        
        // Si no se encontró, buscar en toda la página después de un delay adicional
        setTimeout(() => {
          const foundInPage = searchInDynamicNotes(searchText, 'products-table-body-admin') || 
                             searchInDynamicNotes(searchText, 'products-table-body-user');
          if (foundInPage) {
            console.log('✅ Texto encontrado en la página');
          } else {
            console.warn('❌ Texto no encontrado en la página');
          }
        }, 500);
      }
      
      // ESTRATEGIA 2: Scroll al elemento target (fallback)
      else if (targetElement) {
        const element = document.getElementById(targetElement);
        if (element) {
          console.log('🎯 Haciendo scroll al elemento target:', targetElement);
          setTimeout(() => {
            element.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest'
            });
            
            element.classList.add(
              'bg-yellow-100', 'dark:bg-yellow-800', 
              'p-2', 'rounded', 'border-2', 'border-yellow-400',
              'transition-all', 'duration-500'
            );
          }, 500);
          return;
        }
      }
      
      // ESTRATEGIA 3: Scroll al producto (último fallback)
      else if (productId) {
        const productElement = document.getElementById(`product-${productId}`);
        if (productElement) {
          console.log('📦 Haciendo scroll al producto:', productId);
          setTimeout(() => {
            productElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest'
            });
          }, 500);
          return;
        }
      }
      
      console.log('ℹ️  No se encontraron elementos específicos para resaltar');
    }, 1000); // Delay inicial para contenido dinámico
  };
  
  // Ejecutar la función principal
  handleMentionRedirection();
});
// Limpiar al descargar la página
window.addEventListener('beforeunload', () => {
  if (window.globalMentionSystem) {
    window.globalMentionSystem.destroy();
  }
});

window.MentionHelpers = {
  processMentions: (text, context = {}) => {
    if (window.globalMentionSystem) {
      return window.globalMentionSystem.processMentions(text, context);
    }
    return Promise.resolve({ success: false, error: 'Sistema no inicializado' });
  },

  // Función para configurar un formulario específico
  setupForm: (formSelector, context = {}) => {
    if (window.globalMentionSystem) {
      window.globalMentionSystem.setupForm(formSelector, context);
    }
  },

  // Función para agregar soporte a un elemento específico
  addMentionSupport: (element) => {
    if (window.globalMentionSystem) {
      window.globalMentionSystem.addMentionSupport(element);
    }
  }
};