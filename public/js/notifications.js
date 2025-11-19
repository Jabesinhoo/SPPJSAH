// public/js/notifications.js
class NotificationSystem {
  constructor() {
    this.currentUser = window.currentUsername || '';
    this.availableUsers = [];
    this.pollInterval = null;
    this.currentMentionNotification = null;
    this.init();
  }

  async init() {
    console.log('🎯 NotificationSystem inicializando...');

    // Debug: verificar que el modal existe
    const modal = document.getElementById('mention-modal');
    console.log('🔍 Modal encontrado:', !!modal);
    if (modal) {
      console.log('✅ Modal disponible para usar');
    } else {
      console.error('❌ Modal NO encontrado en el DOM');
    }

    this.setupNotificationBell();
    this.loadAvailableUsers();
    this.startPolling();
    this.setupMentionSystem();
    this.loadUnreadCount();
    this.setupModalEvents();
  }

  // Configurar la campana de notificaciones
  setupNotificationBell() {
    const bellContainer = document.getElementById('notification-bell');
    if (!bellContainer) {
      console.error('❌ No se encontró notification-bell');
      return;
    }

    bellContainer.innerHTML = `
      <div class="relative">
        <button id="notification-toggle" class="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors duration-200">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
          </svg>
          <span id="notification-badge" class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center hidden">0</span>
        </button>
        
        <!-- Dropdown de notificaciones -->
        <div id="notification-dropdown" class="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-md shadow-lg border dark:border-gray-700 z-50 hidden">
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

  // Configurar eventos del modal simplificado
  setupModalEvents() {
    const modal = document.getElementById('mention-modal');
    const closeBtn = document.getElementById('mention-modal-close');
    const closeBtn2 = document.getElementById('mention-modal-close-btn');

    console.log('🔧 Configurando eventos del modal simplificado...');

    // Cerrar modal (ambos botones)
    [closeBtn, closeBtn2].forEach(btn => {
      btn?.addEventListener('click', () => {
        this.closeMentionModal();
      });
    });

    // Cerrar modal con Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        this.closeMentionModal();
      }
    });

    // Cerrar modal al hacer clic fuera
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeMentionModal();
      }
    });

    console.log('✅ Eventos del modal simplificado configurados');
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
      console.error('Error loading available users:', error);
    }
  }

  // Configurar sistema de menciones global
  setupMentionSystem() {
    const textElements = document.querySelectorAll('textarea, input[type="text"]');

    textElements.forEach(element => {
      this.addMentionSupport(element);
    });

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
    if (element.dataset.mentionsEnabled) return;

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

    const beforeCursor = text.substring(0, cursorPos);
    const lastAtIndex = beforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = beforeCursor.substring(lastAtIndex + 1);

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
      console.error('Error loading unread count:', error);
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

    // GUARDAR DATOS COMPLETOS PARA EL MODAL
    div.dataset.notificationData = JSON.stringify(notification);

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
          <p class="text-sm text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-wrap break-words">
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
        this.handleNotificationClick(notification);
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

  // Manejar clic en notificación
  // Manejar clic en notificación - VERSIÓN SIMPLIFICADA
  handleNotificationClick(notification) {
    console.log('🖱️ Clic en notificación:', notification);

    // ✅ SOLUCIÓN TEMPORAL: Mostrar modal para TODAS las menciones
    if (notification.type === 'mention') {
      console.log('🎯 Mostrando modal para mención');
      this.showMentionModal(notification);
    } else {
      console.log('🔗 Redirección normal para notificación');
      this.markAsRead(notification.id, notification.redirectUrl);
    }
  }
  extractMentionContext(text, username) {
    if (!text || !username) return text;

    const mentionPattern = new RegExp(`(@${username})`, 'gi');
    const match = mentionPattern.exec(text);

    if (!match) return text;

    const mentionIndex = match.index;
    const contextStart = Math.max(0, mentionIndex - 50); // 50 caracteres antes
    const contextEnd = Math.min(text.length, mentionIndex + username.length + 50); // 50 caracteres después

    let extractedText = text.substring(contextStart, contextEnd);

    // Agregar "..." si hay más texto antes/después
    if (contextStart > 0) extractedText = '...' + extractedText;
    if (contextEnd < text.length) extractedText = extractedText + '...';

    return extractedText;
  }
  // Mostrar modal simplificado con la mención
  showMentionModal(notification) {
    console.log('🎪 Mostrando modal simplificado para:', notification);

    const modal = document.getElementById('mention-modal');
    const title = document.getElementById('mention-modal-title');
    const content = document.getElementById('mention-modal-content');
    const timestamp = document.getElementById('mention-timestamp');
    const closeBtn = document.getElementById('mention-modal-close-btn');

    if (!modal) {
      console.error('❌ No se encontró el modal');
      return;
    }

    // Guardar la notificación actual
    this.currentMentionNotification = notification;

    // Configurar contenido del modal
    const senderName = notification.sender?.username || 'Usuario';
    title.textContent = `Mención de ${senderName}`;

    // Extraer solo el texto de la mención (sin el "te mencionó")
    let mentionText = '';
    if (notification.metadata?.originalText) {
      // Usar el texto original de la metadata
      mentionText = notification.metadata.originalText;
    } else if (notification.message) {
      // Extraer del mensaje: quitar "X te mencionó: " y las comillas
      mentionText = notification.message
        .replace(new RegExp(`^${senderName} te mencionó: "`), '')
        .replace(/"$/, '')
        .replace(/^Alguien te mencionó: "/, '')
        .replace(/"$/, '');
    } else {
      mentionText = 'Texto no disponible';
    }

    // Formatear el texto con menciones resaltadas
    content.innerHTML = this.formatMentionText(mentionText);

    // Solo mostrar la fecha
    const mentionDate = new Date(notification.metadata?.timestamp || notification.createdAt);
    timestamp.textContent = `Mencionado el ${mentionDate.toLocaleDateString('es-ES')} a las ${mentionDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;

    // Marcar como leída
    this.markAsRead(notification.id);

    // Mostrar modal
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    console.log('✅ Modal simplificado mostrado correctamente');
  }

  // Formatear texto de mención para resaltar @menciones (versión mejorada)
  formatMentionText(text) {
    if (!text) return '<p class="text-gray-500 italic">Texto no disponible</p>';

    // Resaltar menciones @usuario con mejor estilo
    const formattedText = text.replace(/@(\w+)/g, '<span class="bg-yellow-200 dark:bg-yellow-600 px-1 rounded font-semibold border border-yellow-300 dark:border-yellow-500">@$1</span>');

    // Preservar saltos de línea y espacios
    const withLineBreaks = formattedText
      .replace(/\n/g, '<br>')
      .replace(/  /g, ' &nbsp;');

    return `<div class="whitespace-pre-wrap break-words">${withLineBreaks}</div>`;
  }

  // Cerrar modal
  closeMentionModal() {
    const modal = document.getElementById('mention-modal');
    if (modal) {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
      this.currentMentionNotification = null;
      console.log('✅ Modal cerrado');
    }
  }

  // Navegar al contexto de la mención
  navigateToMentionContext() {
    if (this.currentMentionNotification?.redirectUrl) {
      console.log('🧭 Navegando al contexto:', this.currentMentionNotification.redirectUrl);

      // Cerrar modal y dropdown
      this.closeMentionModal();
      const dropdown = document.getElementById('notification-dropdown');
      if (dropdown) {
        dropdown.classList.add('hidden');
      }

      // Navegar a la URL
      window.location.href = this.currentMentionNotification.redirectUrl;
    }
  }

  // Formatear texto de mención para resaltar @menciones
  formatMentionText(text) {
    if (!text) return '<p class="text-gray-500">Texto no disponible</p>';

    // Resaltar menciones @usuario
    const formattedText = text.replace(/@(\w+)/g, '<span class="bg-yellow-100 dark:bg-yellow-800 px-1 rounded font-medium">@$1</span>');

    // Preservar saltos de línea
    const withLineBreaks = formattedText.replace(/\n/g, '<br>');

    return `<div class="text-gray-700 dark:text-gray-300 leading-relaxed">${withLineBreaks}</div>`;
  }

  // Obtener nombre legible del contexto
  getContextDisplayName(context) {
    const contextMap = {
      'products': 'Productos',
      'productos': 'Productos',
      'suppliers': 'Proveedores',
      'general': 'General',
      'formulario': 'Formulario'
    };

    return contextMap[context] || context || 'General';
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

        console.log('✅ Notificación marcada como leída:', notificationId);
      }
    } catch (error) {
      console.error('Error al marcar como leída:', error);
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
        this.loadNotifications();
        this.loadUnreadCount();
        console.log('✅ Todas las notificaciones marcadas como leídas');
      }
    } catch (error) {
      console.error('Error al marcar todas como leídas:', error);
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
        const notificationElement = document.querySelector(`[data-notification-id="${notificationId}"]`);
        notificationElement?.remove();

        this.loadUnreadCount();

        const notificationList = document.getElementById('notification-list');
        if (notificationList.children.length === 0) {
          notificationList.innerHTML = '<div class="p-4 text-center text-gray-500 dark:text-gray-400">No tienes notificaciones</div>';
        }

        console.log('🗑️ Notificación eliminada:', notificationId);
      }
    } catch (error) {
      console.error('Error al eliminar notificación:', error);
    }
  }

  // Iniciar polling para notificaciones en tiempo real
  startPolling() {
    this.loadUnreadCount();
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
  console.log('🚀 DOM cargado, iniciando NotificationSystem...');
  window.notificationSystem = new NotificationSystem();
});

// Limpiar al descargar la página
window.addEventListener('beforeunload', () => {
  if (window.notificationSystem) {
    window.notificationSystem.stopPolling();
  }
});