import { shareProductById } from "./apis.js";
import { TODAY, createProductFromTemplate, getTemplateByImage, getTemplateOrder } from "./config.js";
import { requireSession } from "./auth.js";
import { toNumber } from "./helpers.js";
import { getNextProductId, saveProducts, setDeleteId, setEditId, state, normalizeProduct } from "./store.js";
import {
  closeConfirm,
  closeModal,
  dom,
  fillProductForm,
  getProductFormValues,
  openConfirm,
  openModal,
  renderCatalog,
  renderSpotlight,
  renderStats,
  resetProductForm,
  setImageHint,
  showToast
} from "./ui.js";

const API_BASE_URL = "http://localhost:3000/api/products";

function bindProductEvents() {
  dom.searchInput.addEventListener("input", renderMarketplace);
  dom.filterCat.addEventListener("change", renderMarketplace);
  dom.filterStatus.addEventListener("change", renderMarketplace);
  dom.createProductButton.addEventListener("click", openCreateProductModal);
  dom.productForm.addEventListener("submit", saveProduct);
  dom.catalogGrid.addEventListener("click", handleCatalogAction);
  dom.fImagen.addEventListener("change", handleImageSelection);
  dom.cancelDeleteButton.addEventListener("click", closeConfirm);
  dom.confirmDeleteButton.addEventListener("click", confirmDelete);
}

function sortProducts(products) {
  return [...products].sort(function (left, right) {
    if (left.estado !== right.estado) {
      return left.estado === "Disponible" ? -1 : 1;
    }
    return (left.id || 0) - (right.id || 0);
  });
}

function getFilteredProducts() {
  const search = dom.searchInput.value.trim().toLowerCase();
  const category = dom.filterCat.value;
  const status = dom.filterStatus.value;

  return state.products.filter(function (product) {
    const haystack = `${product.nombre} ${product.descripcion}`.toLowerCase();
    const matchesSearch = haystack.includes(search);
    const matchesCategory = !category || product.categoria === category;
    const matchesStatus = !status || product.estado === status;

    return matchesSearch && matchesCategory && matchesStatus;
  });
}

function getSpotlightProduct() {
  const availableProducts = state.products.filter(function (product) {
    return product.estado === "Disponible";
  });

  if (!availableProducts.length) {
    return state.products[0] || null;
  }

  return [...availableProducts].sort(function (left, right) {
    return Number(right.precio) - Number(left.precio);
  })[0];
}

function handleImageSelection(event) {
  const file = event.target.files[0];
  if (!file) {
    delete dom.fImagen.dataset.base64;
    setImageHint();
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    dom.fImagen.dataset.base64 = e.target.result;
    setImageHint(file.name);
    showToast("Imagen cargada exitosamente.", "success");
  };
  reader.readAsDataURL(file);
}

function openCreateProductModal() {
  if (!requireSession()) {
    return;
  }

  setEditId(null);
  resetProductForm();
  openModal("Nuevo producto");
}

function editProduct(id) {
  if (!requireSession()) return;

  // Usamos == por si el ID viene como string desde el dataset
  const product = state.products.find(function (item) {
    return item.id == id;
  });

  if (!product) {
    console.warn("Edit falló: No se encontró ID", id, "en", state.products);
    showToast("No se encontro el producto para editar.", "error");
    return;
  }

  setEditId(id);
  fillProductForm(product);
  openModal("Editar producto");
}

function askDelete(id) {
  if (!requireSession()) return;

  const product = state.products.find(function (item) {
    return item.id == id;
  });

  if (!product) {
    console.warn("Delete falló: No se encontró ID", id, "en", state.products);
    showToast("No se encontro el producto para eliminar.", "error");
    return;
  }

  setDeleteId(id);
  openConfirm(`Vas a eliminar "${product.nombre}" del catalogo. Esta accion no se puede deshacer.`);
}

async function handleCatalogAction(event) {
  const target = event.target.closest("[data-action]");

  if (!target) return;

  const productId = target.dataset.productId;
  if (!productId) return;

  if (target.dataset.action === "edit") {
    editProduct(productId);
  } else if (target.dataset.action === "delete") {
    askDelete(productId);
  } else if (target.dataset.action === "share") {
    await shareProductById(productId);
  }
}

export function initProducts() {
  bindProductEvents();
}

export function renderMarketplace() {
  const filteredProducts = sortProducts(getFilteredProducts());
  renderCatalog(filteredProducts);
  renderStats(state.products);
  renderSpotlight(getSpotlightProduct());
}

async function refreshStateFromServer() {
  const res = await fetch(API_BASE_URL);
  if (res.ok) {
    const rawProducts = await res.json();
    state.products = rawProducts.map(normalizeProduct);
  }
}

export async function saveProduct(event) {
  event.preventDefault();

  if (!requireSession()) return;
  
  const isSeller = state.currentUser.isSeller || state.currentUser.sellerInfo;
  if (!isSeller) {
    showToast("Solo los vendedores pueden gestionar productos.", "warning");
    return;
  }

  const formValues = getProductFormValues();

  if (!formValues.imagen || !formValues.nombre || !formValues.categoria || !formValues.precio || formValues.stock === "") {
    showToast("Completa los campos obligatorios del producto.", "warning");
    return;
  }

  const token = localStorage.getItem('token');
  const sellerId = state.currentUser.sellerId || (state.currentUser.sellerInfo ? state.currentUser.sellerInfo.id_vendedor : null);

  if (!sellerId) {
    showToast("No se encontro informacion del vendedor.", "error");
    return;
  }

  const payload = {
    nombre: formValues.nombre,
    categoria: formValues.categoria,
    precio: parseFloat(formValues.precio),
    stock: parseInt(formValues.stock),
    estado: formValues.estado,
    descripcion: formValues.descripcion || "",
    imagen_url: formValues.imagen
  };

  try {
    let res;
    if (state.editId) {
      res = await fetch(`${API_BASE_URL}/${state.editId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(`${API_BASE_URL}/seller/${sellerId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al guardar producto");

    showToast(state.editId ? "Producto actualizado." : "Producto creado.", "success");
    
    await refreshStateFromServer();

    closeModal();
    renderMarketplace();
    setEditId(null);
  } catch (error) {
    console.error(error);
    showToast(error.message, "error");
  }
}

export async function confirmDelete() {
  if (!requireSession() || state.deleteId === null) return;

  const token = localStorage.getItem('token');

  try {
    const res = await fetch(`${API_BASE_URL}/${state.deleteId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Error al eliminar");
    }

    await refreshStateFromServer();

    closeConfirm();
    setDeleteId(null);
    renderMarketplace();
    showToast("Producto eliminado.", "success");
  } catch (error) {
    console.error(error);
    showToast(error.message, "error");
  }
}
