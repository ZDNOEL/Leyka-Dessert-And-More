import { state, saveSession, setAuthMode, setCurrentUser } from "./store.js";
import { closeConfirm, closeModal, dom, renderAuthMode, renderAuthVisibility, showToast } from "./ui.js";

const API_URL = "http://localhost:3000/api/auth";

async function startSession(user, token) {
  localStorage.setItem('token', token);
  setCurrentUser(user);
  await saveSession();
  renderAuthVisibility();
}

function bindAuthEvents() {
  dom.loginTab.addEventListener("click", function () {
    switchAuthMode("login");
  });

  dom.registerTab.addEventListener("click", function () {
    switchAuthMode("register");
  });

  dom.loginForm.addEventListener("submit", submitLogin);
  dom.registerForm.addEventListener("submit", submitRegister);
  dom.logoutButton.addEventListener("click", logout);

  document.querySelectorAll("[data-switch-auth]").forEach(function (button) {
    button.addEventListener("click", function () {
      switchAuthMode(button.dataset.switchAuth);
    });
  });

  document.querySelectorAll("[data-focus-auth]").forEach(function (button) {
    button.addEventListener("click", function () {
      focusAuth(button.dataset.focusAuth);
    });
  });
}

export function initAuth() {
  bindAuthEvents();
}

export function switchAuthMode(mode) {
  setAuthMode(mode);
  renderAuthMode();
}

export function focusAuth(mode = "login") {
  if (state.currentUser) {
    return;
  }

  switchAuthMode(mode);
  dom.authShell.scrollIntoView({ behavior: "smooth", block: "start" });

  const targetField = mode === "register" ? dom.registerName : dom.loginEmail;
  window.setTimeout(function () {
    targetField?.focus();
  }, 220);
}

export function requireSession() {
  if (state.currentUser) {
    return true;
  }

  switchAuthMode("login");
  renderAuthVisibility();
  showToast("Debes iniciar sesion para usar el catalogo.", "warning");
  focusAuth("login");
  return false;
}

export async function submitRegister(event) {
  event.preventDefault();

  const nombre = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim().toLowerCase();
  const password_hash = document.getElementById("registerPassword").value;
  const confirmPassword = document.getElementById("registerConfirmPassword").value;

  if (!nombre || !email || !password_hash || !confirmPassword) {
    showToast("Completa todos los campos del registro.", "warning");
    return;
  }

  if (password_hash.length < 4) {
    showToast("La contrasena debe tener al menos 4 caracteres.", "warning");
    return;
  }

  if (password_hash !== confirmPassword) {
    showToast("Las contrasenas no coinciden.", "error");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, password_hash })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error en el registro");

    showToast("Cuenta creada correctamente. Por favor, inicia sesion.", "success");
    switchAuthMode("login");
    dom.registerForm.reset();
  } catch (error) {
    console.error(error);
    showToast(error.message, "error");
  }
}

export async function submitLogin(event) {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value.trim().toLowerCase();
  const password_hash = document.getElementById("loginPassword").value;

  if (!email || !password_hash) {
    showToast("Escribe tu correo y tu contrasena.", "warning");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password_hash })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al iniciar sesion");

    dom.loginForm.reset();
    await startSession(data.user, data.token);
    showToast(`Bienvenido, ${data.user.nombre}.`, "success");
    
    // Redirect if seller
    if (data.user.isSeller) {
      window.location.href = "dashboard.html";
    }
  } catch (error) {
    console.error(error);
    showToast(error.message, "error");
  }
}

export async function logout() {
  try {
    setCurrentUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    await saveSession();
    closeModal();
    closeConfirm();
    renderAuthVisibility();
    switchAuthMode("login");
    showToast("Sesion cerrada correctamente.", "warning");
    focusAuth("login");
  } catch (error) {
    console.error(error);
    showToast("No se pudo cerrar la sesion correctamente.", "error");
  }
}
