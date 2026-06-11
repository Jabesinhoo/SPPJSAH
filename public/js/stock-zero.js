document.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById('stock-zero-date');
  const searchInput = document.getElementById('stock-zero-search');
  const limitInput = document.getElementById('stock-zero-limit');
  const cardsContainer = document.getElementById('stock-zero-cards');
  const loadingEl = document.getElementById('stock-zero-loading');
  const totalEl = document.getElementById('stock-zero-total');

  const paginationContainer = document.getElementById('stock-zero-pagination');
  const paginationInfo = document.getElementById('stock-zero-pagination-info');
  const paginationPages = document.getElementById('stock-zero-pages');
  const prevButton = document.getElementById('stock-zero-prev');
  const nextButton = document.getElementById('stock-zero-next');

  let searchTimeout = null;
  let currentProducts = new Map();
  let pendingProduct = null;
  let pendingButton = null;
  let currentPage = 1;
  let currentPagination = null;

  dateInput.value = defaultStockZeroDate || new Date().toISOString().slice(0, 10);

  createModal();

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
  }

  function formatMoney(value) {
    if (value === null || value === undefined || value === '') {
      return 'Sin precio';
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
      return `$ ${value}`;
    }

    return number.toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    });
  }

  function createModal() {
    const modalHtml = `
      <div id="stock-zero-modal" class="fixed inset-0 z-[9999] hidden items-center justify-center bg-black bg-opacity-60 p-4">
        <div class="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div class="p-5 border-b border-gray-200 dark:border-gray-700">
            <h3 id="stock-zero-modal-title" class="text-lg font-bold text-gray-900 dark:text-gray-100">
              Confirmar acción
            </h3>
          </div>

          <div class="p-5">
            <p id="stock-zero-modal-message" class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line"></p>
          </div>

          <div id="stock-zero-modal-actions" class="flex justify-end gap-3 p-5 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              id="stock-zero-modal-cancel"
              class="px-4 py-2 text-sm rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 transition"
            >
              Cancelar
            </button>

            <button
              type="button"
              id="stock-zero-modal-confirm"
              class="px-4 py-2 text-sm rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition"
            >
              Confirmar
            </button>
          </div>

          <div id="stock-zero-modal-close-actions" class="hidden justify-end gap-3 p-5 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              id="stock-zero-modal-close"
              class="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('stock-zero-modal-cancel').addEventListener('click', closeModal);
    document.getElementById('stock-zero-modal-close').addEventListener('click', closeModal);

    document.getElementById('stock-zero-modal-confirm').addEventListener('click', async () => {
      if (!pendingProduct) {
        closeModal();
        return;
      }

      await markPurchased(pendingProduct, pendingButton);
    });
  }

  function openConfirmModal(product, button) {
    pendingProduct = product;
    pendingButton = button;

    const modal = document.getElementById('stock-zero-modal');
    const title = document.getElementById('stock-zero-modal-title');
    const message = document.getElementById('stock-zero-modal-message');
    const confirmButton = document.getElementById('stock-zero-modal-confirm');
    const actions = document.getElementById('stock-zero-modal-actions');
    const closeActions = document.getElementById('stock-zero-modal-close-actions');

    title.textContent = 'Marcar producto como comprado';
    message.textContent = `Se creará este producto en el módulo Productos.\n\nSKU: ${product.sku}\nProducto: ${product.name}\nPrecio: ${formatMoney(product.price)}\n\n¿Deseas continuar?`;

    confirmButton.textContent = 'Marcar comprado';
    confirmButton.disabled = false;

    actions.classList.remove('hidden');
    actions.classList.add('flex');

    closeActions.classList.add('hidden');
    closeActions.classList.remove('flex');

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function openInfoModal(titleText, messageText, type = 'info') {
    const modal = document.getElementById('stock-zero-modal');
    const title = document.getElementById('stock-zero-modal-title');
    const message = document.getElementById('stock-zero-modal-message');
    const actions = document.getElementById('stock-zero-modal-actions');
    const closeActions = document.getElementById('stock-zero-modal-close-actions');
    const closeButton = document.getElementById('stock-zero-modal-close');

    title.textContent = titleText;
    message.textContent = messageText;

    actions.classList.add('hidden');
    actions.classList.remove('flex');

    closeActions.classList.remove('hidden');
    closeActions.classList.add('flex');

    closeButton.className = 'px-4 py-2 text-sm rounded-lg text-white transition';

    if (type === 'error') {
      closeButton.classList.add('bg-red-600', 'hover:bg-red-700');
    } else {
      closeButton.classList.add('bg-indigo-600', 'hover:bg-indigo-700');
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function closeModal() {
    const modal = document.getElementById('stock-zero-modal');

    modal.classList.add('hidden');
    modal.classList.remove('flex');

    pendingProduct = null;
    pendingButton = null;
  }

  function setConfirmLoading(isLoading) {
    const confirmButton = document.getElementById('stock-zero-modal-confirm');
    const cancelButton = document.getElementById('stock-zero-modal-cancel');

    confirmButton.disabled = isLoading;
    cancelButton.disabled = isLoading;
    confirmButton.textContent = isLoading ? 'Procesando...' : 'Marcar comprado';
  }

  function renderImage(product) {
    if (!product.imageUrl) {
      return `
        <div class="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
          Sin imagen
        </div>
      `;
    }

    return `
      <img
        src="${escapeHtml(product.imageUrl)}"
        alt="${escapeHtml(product.name)}"
        class="w-full h-full object-contain p-4"
        loading="lazy"
        onerror="this.parentElement.innerHTML='<div class=&quot;w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm&quot;>Sin imagen</div>'"
      >
    `;
  }

  function renderPurchasedInfo(product) {
    if (!product.isPurchased) {
      return '';
    }

    const purchasedBy = product.purchasedBy || 'Sistema';
    const purchasedAt = product.purchasedAt
      ? new Date(product.purchasedAt).toLocaleString('es-CO')
      : '';

    return `
      <div class="mt-3 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-3">
        <p class="text-sm font-semibold text-green-700 dark:text-green-200">
          Producto comprado
        </p>
        <p class="text-xs text-green-700 dark:text-green-300 mt-1">
          Por: ${escapeHtml(purchasedBy)}
        </p>
        ${purchasedAt ? `
          <p class="text-xs text-green-700 dark:text-green-300">
            Fecha: ${escapeHtml(purchasedAt)}
          </p>
        ` : ''}
      </div>
    `;
  }

  function renderPurchasedButton(product) {
    const id = Number(product.wooProductId);

    if (product.isPurchased) {
      return `
        <button
          type="button"
          disabled
          class="mt-4 block w-full text-center px-3 py-2 text-sm bg-green-600 text-white rounded-lg opacity-80 cursor-not-allowed"
        >
          Comprado
        </button>
      `;
    }

    return `
      <button
        type="button"
        data-product-id="${id}"
        class="purchase-toggle-btn mt-4 block w-full text-center px-3 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
      >
        Marcar comprado
      </button>
    `;
  }

  function renderCards(products) {
    loadingEl.classList.add('hidden');

    currentProducts = new Map();

    products.forEach(product => {
      currentProducts.set(Number(product.wooProductId), product);
    });

    if (!products.length) {
      cardsContainer.innerHTML = `
        <div class="col-span-full bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center text-gray-500 dark:text-gray-300">
          No hay productos agotados para esta fecha.
        </div>
      `;
      return;
    }

    cardsContainer.innerHTML = products.map(product => {
      const href = product.permalink || '#';

      return `
        <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-lg transition overflow-hidden">
          <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="block">
            <div class="bg-gray-100 dark:bg-gray-800 aspect-[4/3] flex items-center justify-center overflow-hidden">
              ${renderImage(product)}
            </div>
          </a>

          <div class="p-4">
            <div class="mb-2 flex items-center justify-between gap-2">
              <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200">
                Stock: ${escapeHtml(product.currentStock ?? 0)}
              </span>

              ${product.isPurchased ? `
                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200">
                  Comprado
                </span>
              ` : ''}
            </div>

            <a
              href="${escapeHtml(href)}"
              target="_blank"
              rel="noopener noreferrer"
              class="block text-base font-bold text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-2 min-h-[48px]"
            >
              ${escapeHtml(product.name)}
            </a>

            <div class="mt-3 space-y-1 text-sm">
              <p class="text-gray-600 dark:text-gray-300">
                <span class="font-semibold">SKU:</span> ${escapeHtml(product.sku)}
              </p>

              <p class="text-gray-900 dark:text-gray-100 text-lg font-bold">
                ${formatMoney(product.price)}
              </p>

              <p class="text-xs text-gray-500 dark:text-gray-400">
                Modificado: ${escapeHtml(product.dateModified || '')}
              </p>
            </div>

            ${renderPurchasedInfo(product)}

            <a
              href="${escapeHtml(href)}"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-4 block text-center px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Ver producto
            </a>

            ${renderPurchasedButton(product)}
          </div>
        </div>
      `;
    }).join('');

    bindPurchaseButtons();
  }

  function getPageNumbers(page, totalPages) {
    const pages = [];
    const maxVisible = 5;

    let start = Math.max(page - 2, 1);
    let end = Math.min(start + maxVisible - 1, totalPages);

    if (end - start < maxVisible - 1) {
      start = Math.max(end - maxVisible + 1, 1);
    }

    for (let number = start; number <= end; number += 1) {
      pages.push(number);
    }

    return pages;
  }

  function renderPagination(pagination) {
    currentPagination = pagination;

    if (!pagination || pagination.totalItems <= 0) {
      paginationContainer.classList.add('hidden');
      totalEl.textContent = '0';
      return;
    }

    totalEl.textContent = pagination.totalItems;

    const startItem = ((pagination.page - 1) * pagination.limit) + 1;
    const endItem = Math.min(pagination.page * pagination.limit, pagination.totalItems);

    paginationInfo.textContent = `Mostrando ${startItem}-${endItem} de ${pagination.totalItems} productos`;

    prevButton.disabled = !pagination.hasPrevPage;
    nextButton.disabled = !pagination.hasNextPage;

    const pages = getPageNumbers(pagination.page, pagination.totalPages);

    paginationPages.innerHTML = pages.map(pageNumber => {
      const isActive = pageNumber === pagination.page;

      return `
        <button
          type="button"
          data-page="${pageNumber}"
          class="stock-zero-page-btn px-3 py-2 text-sm rounded-lg transition ${
            isActive
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600'
          }"
        >
          ${pageNumber}
        </button>
      `;
    }).join('');

    document.querySelectorAll('.stock-zero-page-btn').forEach(button => {
      button.addEventListener('click', () => {
        const page = Number(button.dataset.page);
        goToPage(page);
      });
    });

    paginationContainer.classList.remove('hidden');
  }

  function bindPurchaseButtons() {
    const buttons = document.querySelectorAll('.purchase-toggle-btn');

    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const productId = Number(button.dataset.productId);
        const product = currentProducts.get(productId);

        if (!product) {
          openInfoModal('Producto no encontrado', 'No se encontró la información del producto.', 'error');
          return;
        }

        openConfirmModal(product, button);
      });
    });
  }

  async function loadProducts() {
    const params = new URLSearchParams();

    params.set('date', dateInput.value);
    params.set('page', String(currentPage));
    params.set('limit', String(limitInput.value || 12));

    if (searchInput.value.trim()) {
      params.set('search', searchInput.value.trim());
    }

    loadingEl.classList.remove('hidden');
    cardsContainer.innerHTML = '';
    totalEl.textContent = '0';

    try {
      const response = await fetch(`/api/stock-zero?${params.toString()}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error consultando productos');
      }

      renderCards(result.data);
      renderPagination(result.pagination);
    } catch (error) {
      loadingEl.classList.add('hidden');
      paginationContainer.classList.add('hidden');

      cardsContainer.innerHTML = `
        <div class="col-span-full bg-red-50 dark:bg-red-900/30 rounded-lg p-8 text-center text-red-600 dark:text-red-200">
          ${escapeHtml(error.message)}
        </div>
      `;
    }
  }

  function goToPage(page) {
    if (!currentPagination) {
      currentPage = page;
      loadProducts();
      return;
    }

    const safePage = Math.min(Math.max(page, 1), currentPagination.totalPages);

    if (safePage === currentPage) {
      return;
    }

    currentPage = safePage;
    loadProducts();
  }

  async function markPurchased(product, button) {
    try {
      setConfirmLoading(true);

      if (button) {
        button.disabled = true;
        button.textContent = 'Procesando...';
      }

      const response = await fetch(`/api/stock-zero/${product.wooProductId}/purchased`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: dateInput.value,
          sku: product.sku,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
          permalink: product.permalink,
          currentStock: product.currentStock,
          stockStatus: product.stockStatus,
          dateModified: product.dateModified
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'No se pudo marcar como comprado');
      }

      closeModal();

      openInfoModal(
        'Producto marcado como comprado',
        'El producto fue creado correctamente en el módulo Productos.',
        'success'
      );

      await loadProducts();
    } catch (error) {
      closeModal();

      openInfoModal(
        'No se pudo completar la acción',
        error.message,
        'error'
      );

      if (button) {
        button.disabled = false;
        button.textContent = 'Marcar comprado';
      }
    } finally {
      setConfirmLoading(false);
    }
  }

  dateInput.addEventListener('change', () => {
    currentPage = 1;
    loadProducts();
  });

  limitInput.addEventListener('change', () => {
    currentPage = 1;
    loadProducts();
  });

  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(() => {
      currentPage = 1;
      loadProducts();
    }, 400);
  });

  prevButton.addEventListener('click', () => {
    if (currentPagination && currentPagination.hasPrevPage) {
      goToPage(currentPagination.page - 1);
    }
  });

  nextButton.addEventListener('click', () => {
    if (currentPagination && currentPagination.hasNextPage) {
      goToPage(currentPagination.page + 1);
    }
  });

  loadProducts();
});
