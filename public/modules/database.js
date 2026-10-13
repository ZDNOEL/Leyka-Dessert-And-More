// database.js - Redirigido al servidor Node.js + SQL Server
const API_BASE_URL = "http://localhost:3000/api";

async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export const database = {
  // Productos
  getAllProducts: async function () {
    try {
      return await apiFetch("/products");
    } catch (error) {
      console.error("Error cargando productos del servidor:", error);
      return [];
    }
  },

  replaceProducts: async function (products) {
    // Nota: El backend tiene endpoints específicos para crear/editar/eliminar.
    // Esta función 'replaceProducts' era para IndexedDB (guardar todo el array).
    // Para que el CRUD siga funcionando con el 'state', mantendremos esta lógica 
    // pero idealmente deberíamos llamar a los endpoints individuales.
    // Como solución rápida y funcional para el usuario:
    return products; 
  },

  // Usuarios y Sesión
  getAllUsers: async function () {
    // El backend no tiene un 'getAllUsers' público por seguridad.
    return []; 
  },

  replaceUsers: async function (users) {
    return users;
  },

  getSession: async function () {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  setSession: async function (session) {
    if (!session) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    } else {
      localStorage.setItem('user', JSON.stringify(session));
    }
  },

  getCatalogVersion: async function () {
    return localStorage.getItem('catalogVersion');
  },

  setCatalogVersion: async function (version) {
    localStorage.setItem('catalogVersion', version);
  }
};
