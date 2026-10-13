  const API_BASE = 'http://localhost:3000/api/products';
  const CART_KEY = 'leyka_marketplace_cart';
  const PRODUCT_PLACEHOLDER = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 420 420'><rect width='420' height='420' rx='48' fill='#f9f0f4'/><circle cx='210' cy='180' r='84' fill='#ffd6e7'/><path d='M124 286c22-30 53-46 86-46s64 16 86 46' fill='none' stroke='#d4407e' stroke-width='16' stroke-linecap='round'/><circle cx='180' cy='172' r='12' fill='#d4407e'/><circle cx='240' cy='172' r='12' fill='#d4407e'/></svg>"
  );

  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');
  const currentUserId = user ? Number(user.id || user.id_usuario) : null;

  if (user) {
    document.getElementById('authLink').hidden = true;
    document.getElementById('profileLink').hidden = false;
  }

  let allProducts = [];
  let activeProductId = null;
  let selectedRating = 0;
  let cart = loadCart();

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatPrice(value) {
    const numericValue = Number(value || 0);
    return `RD$${numericValue.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}`;
  }

  function renderStars(value) {
    const rounded = Math.round(Number(value || 0));
    return '★★★★★'.slice(0, rounded) + '☆☆☆☆☆'.slice(rounded);
  }

  function loadCart() {
    try {
      const rawCart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      return Array.isArray(rawCart) ? rawCart : [];
    } catch (error) {
      return [];
    }
  }

  function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();

    if (!document.getElementById('cartOverlay').hidden) {
      renderCart();
    }
  }

  function updateCartBadge() {
    const totalItems = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    document.getElementById('cartCountBadge').textContent = totalItems;
  }

  function findProductById(productId) {
    return allProducts.find((product) => String(product.id_producto) === String(productId));
  }

  function populateCategories(products) {
    const filterCat = document.getElementById('filterCat');
    const categories = [...new Set(products.map((product) => product.categoria).filter(Boolean))];

    filterCat.innerHTML = '<option value="">Todas las categorias</option>';
    categories.forEach((category) => {
      filterCat.innerHTML += `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`;
    });
  }

  function getFilteredProducts() {
    const search = document.getElementById('searchInput').value.trim().toLowerCase();
    const category = document.getElementById('filterCat').value;
    const status = document.getElementById('filterStatus').value;

    return allProducts.filter((product) => {
      const matchesSearch = product.nombre.toLowerCase().includes(search) ||
        (product.descripcion || '').toLowerCase().includes(search);
      const matchesCategory = category ? product.categoria === category : true;
      const matchesStatus = status ? product.estado === status : true;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }

  function applyFilters() {
    renderProducts(getFilteredProducts());
  }

  function renderProducts(products) {
    const grid = document.getElementById('catalogGrid');
    const emptyState = document.getElementById('emptyState');

    grid.innerHTML = '';

    if (!products.length) {
      emptyState.hidden = false;
      return;
    }

    emptyState.hidden = true;

    products.forEach((product) => {
      const isAvailable = Number(product.stock) > 0 && product.estado !== 'Agotado';
      const ratingText = `${Number(product.rating_promedio || 0).toFixed(1)} / 5`;
      const reviewText = Number(product.total_resenas || 0) === 1
        ? '1 resena'
        : `${Number(product.total_resenas || 0)} resenas`;
      const card = document.createElement('article');

      card.className = `product-card ${product.estado === 'Agotado' ? 'is-agotado' : ''}`;
      card.innerHTML = `
        <div class="product-media">
          <img class="product-image" src="${product.imagen_url || PRODUCT_PLACEHOLDER}" alt="${escapeHtml(product.nombre)}">
          <span class="product-state ${product.estado === 'Disponible' ? '' : 'product-state--agotado'}">${escapeHtml(product.estado)}</span>
        </div>
        <div class="product-body">
          <div class="product-meta-row">
            <span class="product-cat">${escapeHtml(product.categoria || 'Variado')}</span>
            <span class="product-rating">${escapeHtml(ratingText)} · ${escapeHtml(reviewText)}</span>
          </div>
          <h3 class="product-name">${escapeHtml(product.nombre)}</h3>
          <p class="product-desc">${escapeHtml(product.descripcion || 'Sin descripcion')}</p>
          <div class="product-price-row">
            <div class="product-price-block">
              <strong class="product-price">${formatPrice(product.precio)}</strong>
            </div>
            <span class="product-stock">${escapeHtml(String(product.stock))} uds.</span>
          </div>
          <div class="product-foot">
            <div class="actions-cell product-card-actions">
              <button class="btn btn-ghost btn-sm" type="button" ${isAvailable ? '' : 'disabled'} onclick="addToCart(${Number(product.id_producto)})">Agregar al carrito</button>
              <button class="btn btn-primary btn-sm" type="button" onclick="showProductDetails(${Number(product.id_producto)})">Ver detalles</button>
            </div>
          </div>
        </div>
      `;

      grid.appendChild(card);
    });
  }

  async function fetchAllProducts() {
    try {
      const response = await fetch(API_BASE);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudieron cargar los productos.');
      }

      allProducts = data;
      populateCategories(allProducts);
      applyFilters();
      updateCartBadge();

      if (activeProductId) {
        const updatedProduct = findProductById(activeProductId);
        if (updatedProduct) {
          fillProductDetails(updatedProduct);
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }

  function addToCart(productId) {
    const product = findProductById(productId);

    if (!product) {
      alert('No se encontro el producto.');
      return;
    }

    if (Number(product.stock) <= 0 || product.estado === 'Agotado') {
      alert('Este producto no esta disponible para agregar al carrito.');
      return;
    }

    const existingItem = cart.find((item) => String(item.id_producto) === String(productId));

    if (existingItem) {
      if (existingItem.quantity >= Number(product.stock)) {
        alert('Ya alcanzaste el stock disponible para este producto.');
        return;
      }

      existingItem.quantity += 1;
    } else {
      cart.push({
        id_producto: Number(product.id_producto),
        quantity: 1
      });
    }

    saveCart();
  }

  function addActiveProductToCart() {
    if (!activeProductId) return;
    addToCart(activeProductId);
  }

  function getCartItemsDetailed() {
    return cart
      .map((item) => {
        const product = findProductById(item.id_producto);
        return product ? {
          ...item,
          product
        } : null;
      })
      .filter(Boolean);
  }

  function renderCart() {
    const cartItemsContainer = document.getElementById('cartItems');
    const detailedItems = getCartItemsDetailed();

    if (!detailedItems.length) {
      cartItemsContainer.innerHTML = `
        <div class="empty-state cart-empty-state">
          <strong>Tu carrito esta vacio.</strong>
          <p>Agrega productos desde el marketplace para verlos aqui.</p>
        </div>
      `;
      document.getElementById('cartItemsCount').textContent = '0';
      document.getElementById('cartTotal').textContent = 'RD$0';
      return;
    }

    let totalQuantity = 0;
    let totalPrice = 0;

    cartItemsContainer.innerHTML = detailedItems.map((item) => {
      const product = item.product;
      const quantity = Number(item.quantity);
      const lineTotal = Number(product.precio || 0) * quantity;

      totalQuantity += quantity;
      totalPrice += lineTotal;

      return `
        <article class="cart-item">
          <div class="cart-item-media">
            <img src="${product.imagen_url || PRODUCT_PLACEHOLDER}" alt="${escapeHtml(product.nombre)}" class="cart-item-image">
          </div>
          <div class="cart-item-copy">
            <h4 class="cart-item-title">${escapeHtml(product.nombre)}</h4>
            <p class="cart-item-meta">${escapeHtml(product.nombre_tienda || 'Leyka Dessert')} · ${escapeHtml(product.categoria || 'Variado')}</p>
            <strong class="cart-item-price">${formatPrice(product.precio)}</strong>
          </div>
          <div class="cart-item-actions">
            <div class="cart-qty-controls">
              <button class="qty-button" type="button" onclick="changeCartQuantity(${Number(product.id_producto)}, -1)">-</button>
              <span class="qty-value">${quantity}</span>
              <button class="qty-button" type="button" onclick="changeCartQuantity(${Number(product.id_producto)}, 1)">+</button>
            </div>
            <strong class="cart-line-total">${formatPrice(lineTotal)}</strong>
            <button class="btn btn-danger btn-sm" type="button" onclick="removeFromCart(${Number(product.id_producto)})">Quitar</button>
          </div>
        </article>
      `;
    }).join('');

    document.getElementById('cartItemsCount').textContent = totalQuantity;
    document.getElementById('cartTotal').textContent = formatPrice(totalPrice);
  }

  function changeCartQuantity(productId, delta) {
    const cartItem = cart.find((item) => String(item.id_producto) === String(productId));
    const product = findProductById(productId);

    if (!cartItem || !product) {
      return;
    }

    const nextQuantity = cartItem.quantity + delta;

    if (nextQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    if (nextQuantity > Number(product.stock || 0)) {
      alert('No puedes agregar mas unidades que el stock disponible.');
      return;
    }

    cartItem.quantity = nextQuantity;
    saveCart();
  }

  function removeFromCart(productId) {
    cart = cart.filter((item) => String(item.id_producto) !== String(productId));
    saveCart();
  }

  function clearCart() {
    if (!cart.length) {
      return;
    }

    if (!confirm('Quieres vaciar el carrito completo?')) {
      return;
    }

    cart = [];
    saveCart();
  }

  async function confirmOrder() {
    if (!cart.length) {
      alert('Tu carrito esta vacio.');
      return;
    }

    const detailedItems = getCartItemsDetailed();
    const total = detailedItems.reduce((sum, item) => sum + (Number(item.product.precio || 0) * Number(item.quantity)), 0);

    const btn = document.getElementById('confirmOrderButton');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Confirmando...';
    }

    try {
      const response = await fetch('http://localhost:3000/api/checkout/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart, total, id_usuario: currentUserId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo confirmar el pedido.');
      }

      alert('Pedido confirmado con exito!');
      cart = [];
      saveCart();
      closeCart();
      
      // Recargar productos para actualizar los stocks y estados
      fetchAllProducts();

    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Confirmar pedido';
      }
    }
  }

  function openCart() {
    const overlay = document.getElementById('cartOverlay');
    renderCart();
    overlay.hidden = false;
    overlay.style.display = 'flex';
    overlay.offsetHeight;
    overlay.classList.add('is-open');
  }

  function closeCart() {
    const overlay = document.getElementById('cartOverlay');
    overlay.classList.remove('is-open');
    setTimeout(() => {
      overlay.hidden = true;
      overlay.style.display = 'none';
    }, 240);
  }

  function fillProductDetails(product) {
    const isAvailable = Number(product.stock) > 0 && product.estado !== 'Agotado';

    document.getElementById('detailTitle').textContent = product.nombre;
    document.getElementById('detailImage').src = product.imagen_url || PRODUCT_PLACEHOLDER;
    document.getElementById('detailImage').alt = product.nombre;
    document.getElementById('detailCat').textContent = product.categoria || 'Variado';
    document.getElementById('detailDesc').textContent = product.descripcion || 'Sin descripcion detallada disponible.';
    document.getElementById('detailPrice').textContent = formatPrice(product.precio);
    document.getElementById('detailStock').textContent = `${Number(product.stock || 0)} uds. disponibles`;
    document.getElementById('detailStore').textContent = product.nombre_tienda || 'Leyka Dessert';
    document.getElementById('detailRatingStars').textContent = renderStars(product.rating_promedio);
    document.getElementById('detailRatingValue').textContent = Number(product.rating_promedio || 0).toFixed(1);
    document.getElementById('detailRatingCount').textContent = Number(product.total_resenas || 0) === 1
      ? '1 resena'
      : `${Number(product.total_resenas || 0)} resenas`;

    const stateElement = document.getElementById('detailState');
    stateElement.textContent = product.estado;
    stateElement.className = `product-state ${product.estado === 'Disponible' ? '' : 'product-state--agotado'}`;

    const addToCartButton = document.getElementById('detailAddToCartButton');
    addToCartButton.disabled = !isAvailable;

    const whatsappButton = document.getElementById('detailWhatsapp');
    if (product.whatsapp) {
      const cleanWhatsapp = String(product.whatsapp).replace(/\D/g, '');
      whatsappButton.href = `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(`Hola, estoy interesado en el producto: ${product.nombre}`)}`;
      whatsappButton.style.display = 'inline-flex';
    } else {
      whatsappButton.style.display = 'none';
    }
  }

  async function showProductDetails(productId) {
    const product = findProductById(productId);

    if (!product) {
      alert('No se encontro el producto.');
      return;
    }

    activeProductId = Number(productId);
    fillProductDetails(product);
    resetReviewForm();
    updateReviewFormAvailability();

    const overlay = document.getElementById('detailOverlay');
    overlay.hidden = false;
    overlay.style.display = 'flex';
    overlay.offsetHeight;
    overlay.classList.add('is-open');

    await loadProductReviews(productId);
  }

  function closeProductDetails() {
    const overlay = document.getElementById('detailOverlay');
    overlay.classList.remove('is-open');
    setTimeout(() => {
      overlay.hidden = true;
      overlay.style.display = 'none';
    }, 240);
  }

  function resetReviewForm() {
    selectedRating = 0;
    document.getElementById('reviewComment').value = '';
    document.getElementById('reviewSubmitButton').textContent = 'Publicar comentario';
    paintSelectedRating();
  }

  function setSelectedRating(rating) {
    selectedRating = Number(rating);
    paintSelectedRating();
  }

  function paintSelectedRating() {
    const starButtons = Array.from(document.querySelectorAll('#reviewStars .star-button'));
    starButtons.forEach((button) => {
      const buttonRating = Number(button.dataset.rating);
      const isActive = buttonRating <= selectedRating;
      button.classList.toggle('is-active', isActive);
      button.textContent = isActive ? '★' : '☆';
    });
  }

  function updateReviewSummary(summary) {
    const totalReviews = Number(summary.total_resenas || 0);
    document.getElementById('reviewCountLabel').textContent = totalReviews === 1
      ? '1 resena'
      : `${totalReviews} resenas`;

    const activeProduct = findProductById(activeProductId);
    if (activeProduct) {
      activeProduct.rating_promedio = Number(summary.rating_promedio || 0);
      activeProduct.total_resenas = totalReviews;
      fillProductDetails(activeProduct);
    }
  }

  function renderReviews(reviews) {
    const reviewsList = document.getElementById('reviewsList');

    if (!reviews.length) {
      reviewsList.innerHTML = `
        <div class="empty-state review-empty-state">
          <strong>Aun no hay comentarios.</strong>
          <p>Se el primero en valorar este producto.</p>
        </div>
      `;
      return;
    }

    reviewsList.innerHTML = reviews.map((review) => {
      const reviewDate = review.fecha_actualizacion || review.fecha_resena;
      const parsedDate = reviewDate ? new Date(reviewDate) : null;
      const formattedDate = parsedDate && !Number.isNaN(parsedDate.getTime())
        ? parsedDate.toLocaleDateString()
        : '';

      return `
        <article class="review-card">
          <div class="review-card-header">
            <div>
              <strong class="review-author">${escapeHtml(review.nombre || 'Usuario')}</strong>
              <div class="review-stars-text">${renderStars(review.valoracion)} · ${Number(review.valoracion || 0)}/5</div>
            </div>
            <span class="review-date">${escapeHtml(formattedDate)}</span>
          </div>
          <p class="review-comment">${escapeHtml(review.comentario || 'Sin comentario adicional.')}</p>
        </article>
      `;
    }).join('');
  }

  function updateReviewFormAvailability() {
    const loginHint = document.getElementById('reviewLoginHint');
    const reviewComment = document.getElementById('reviewComment');
    const reviewSubmitButton = document.getElementById('reviewSubmitButton');
    const starButtons = Array.from(document.querySelectorAll('#reviewStars .star-button'));
    const isLoggedIn = Boolean(user && token);

    loginHint.hidden = isLoggedIn;
    reviewComment.disabled = !isLoggedIn;
    reviewSubmitButton.disabled = !isLoggedIn;
    starButtons.forEach((button) => {
      button.disabled = !isLoggedIn;
    });
  }

  async function loadProductReviews(productId) {
    try {
      const response = await fetch(`${API_BASE}/${productId}/reviews`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudieron cargar las resenas.');
      }

      updateReviewSummary(data.summary || {});
      renderReviews(data.reviews || []);

      if (currentUserId) {
        const existingReview = (data.reviews || []).find((review) => Number(review.id_usuario) === currentUserId);
        if (existingReview) {
          selectedRating = Number(existingReview.valoracion || 0);
          document.getElementById('reviewComment').value = existingReview.comentario || '';
          document.getElementById('reviewSubmitButton').textContent = 'Actualizar comentario';
          paintSelectedRating();
        }
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      renderReviews([]);
    }
  }

  async function submitReview(event) {
    event.preventDefault();

    if (!user || !token) {
      alert('Debes iniciar sesion para comentar.');
      return;
    }

    if (!activeProductId) {
      return;
    }

    if (!selectedRating) {
      alert('Selecciona una valoracion antes de enviar.');
      return;
    }

    const comentario = document.getElementById('reviewComment').value.trim();

    try {
      const response = await fetch(`${API_BASE}/${activeProductId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          valoracion: selectedRating,
          comentario
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo guardar la resena.');
      }

      await fetchAllProducts();
      await loadProductReviews(activeProductId);
      // Limpiar el formulario despues de enviar exitosamente
      resetReviewForm();
    } catch (error) {
      alert(error.message);
    }
  }

  document.getElementById('searchInput').addEventListener('input', applyFilters);
  document.getElementById('filterCat').addEventListener('change', applyFilters);
  document.getElementById('filterStatus').addEventListener('change', applyFilters);
  document.getElementById('reviewForm').addEventListener('submit', submitReview);

  document.getElementById('detailOverlay').addEventListener('click', (event) => {
    if (event.target.id === 'detailOverlay') {
      closeProductDetails();
    }
  });

  document.getElementById('cartOverlay').addEventListener('click', (event) => {
    if (event.target.id === 'cartOverlay') {
      closeCart();
    }
  });

  Array.from(document.querySelectorAll('#reviewStars .star-button')).forEach((button) => {
    button.addEventListener('click', () => setSelectedRating(button.dataset.rating));
  });

  updateCartBadge();
  updateReviewFormAvailability();
  fetchAllProducts();
