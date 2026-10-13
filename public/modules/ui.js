import { CATEGORY_OPTIONS, PRODUCT_TEMPLATES, TODAY, getTemplateByImage } from "./config.js";
import { calculateListPrice, escapeHtml, formatMoney, toNumber } from "./helpers.js";
import { setDeleteId, setEditId, state } from "./store.js";

export const dom = {};

let toastTimer = null;

function cacheDom() {
  Object.assign(dom, {
    authShell: document.getElementById("authShell"),
    appShell: document.getElementById("appShell"),
    headerAuthGuest: document.getElementById("headerAuthGuest"),
    headerSession: document.getElementById("headerSession"),
    sessionUserName: document.getElementById("sessionUserName"),
    loginForm: document.getElementById("loginForm"),
    registerForm: document.getElementById("registerForm"),
    loginTab: document.getElementById("loginTab"),
    registerTab: document.getElementById("registerTab"),
    loginEmail: document.getElementById("loginEmail"),
    registerName: document.getElementById("registerName"),
    searchInput: document.getElementById("searchInput"),
    filterCat: document.getElementById("filterCat"),
    filterStatus: document.getElementById("filterStatus"),
    catalogGrid: document.getElementById("catalogGrid"),
    emptyState: document.getElementById("emptyState"),
    statTotal: document.getElementById("stat-total"),
    statDisponibles: document.getElementById("stat-disponibles"),
    statAgotados: document.getElementById("stat-agotados"),
    statPrecio: document.getElementById("stat-precio"),
    overlay: document.getElementById("overlay"),
    modalTitle: document.getElementById("modalTitle"),
    productForm: document.getElementById("productForm"),
    fImagen: document.getElementById("fImagen"),
    fNombre: document.getElementById("fNombre"),
    fCategoria: document.getElementById("fCategoria"),
    fPrecio: document.getElementById("fPrecio"),
    fStock: document.getElementById("fStock"),
    fEstado: document.getElementById("fEstado"),
    fFecha: document.getElementById("fFecha"),
    fDescripcion: document.getElementById("fDescripcion"),
    imageHint: document.getElementById("imageHint"),
    confirmOverlay: document.getElementById("confirmOverlay"),
    confirmMessage: document.getElementById("confirmMessage"),
    toast: document.getElementById("toast"),
    spotlightName: document.getElementById("spotlightName"),
    spotlightPrice: document.getElementById("spotlightPrice"),
    shareCatalogButton: document.getElementById("shareCatalogButton"),
    createProductButton: document.getElementById("createProductButton"),
    logoutButton: document.getElementById("logoutButton"),
    cancelDeleteButton: document.getElementById("cancelDeleteButton"),
    confirmDeleteButton: document.getElementById("confirmDeleteButton")
  });
}

function bindChromeEvents() {
  dom.overlay.addEventListener("click", function (event) {
    if (event.target === dom.overlay) {
      closeModal();
    }
  });

  dom.confirmOverlay.addEventListener("click", function (event) {
    if (event.target === dom.confirmOverlay) {
      closeConfirm();
    }
  });

  document.querySelectorAll("[data-modal-close]").forEach(function (button) {
    button.addEventListener("click", closeModal);
  });

  // Lógica de estado automático basado en stock
  dom.fStock.addEventListener("input", function() {
    const stock = parseInt(dom.fStock.value) || 0;
    if (stock === 0) {
      dom.fEstado.value = "Agotado";
    } else if (dom.fEstado.value === "Agotado" && stock > 0) {
      dom.fEstado.value = "Disponible";
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") {
      return;
    }

    if (!dom.overlay.hidden) {
      closeModal();
    }

    if (!dom.confirmOverlay.hidden) {
      closeConfirm();
    }
  });
}

function toggleLayer(element, shouldOpen) {
  if (shouldOpen) {
    element.hidden = false;
    window.requestAnimationFrame(function () {
      element.classList.add("is-open");
    });
    return;
  }

  element.classList.remove("is-open");
  window.setTimeout(function () {
    if (!element.classList.contains("is-open")) {
      element.hidden = true;
    }
  }, 220);
}

export function initUI() {
  cacheDom();
  bindChromeEvents();
  populateCategoryOptions();
  renderAuthMode();
  renderAuthVisibility();
  resetProductForm();
}

export function renderAuthMode() {
  const isLogin = state.authMode === "login";

  dom.loginForm.hidden = !isLogin;
  dom.registerForm.hidden = isLogin;
  dom.loginTab.classList.toggle("active", isLogin);
  dom.registerTab.classList.toggle("active", !isLogin);
}

export function renderAuthVisibility() {
  const isLoggedIn = Boolean(state.currentUser);

  dom.authShell.hidden = isLoggedIn;
  dom.appShell.hidden = !isLoggedIn;
  dom.headerAuthGuest.hidden = isLoggedIn;
  dom.headerSession.hidden = !isLoggedIn;
  dom.sessionUserName.textContent = isLoggedIn ? state.currentUser.nombre : "";
}

export function populateCategoryOptions() {
  const categories = Array.from(
    new Set(
      [...CATEGORY_OPTIONS, ...PRODUCT_TEMPLATES.map(function (template) {
        return template.categoria;
      })]
    )
  );

  dom.filterCat.innerHTML = [
    '<option value="">Todas las categorias</option>',
    ...categories.map(function (category) {
      return `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`;
    })
  ].join("");

  dom.fCategoria.innerHTML = [
    '<option value="">Seleccionar categoria</option>',
    ...categories.map(function (category) {
      return `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`;
    })
  ].join("");
}



