import { database } from "./database.js";

export const state = {
  products: [],
  users: [],
  currentUser: null,
  editId: null,
  deleteId: null,
  authMode: "login"
};

/**
 * Normaliza un producto del servidor para que el frontend lo entienda
 */
export function normalizeProduct(p) {
  if (!p) return null;
  
  // Prioridad absoluta al ID de SQL Server
  const id = p.id_producto !== undefined ? p.id_producto : p.id;
  const imagen = p.imagen_url !== undefined ? p.imagen_url : p.imagen;
  
  return {
    ...p,
    id: id,
    imagen: imagen
  };
}

export async function loadState() {
  try {
    // 1. Cargar sesión local
    const session = await database.getSession();
    state.currentUser = session;

    // 2. Cargar productos desde la API (SQL Server)
    const products = await database.getAllProducts();
    state.products = Array.isArray(products) ? products.map(normalizeProduct) : [];

    console.log("✅ Estado cargado. IDs disponibles:", state.products.map(p => p.id));
  } catch (error) {
    console.error("❌ Error cargando estado:", error);
    state.products = [];
  }
}

export async function saveProducts() {
  return state.products;
}

export async function saveSession() {
  return database.setSession(state.currentUser);
}

export function setAuthMode(mode) {
  state.authMode = mode === "register" ? "register" : "login";
}

export function setCurrentUser(user) {
  state.currentUser = user;
}

export function setEditId(id) {
  state.editId = id;
}

export function setDeleteId(id) {
  state.deleteId = id;
}

export function getNextProductId() {
  return Date.now(); 
}
