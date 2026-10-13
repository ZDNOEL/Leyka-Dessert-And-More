import { normalizeKey } from "./helpers.js";

export const PRODUCT_STORAGE_KEY = "leykadessert_products";
export const USERS_STORAGE_KEY = "leyka_users";
export const SESSION_STORAGE_KEY = "leyka_session";
export const CATALOG_VERSION_KEY = "leyka_catalog_version";
export const CURRENT_CATALOG_VERSION = "2026-05-img-catalog";
export const TODAY = new Date().toISOString().split("T")[0];

export const CATEGORY_OPTIONS = ["Pasteles", "Postres", "Galletas"];

export const PRODUCT_TEMPLATES = [
  {
    sku: "brownies",
    nombre: "Brownies de Chocolate",
    aliases: ["Brownies"],
    categoria: "Postres",
    precio: 420,
    stock: 12,
    estado: "Disponible",
    descripcion: "Cuadros intensos de chocolate con centro humedo y acabado artesanal.",
    fecha: TODAY,
    imagen: "img/Brownies.png",
    etiqueta: "Top ventas",
    descuento: 22,
    rating: 4.9,
    ventas: "180+ pedidos"
  },
  {
    sku: "cheesecake",
    nombre: "Cheesecake de Frutos Rojos",
    aliases: ["Cheescake", "Cheesecake"],
    categoria: "Postres",
    precio: 2200,
    stock: 4,
    estado: "Disponible",
    descripcion: "Base mantecosa con relleno cremoso y cubierta de frutos rojos.",
    fecha: TODAY,
    imagen: "img/cheescake.jpg",
    etiqueta: "Premium",
    descuento: 15,
    rating: 4.8,
    ventas: "95+ pedidos"
  },
  {
    sku: "chocolate-cake",
    nombre: "Pastel de Chocolate",
    aliases: ["Chocolate", "Cupcake de Chocolate"],
    categoria: "Pasteles",
    precio: 1850,
    stock: 6,
    estado: "Disponible",
    descripcion: "Bizcocho de chocolate cubierto con crema suave y acabado de celebracion.",
    fecha: TODAY,
    imagen: "img/chocolate2.jpg.jpeg",
    etiqueta: "Favorito",
    descuento: 18,
    rating: 4.7,
    ventas: "120+ pedidos"
  },
  {
    sku: "flan",
    nombre: "Flan Casero",
    aliases: ["Flan"],
    categoria: "Postres",
    precio: 650,
    stock: 8,
    estado: "Disponible",
    descripcion: "Flan sedoso con caramelo brillante y textura bien cremosa.",
    fecha: TODAY,
    imagen: "img/flan.jpg",
    etiqueta: "Hecho en casa",
    descuento: 12,
    rating: 4.6,
    ventas: "70+ pedidos"
  },
  {
    sku: "cookies",
    nombre: "Galletas de Mantequilla",
    aliases: ["Galletas"],
    categoria: "Galletas",
    precio: 220,
    stock: 0,
    estado: "Agotado",
    descripcion: "Galletas suaves y decoradas, perfectas para mesas dulces o regalos.",
    fecha: TODAY,
    imagen: "img/Galletas.png",
    etiqueta: "Edicion dulce",
    descuento: 10,
    rating: 4.5,
    ventas: "150+ pedidos"
  },
  {
    sku: "vanilla-cake",
    nombre: "Pastel de Vainilla",
    aliases: ["Vainilla"],
    categoria: "Pasteles",
    precio: 1700,
    stock: 5,
    estado: "Disponible",
    descripcion: "Pastel clasico de vainilla con cobertura cremosa y acabado limpio.",
    fecha: TODAY,
    imagen: "img/vainilla2.jpg.jpeg",
    etiqueta: "Nuevo look",
    descuento: 14,
    rating: 4.7,
    ventas: "88+ pedidos"
  }
];

const templateOrder = new Map(
  PRODUCT_TEMPLATES.map(function (template, index) {
    return [template.sku, index];
  })
);

function cloneTemplate(template) {
  const { aliases, ...product } = template;
  return { ...product };
}

export function buildDefaultProducts() {
  return PRODUCT_TEMPLATES.map(function (template, index) {
    return {
      id: index + 1,
      ...cloneTemplate(template)
    };
  });
}

export function getTemplateByImage(imagePath = "") {
  return (
    PRODUCT_TEMPLATES.find(function (template) {
      return template.imagen === imagePath;
    }) || null
  );
}

export function getTemplateMatch(product = {}) {
  const keys = [normalizeKey(product.nombre), normalizeKey(product.imagen)].filter(Boolean);

  return (
    PRODUCT_TEMPLATES.find(function (template) {
      const templateKeys = [
        normalizeKey(template.nombre),
        normalizeKey(template.imagen),
        ...template.aliases.map(function (alias) {
          return normalizeKey(alias);
        })
      ];

      return keys.some(function (key) {
        return templateKeys.includes(key);
      });
    }) || null
  );
}

export function createProductFromTemplate(template, overrides = {}) {
  return {
    ...cloneTemplate(template),
    ...overrides
  };
}

export function getTemplateOrder(sku = "") {
  return templateOrder.get(sku) ?? Number.MAX_SAFE_INTEGER;
}
