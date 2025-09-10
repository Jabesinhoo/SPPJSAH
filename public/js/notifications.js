// public/js/notifications.js
class NotificationSystem {
  constructor() {
    this.currentUser = window.currentUsername || '';
    this.availableUsers = [];
    this.pollInterval = null;
    this.init();
  }

  async init() {
    this.setupNotificationBell();
    this.loadAvailableUsers();
    this.startPolling();
    this.setupMentionSystem();
    this.loadUnreadCount(); // Cargar contador inicial
  }

  // Configurar la campana de notificaciones
  setupNotificationBell() {
    const bellContainer = document.getElementById('notification-bell');
    if (!bellContainer) return;

    bellContainer.innerHTML = `
      <div class="relative">
        <button id="notification-toggle" class="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors duration-200">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
          </svg>
          <span id="notification-badge" class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center hidden">0</span>
        </button>
        
        <!-- Dropdown de notificaciones -->
        <div id="notification-dropdown" class="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-md shadow-lg border dark:border-gray-700 z-50 hidden">
          <div class="p-4 border-b dark:border-gray-700">
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Notificaciones</h3>
              <button id="mark-all-read" class="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400">
                Marcar todas como leídas
              </button>
            </div>
          </div>
          
          <div id="notification-list" class="max-h-96 overflow-y-auto">
            <div class="p-4 text-center text-gray-500 dark:text-gray-400">
              Cargando notificaciones...
            </div>
          </div>
          
          <div class="p-4 border-t dark:border-gray-700 text-center">
            <button id="load-more-notifications" class="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hidden">
              Cargar más
            </button>
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  // Configurar event listeners
  setupEventListeners() {
    const toggleBtn = document.getElementById('notification-toggle');
    const dropdown = document.getElementById('notification-dropdown');
    const markAllReadBtn = document.getElementById('mark-all-read');
    const loadMoreBtn = document.getElementById('load-more-notifications');

    toggleBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
      if (!dropdown.classList.contains('hidden')) {
        this.loadNotifications();
      }
    });

    markAllReadBtn?.addEventListener('click', () => {
      this.markAllAsRead();
    });

    loadMoreBtn?.addEventListener('click', () => {
      const currentPage = parseInt(loadMoreBtn.dataset.page) || 1;
      this.loadNotifications(currentPage + 1);
    });

    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (!dropdown?.contains(e.target) && !toggleBtn?.contains(e.target)) {
        dropdown?.classList.add('hidden');
      }
    });
  }

  // Cargar usuarios disponibles para etiquetado
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

  // Configurar sistema de menciones global
  setupMentionSystem() {
    // Buscar todos los textareas y inputs de texto que puedan tener menciones
    const textElements = document.querySelectorAll('textarea, input[type="text"]');
    
    textElements.forEach(element => {
      this.addMentionSupport(element);
    });

    // Observer para elementos añadidos dinámicamente
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const textElements = node.querySelectorAll('textarea, input[type="text"]');
            textElements.forEach(element => {
              this.addMentionSupport(element);
            });
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Agregar soporte de menciones a un elemento
  addMentionSupport(element) {
    if (element.dataset.mentionsEnabled) return; // Ya configurado
    
    element.dataset.mentionsEnabled = 'true';

    element.addEventListener('input', (e) => {
      this.handleMentionInput(e, element);
    });

    element.addEventListener('keydown', (e) => {
      this.handleMentionKeydown(e, element);
    });
  }

  // Manejar input para menciones
  handleMentionInput(event, element) {
    const text = element.value;
    const cursorPos = element.selectionStart;

    // Buscar @ más reciente antes del cursor
    const beforeCursor = text.substring(0, cursorPos);
    const lastAtIndex = beforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = beforeCursor.substring(lastAtIndex + 1);

      // Verificar si no hay espacios después del @
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        const query = textAfterAt.toLowerCase();
        this.showUserSuggestions(element, query, lastAtIndex);
        return;
      }
    }

    this.hideUserSuggestions(element);
  }

  // Manejar teclas para navegación en menciones
  handleMentionKeydown(event, element) {
    const dropdown = element.parentElement.querySelector('.mention-dropdown');
    if (!dropdown || dropdown.classList.contains('hidden')) return;

    const suggestions = dropdown.querySelectorAll('.mention-suggestion');
    const activeSuggestion = dropdown.querySelector('.mention-suggestion.active');

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = activeSuggestion ? 
        activeSuggestion.nextElementSibling || suggestions[0] : 
        suggestions[0];
      this.setActiveSuggestion(dropdown, next);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = activeSuggestion ? 
        activeSuggestion.previousElementSibling || suggestions[suggestions.length - 1] : 
        suggestions[suggestions.length - 1];
      this.setActiveSuggestion(dropdown, prev);
    } else if (event.key === 'Enter' && activeSuggestion) {
      event.preventDefault();
      this.selectUser(element, activeSuggestion.dataset.username);
    } else if (event.key === 'Escape') {
      this.hideUserSuggestions(element);
    }
  }

  // Mostrar sugerencias de usuarios
  showUserSuggestions(element, query, atPosition) {
    const filteredUsers = this.availableUsers.filter(user =>
      user.username.toLowerCase().includes(query)
    );

    if (filteredUsers.length === 0) {
      this.hideUserSuggestions(element);
      return;
    }

    let dropdown = element.parentElement.querySelector('.mention-dropdown');
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.className = 'mention-dropdown absolute z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto hidden';
      
      // Posicionar el dropdown
      element.parentElement.style.position = 'relative';
      element.parentElement.appendChild(dropdown);
    }

    dropdown.innerHTML = '';
    filteredUsers.forEach((user, index) => {
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
        this.selectUser(element, user.username);
      });

      dropdown.appendChild(suggestion);
    });

    dropdown.classList.remove('hidden');
  }

  // Ocultar sugerencias de usuarios
  hideUserSuggestions(element) {
    const dropdown = element.parentElement.querySelector('.mention-dropdown');
    if (dropdown) {
      dropdown.classList.add('hidden');
    }
  }

  // Establecer sugerencia activa
  setActiveSuggestion(dropdown, suggestion) {
    dropdown.querySelectorAll('.mention-suggestion').forEach(s => {
      s.classList.remove('active', 'bg-indigo-100', 'dark:bg-indigo-800');
    });
    suggestion.classList.add('active', 'bg-indigo-100', 'dark:bg-indigo-800');
  }

  // Seleccionar usuario mencionado
  selectUser(element, username) {
    const text = element.value;
    const cursorPos = element.selectionStart;

    // Encontrar el @ más reciente
    const beforeCursor = text.substring(0, cursorPos);
    const lastAtIndex = beforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const beforeMention = text.substring(0, lastAtIndex);
      const afterCursor = text.substring(cursorPos);

      const newText = `${beforeMention}@${username} ${afterCursor}`;
      element.value = newText;

      const newCursorPos = lastAtIndex + username.length + 2;
      element.setSelectionRange(newCursorPos, newCursorPos);
    }

    this.hideUserSuggestions(element);
    element.focus();
  }

  // Cargar contador de notificaciones no leídas
  async loadUnreadCount() {
    try {
      const response = await fetch('/api/notifications/unread-count');
      if (!response.ok) return;

      const data = await response.json();
      this.updateNotificationBadge(data.unreadCount);
    } catch (error) {
    }
  }

  // Actualizar badge de notificaciones
  updateNotificationBadge(count) {
    const badge = document.getElementById('notification-badge');
    if (!badge) return;

    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  // Cargar notificaciones
  async loadNotifications(page = 1) {
    try {
      const response = await fetch(`/api/notifications?page=${page}&limit=10`);
      if (!response.ok) throw new Error('Error al cargar notificaciones');

      const data = await response.json();
      const notificationList = document.getElementById('notification-list');
      const loadMoreBtn = document.getElementById('load-more-notifications');
      
      if (page === 1) {
        notificationList.innerHTML = '';
      }

      if (data.notifications.length === 0 && page === 1) {
        notificationList.innerHTML = '<div class="p-4 text-center text-gray-500 dark:text-gray-400">No tienes notificaciones</div>';
        return;
      }

      data.notifications.forEach(notification => {
        const notificationElement = this.createNotificationElement(notification);
        notificationList.appendChild(notificationElement);
      });

      // Mostrar/ocultar botón "Cargar más"
      if (data.pagination.currentPage < data.pagination.totalPages) {
        loadMoreBtn.classList.remove('hidden');
        loadMoreBtn.dataset.page = data.pagination.currentPage;
      } else {
        loadMoreBtn.classList.add('hidden');
      }

    } catch (error) {
      const notificationList = document.getElementById('notification-list');
      notificationList.innerHTML = '<div class="p-4 text-center text-red-500 dark:text-red-400">Error al cargar notificaciones</div>';
    }
  }

  // Crear elemento de notificación
  createNotificationElement(notification) {
    const div = document.createElement('div');
    div.className = `notification-item p-4 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200 ${!notification.isRead ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`;
    div.dataset.notificationId = notification.id;

    const timeAgo = this.formatTimeAgo(new Date(notification.createdAt));
    const senderName = notification.sender ? notification.sender.username : 'Sistema';

    div.innerHTML = `
      <div class="flex items-start space-x-3">
        <div class="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
          ${senderName.charAt(0).toUpperCase()}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
              ${notification.title || 'Notificación'}
            </p>
            <div class="flex items-center space-x-2">
              ${!notification.isRead ? '<div class="w-2 h-2 bg-indigo-500 rounded-full"></div>' : ''}
              <button class="delete-notification text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200" data-notification-id="${notification.id}">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">
            ${notification.message}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
            ${timeAgo}
          </p>
        </div>
      </div>
    `;

    // Event listeners para la notificación
    div.addEventListener('click', (e) => {
      if (!e.target.closest('.delete-notification')) {
        this.markAsRead(notification.id, notification.redirectUrl);
      }
    });

    // Event listener para eliminar notificación
    const deleteBtn = div.querySelector('.delete-notification');
    deleteBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteNotification(notification.id);
    });

    return div;
  }

  // Formatear tiempo transcurrido
  formatTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Hace un momento';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} h`;
    if (diffInSeconds < 2592000) return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
    
    return date.toLocaleDateString();
  }

  // Marcar notificación como leída
  async markAsRead(notificationId, redirectUrl = null) {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
        }
      });

      if (response.ok) {
        // Actualizar UI
        const notificationElement = document.querySelector(`[data-notification-id="${notificationId}"]`);
        if (notificationElement) {
          notificationElement.classList.remove('bg-indigo-50', 'dark:bg-indigo-900/20');
          const indicator = notificationElement.querySelector('.w-2.h-2.bg-indigo-500');
          indicator?.remove();
        }

        // Actualizar contador
        this.loadUnreadCount();

        // Redirigir si hay URL
        if (redirectUrl) {
          window.location.href = redirectUrl;
        }
      }
    } catch (error) {
    }
  }

  // Marcar todas las notificaciones como leídas
  async markAllAsRead() {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
        }
      });

      if (response.ok) {
        // Recargar notificaciones
        this.loadNotifications();
        this.loadUnreadCount();
      }
    } catch (error) {
    }
  }

  // Eliminar notificación
  async deleteNotification(notificationId) {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
        }
      });

      if (response.ok) {
        // Remover elemento de la UI
        const notificationElement = document.querySelector(`[data-notification-id="${notificationId}"]`);
        notificationElement?.remove();

        // Actualizar contador
        this.loadUnreadCount();

        // Si no quedan notificaciones, mostrar mensaje vacío
        const notificationList = document.getElementById('notification-list');
        if (notificationList.children.length === 0) {
          notificationList.innerHTML = '<div class="p-4 text-center text-gray-500 dark:text-gray-400">No tienes notificaciones</div>';
        }
      }
    } catch (error) {
    }
  }

  // Iniciar polling para notificaciones en tiempo real
  startPolling() {
    // Cargar contador inicial
    this.loadUnreadCount();

    // Polling cada 30 segundos
    this.pollInterval = setInterval(() => {
      this.loadUnreadCount();
    }, 30000);
  }

  // Detener polling
  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // Método público para procesar menciones en formularios
  processMentionsInForm(formData, context = {}) {
    // Este método se puede usar cuando se envía un formulario
    // para procesar menciones del lado del servidor
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        let match;
        while ((match = mentionRegex.exec(value)) !== null) {
          mentions.push(match[1]);
        }
      }
    }

    if (mentions.length > 0) {
      formData.append('mentions', JSON.stringify(mentions));
      formData.append('mentionContext', JSON.stringify(context));
    }

    return formData;
  }
}

// Inicializar sistema de notificaciones cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
  window.notificationSystem = new NotificationSystem();
});

// Limpiar al descargar la página
window.addEventListener('beforeunload', () => {
  if (window.notificationSystem) {
    window.notificationSystem.stopPolling();
  }
});