export function setImageHint(fileName = "") {
  dom.imageHint.textContent = fileName
    ? `Imagen seleccionada: ${fileName}`
    : "Selecciona una imagen desde tu equipo.";
}

export function resetProductForm() {
  dom.productForm.reset();
  dom.fImagen.value = "";
  delete dom.fImagen.dataset.base64;
  dom.fImagen.required = true;
  dom.fNombre.value = "";
  dom.fCategoria.value = "";
  dom.fPrecio.value = "";
  dom.fStock.value = "";
  dom.fEstado.value = "Disponible";
  dom.fFecha.value = TODAY;
  dom.fDescripcion.value = "";
  setImageHint();
}

export function fillProductForm(product) {
  dom.fImagen.value = "";
  dom.fImagen.dataset.base64 = product.imagen || "";
  dom.fImagen.required = false;
  dom.fNombre.value = product.nombre || "";
  dom.fCategoria.value = product.categoria || "";
  dom.fPrecio.value = product.precio ?? "";
  dom.fStock.value = product.stock ?? "";
  dom.fEstado.value = product.estado || "Disponible";
  dom.fFecha.value = product.fecha || TODAY;
  dom.fDescripcion.value = product.descripcion || "";
  setImageHint(product.imagen ? "Imagen actual cargada" : "");
}

export function getProductFormValues() {
  return {
    imagen: dom.fImagen.dataset.base64 || "",
    nombre: dom.fNombre.value.trim(),
    categoria: dom.fCategoria.value,
    precio: dom.fPrecio.value,
    stock: dom.fStock.value,
    estado: dom.fEstado.value,
    fecha: dom.fFecha.value,
    descripcion: dom.fDescripcion.value.trim()
  };
}

export function openModal(title) {
  dom.modalTitle.textContent = title;
  toggleLayer(dom.overlay, true);
}

export function closeModal() {
  setEditId(null);
  toggleLayer(dom.overlay, false);
}

export function openConfirm(message) {
  dom.confirmMessage.textContent = message;
  toggleLayer(dom.confirmOverlay, true);
}

export function closeConfirm() {
  setDeleteId(null);
  toggleLayer(dom.confirmOverlay, false);
}

export function renderStats(products) {
  const total = products.length;
  const disponibles = products.filter(function (product) {
    return product.estado === "Disponible";
  }).length;
  const agotados = total - disponibles;
  const promedio = total
    ? Math.round(
        products.reduce(function (sum, product) {
          return sum + toNumber(product.precio, 0);
        }, 0) / total
      )
    : 0;

  dom.statTotal.textContent = String(total);
  dom.statDisponibles.textContent = String(disponibles);
  dom.statAgotados.textContent = String(agotados);
  dom.statPrecio.textContent = formatMoney(promedio);
}

export function renderSpotlight(product) {
  if (!product) {
    dom.spotlightName.textContent = "Catalogo Leyka";
    dom.spotlightPrice.textContent = formatMoney(0);
    return;
  }

  dom.spotlightName.textContent = product.nombre;
  dom.spotlightPrice.textContent = formatMoney(product.precio);
}

export function renderCatalog(products) {
  if (!products.length) {
    dom.catalogGrid.innerHTML = "";
    dom.emptyState.hidden = false;
    return;
  }

  dom.emptyState.hidden = true;
  dom.catalogGrid.innerHTML = products
    .map(function (product) {
      const previousPrice = calculateListPrice(product.precio, product.descuento);
      const statusClass = product.estado === "Agotado" ? "product-state product-state--agotado" : "product-state";
      const ratingText = `${toNumber(product.rating, 0).toFixed(1)} / 5`;

      return `
        <article class="product-card ${product.estado === "Agotado" ? "is-agotado" : ""}" id="producto-${product.id}">
          <div class="product-media">
            <img class="product-image" src="${escapeHtml(product.imagen)}" alt="${escapeHtml(product.nombre)}">
            <span class="product-badge">-${Math.round(toNumber(product.descuento, 0))}%</span>
            <span class="${statusClass}">${escapeHtml(product.estado)}</span>
          </div>

          <div class="product-body">
            <div class="product-meta-row">
              <span class="product-cat">${escapeHtml(product.categoria)}</span>
              <span class="product-rating">${escapeHtml(ratingText)}</span>
            </div>

            <h3 class="product-name">${escapeHtml(product.nombre)}</h3>
            <p class="product-desc">${escapeHtml(product.descripcion)}</p>

            <div class="product-price-row">
              <div class="product-price-block">
                <strong class="product-price">${formatMoney(product.precio)}</strong>
                <span class="product-old-price">${formatMoney(previousPrice)}</span>
              </div>
              <span class="product-stock">${toNumber(product.stock, 0)} uds.</span>
            </div>

            <div class="product-foot">
              <span class="product-tag">${escapeHtml(product.ventas || product.etiqueta || "Catalogo Leyka")}</span>
              <div class="actions-cell">
                <button class="btn btn-ghost btn-sm" type="button" data-action="share" data-product-id="${product.id}">Compartir</button>
                <button class="btn btn-ghost btn-sm" type="button" data-action="edit" data-product-id="${product.id}">Editar</button>
                <button class="btn btn-danger btn-sm" type="button" data-action="delete" data-product-id="${product.id}">Eliminar</button>
              </div>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

export function showToast(message, type = "") {
  if (toastTimer) {
    window.clearTimeout(toastTimer);
  }

  dom.toast.textContent = message;
  dom.toast.className = `toast ${type}`.trim();
  dom.toast.classList.add("is-visible");

  toastTimer = window.setTimeout(function () {
    dom.toast.classList.remove("is-visible");
  }, 2800);
}
