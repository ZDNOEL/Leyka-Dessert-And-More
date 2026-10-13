import { formatMoney } from "./helpers.js";
import { state } from "./store.js";
import { dom, showToast } from "./ui.js";

function getProductById(id) {
  // Usamos == para permitir comparación entre string y number por si acaso
  return (
    state.products.find(function (product) {
      return product.id == id;
    }) || null
  );
}

function buildProductShareText(product) {
  return [
    `Producto: ${product.nombre}`,
    `Categoria: ${product.categoria}`,
    `Precio: ${formatMoney(product.precio)}`,
    `Estado: ${product.estado}`,
    `Stock: ${product.stock} unidades`,
    product.descripcion ? `Descripcion: ${product.descripcion}` : "",
    "Leyka Dessert And More"
  ]
    .filter(Boolean)
    .join("\n");
}

function buildCatalogShareText() {
  const visibleProducts = state.products.slice(0, 4).map(function (product) {
    return `${product.nombre} (${formatMoney(product.precio)})`;
  });

  const remainingCount = Math.max(0, state.products.length - visibleProducts.length);
  const extraLine = remainingCount ? `Y ${remainingCount} producto(s) mas en el catalogo.` : "";

  return [
    "Catalogo de Leyka Dessert And More",
    "",
    ...visibleProducts,
    extraLine
  ]
    .filter(Boolean)
    .join("\n");
}

function canUseNativeShare(shareData) {
  if (!window.isSecureContext || typeof navigator.share !== "function") {
    return false;
  }

  if (typeof navigator.canShare !== "function") {
    return true;
  }

  try {
    return navigator.canShare(shareData);
  } catch (error) {
    return false;
  }
}

async function copyText(text) {
  if (!window.isSecureContext || !navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
    throw new Error("Clipboard API no disponible en este contexto.");
  }

  await navigator.clipboard.writeText(text);
}

function isAbortError(error) {
  return Boolean(error && error.name === "AbortError");
}

async function shareWithFallback(shareData, fallbackText, sharedMessage, copiedMessage) {
  if (canUseNativeShare(shareData)) {
    try {
      await navigator.share(shareData);
      showToast(sharedMessage, "success");
      return;
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      console.error(error);
    }
  }

  try {
    await copyText(fallbackText);
    showToast(copiedMessage, "success");
  } catch (error) {
    console.error(error);
    showToast("Tu navegador no pudo compartir ni copiar la informacion.", "error");
  }
}

export function initApis() {
  if (dom.shareCatalogButton) {
    dom.shareCatalogButton.addEventListener("click", shareCatalog);
  }
}

export async function shareCatalog() {
  if (!state.products.length) {
    showToast("No hay productos en el catalogo para compartir.", "warning");
    return;
  }

  const shareText = buildCatalogShareText();

  await shareWithFallback(
    {
      title: "Catalogo Leyka Dessert And More",
      text: shareText
    },
    shareText,
    "Catalogo compartido correctamente.",
    "Resumen del catalogo copiado al portapapeles."
  );
}

export async function shareProductById(id) {
  const product = getProductById(id);

  if (!product) {
    showToast("No se encontro el producto para compartir.", "warning");
    return;
  }

  const shareText = buildProductShareText(product);

  await shareWithFallback(
    {
      title: product.nombre,
      text: shareText
    },
    shareText,
    `${product.nombre} compartido correctamente.`,
    `La informacion de ${product.nombre} se copio al portapapeles.`
  );
}
