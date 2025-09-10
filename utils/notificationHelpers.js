// utils/notificationHelpers.js

/**
 * Funciones auxiliares para integrar notificaciones en formularios existentes
 */

/**
 * Agregar soporte de menciones a un formulario específico
 * @param {string} formSelector - Selector del formulario
 * @param {Object} context - Contexto adicional para las notificaciones
 */
function addMentionSupportToForm(formSelector, context = {}) {
  const form = document.querySelector(formSelector);
  if (!form) return;

  const textFields = form.querySelectorAll('textarea, input[type="text"]');
  textFields.forEach(field => {
    if (window.notificationSystem) {
      window.notificationSystem.addMentionSupport(field);
    }
  });

  form.addEventListener('submit', function(e) {
    if (window.notificationSystem) {
      const formData = new FormData(form);
      window.notificationSystem.processMentionsInForm(formData, context);
    }
  });
}


/**
 * Crear notificación desde el frontend (usando fetch)
 * @param {Object} notificationData - Datos de la notificación
 */
async function createClientNotification(notificationData) {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
      },
      body: JSON.stringify(notificationData)
    });

    if (response.ok) {
      // Actualizar el contador de notificaciones
      if (window.notificationSystem) {
        window.notificationSystem.loadUnreadCount();
      }
    }
    
    return response.ok;
  } catch (error) {
    console.error('Error al crear notificación:', error);
    return false;
  }
}

/**
 * Mostrar toast de notificación temporal
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo: success, error, info, warning
 */
function showToast(message, type = 'info') {
  // Crear contenedor de toasts si no existe
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed top-20 right-4 z-50 space-y-2';
    document.body.appendChild(toastContainer);
  }

  // Colores según el tipo
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500', 
    warning: 'bg-yellow-500',
    info: 'bg-blue-500'
  };

  // Crear toast
  const toast = document.createElement('div');
  toast.className = `${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full opacity-0`;
  toast.innerHTML = `
    <div class="flex items-center space-x-2">
      <span>${message}</span>
      <button class="ml-2 text-white hover:text-gray-200" onclick="this.parentElement.parentElement.remove()">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  `;

  toastContainer.appendChild(toast);

  // Animar entrada
  setTimeout(() => {
    toast.classList.remove('translate-x-full', 'opacity-0');
  }, 100);

  // Auto-remover después de 5 segundos
  setTimeout(() => {
    toast.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 5000);
}

/**
 * Funciones para integrar con formularios de comentarios, productos, etc.
 */

// Para formularios de comentarios
function setupCommentFormNotifications(formSelector, contextData = {}) {
  addMentionSupportToForm(formSelector, {
    section: 'comentario',
    senderName: window.currentUsername || 'Usuario',
    ...contextData
  });
}

// Para formularios de productos
function setupProductFormNotifications(formSelector, productData = {}) {
  addMentionSupportToForm(formSelector, {
    section: 'producto',
    senderName: window.currentUsername || 'Usuario',
    redirectUrl: `/products/${productData.id || ''}`,
    metadata: { productId: productData.id, productName: productData.name },
    ...productData
  });
}

// Para formularios de proveedores
function setupSupplierFormNotifications(formSelector, supplierData = {}) {
  addMentionSupportToForm(formSelector, {
    section: 'proveedor',
    senderName: window.currentUsername || 'Usuario',
    redirectUrl: `/suppliers/${supplierData.id || ''}`,
    metadata: { supplierId: supplierData.id, supplierName: supplierData.name },
    ...supplierData
  });
}

/**
 * Función para configurar notificaciones en hojas dinámicas
 */
function setupSpreadsheetNotifications(formSelector, sheetData = {}) {
  addMentionSupportToForm(formSelector, {
    section: 'hoja dinámica',
    senderName: window.currentUsername || 'Usuario',
    redirectUrl: `/spreadsheets/${sheetData.id || ''}`,
    metadata: { sheetId: sheetData.id, sheetName: sheetData.name },
    ...sheetData
  });
}

/**
 * Interceptar formularios AJAX para procesar menciones
 * @param {string} formSelector - Selector del formulario
 * @param {Function} originalSubmitHandler - Función original de envío
 * @param {Object} context - Contexto para las notificaciones
 */
function interceptAjaxForm(formSelector, originalSubmitHandler, context = {}) {
  const form = document.querySelector(formSelector);
  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(form);
    
    // Procesar menciones si el sistema está disponible
    if (window.notificationSystem) {
      window.notificationSystem.processMentionsInForm(formData, context);
    }

    // Ejecutar el handler original con los datos modificados
    if (originalSubmitHandler) {
      await originalSubmitHandler(formData, form);
    }
  });
}

/**
 * Configurar notificaciones automáticas para acciones del sistema
 */
const NotificationActions = {
  // Notificación cuando se crea un producto
  productCreated: (productData, mentions = []) => {
    mentions.forEach(username => {
      createClientNotification({
        recipientUsername: username,
        type: 'product',
        title: 'Nuevo producto creado',
        message: `Se creó el producto "${productData.name}"`,
        redirectUrl: `/products/${productData.id}`
      });
    });
  },

  // Notificación cuando se actualiza un producto
  productUpdated: (productData, mentions = []) => {
    mentions.forEach(username => {
      createClientNotification({
        recipientUsername: username,
        type: 'product',
        title: 'Producto actualizado',
        message: `Se actualizó el producto "${productData.name}"`,
        redirectUrl: `/products/${productData.id}`
      });
    });
  },

  // Notificación para asignaciones
  userAssigned: (userData, taskData) => {
    createClientNotification({
      recipientUsername: userData.username,
      type: 'system',
      title: 'Nueva asignación',
      message: `Te asignaron: ${taskData.description}`,
      redirectUrl: taskData.url
    });
  }
};

// Hacer las funciones globalmente disponibles
window.NotificationHelpers = {
  addMentionSupportToForm,
  createClientNotification,
  showToast,
  setupCommentFormNotifications,
  setupProductFormNotifications,
  setupSupplierFormNotifications,
  setupSpreadsheetNotifications,
  interceptAjaxForm,
  NotificationActions
};

// Auto-configurar formularios comunes cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
  // Buscar y configurar automáticamente formularios comunes
  const commonForms = [
    { selector: 'form[data-mention-support]', context: {} },
    { selector: '.comment-form', context: { section: 'comentario' } },
    { selector: '.product-form', context: { section: 'producto' } },
    { selector: '.supplier-form', context: { section: 'proveedor' } }
  ];

  commonForms.forEach(({ selector, context }) => {
    const forms = document.querySelectorAll(selector);
    forms.forEach(form => {
      addMentionSupportToForm(`#${form.id || form.className}`, context);
    });
  });
});