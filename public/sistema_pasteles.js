const API_URL = "http://localhost:3000/api/auth";

const state = {
  currentUser: null
};

const dom = {};
let toastTimer = null;

function cacheDom() {
  Object.assign(dom, {
    authShell: document.getElementById("authShell"),
    appShell: document.getElementById("appShell"),
    headerAuthGuest: document.getElementById("headerAuthGuest"),
    headerSession: document.getElementById("headerSession"),
    sessionUserName: document.getElementById("sessionUserName"),
    navProfile: document.getElementById("navProfile"),
    loginTab: document.getElementById("loginTab"),
    registerTab: document.getElementById("registerTab"),
    sellerTab: document.getElementById("sellerTab"),
    loginForm: document.getElementById("loginForm"),
    registerForm: document.getElementById("registerForm"),
    sellerPanel: document.getElementById("sellerPanel"),
    loginEmail: document.getElementById("loginEmail"),
    registerName: document.getElementById("registerName"),
    sellerLoginForm: document.getElementById("sellerLoginForm"),
    sellerRegisterForm: document.getElementById("sellerRegisterForm"),
    sellerLoginTab: document.getElementById("sellerLoginTab"),
    sellerRegisterTab: document.getElementById("sellerRegisterTab"),
    loginError: document.getElementById("loginError"),
    registerError: document.getElementById("registerError"),
    sellerLoginError: document.getElementById("sellerLoginError"),
    sellerRegError: document.getElementById("sellerRegError"),
    logoutButton: document.getElementById("logoutButton"),
    welcomeTitle: document.getElementById("welcomeTitle"),
    welcomeText: document.getElementById("welcomeText"),
    primaryActionLink: document.getElementById("primaryActionLink"),
    secondaryActionLink: document.getElementById("secondaryActionLink"),
    accountShortcutTitle: document.getElementById("accountShortcutTitle"),
    accountShortcutText: document.getElementById("accountShortcutText"),
    accountShortcutLink: document.getElementById("accountShortcutLink"),
    sellerShortcutTitle: document.getElementById("sellerShortcutTitle"),
    sellerShortcutText: document.getElementById("sellerShortcutText"),
    sellerShortcutLink: document.getElementById("sellerShortcutLink"),
    toast: document.getElementById("toast")
  });
}

function showToast(message, type = "") {
  if (!dom.toast) {
    return;
  }

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

function clearErrors() {
  [
    dom.loginError,
    dom.registerError,
    dom.sellerLoginError,
    dom.sellerRegError
  ].forEach(function (element) {
    if (element) {
      element.textContent = "";
    }
  });
}

function setError(element, message) {
  if (element) {
    element.textContent = message;
  }
}

function parseStoredUser() {
  const rawUser = localStorage.getItem("user");
  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch (error) {
    console.error("No se pudo leer la sesion guardada.", error);
    localStorage.removeItem("user");
    return null;
  }
}

function saveSession(user, token) {
  localStorage.setItem("user", JSON.stringify(user));
  if (token) {
    localStorage.setItem("token", token);
  }
}

function clearSession() {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
}

function getDisplayName(user) {
  if (!user) {
    return "";
  }

  if (user.isSeller && user.sellerInfo && user.sellerInfo.nombre_tienda) {
    return user.sellerInfo.nombre_tienda;
  }

  return user.nombre || user.email || "Usuario";
}

function renderSessionUi() {
  const user = state.currentUser;
  const isLoggedIn = Boolean(user);

  dom.authShell.hidden = isLoggedIn;
  dom.appShell.hidden = !isLoggedIn;
  dom.headerAuthGuest.hidden = isLoggedIn;
  dom.headerSession.hidden = !isLoggedIn;
  dom.sessionUserName.textContent = isLoggedIn ? getDisplayName(user) : "";

  if (!isLoggedIn) {
    dom.navProfile.textContent = "Mi Perfil";
    dom.navProfile.href = "profile.html";
    return;
  }

  const isSeller = Boolean(user.isSeller);
  const displayName = getDisplayName(user);

  if (dom.welcomeTitle) dom.welcomeTitle.textContent = `Hola, ${displayName}`;
  if (dom.welcomeText) {
    dom.welcomeText.textContent = isSeller
      ? "Esta portada ya no maneja inventario. Usa tu dashboard para crear, editar o eliminar productos en la vista correcta."
      : "Esta portada ya no maneja inventario. Desde aqui puedes ir al marketplace o a tu perfil sin tocar la base de datos del catalogo.";
  }

  if (dom.primaryActionLink) {
    dom.primaryActionLink.href = isSeller ? "dashboard.html" : "marketplace.html";
    dom.primaryActionLink.textContent = isSeller ? "Ir al panel vendedor" : "Ir al marketplace";
  }
  if (dom.secondaryActionLink) {
    dom.secondaryActionLink.href = "profile.html";
    dom.secondaryActionLink.textContent = "Ver mi perfil";
  }

  if (dom.navProfile) {
    dom.navProfile.href = isSeller ? "dashboard.html" : "profile.html";
    dom.navProfile.textContent = isSeller ? "Mi Panel" : "Mi Perfil";
  }

  if (dom.accountShortcutTitle) dom.accountShortcutTitle.textContent = "Mi perfil";
  if (dom.accountShortcutText) {
    dom.accountShortcutText.textContent = isSeller
      ? "Consulta tu informacion personal fuera del CRUD de productos."
      : "Consulta tus datos personales y tu informacion de acceso.";
  }
  if (dom.accountShortcutLink) {
    dom.accountShortcutLink.href = "profile.html";
    dom.accountShortcutLink.textContent = "Abrir perfil";
  }

  if (isSeller) {
    if (dom.sellerShortcutTitle) dom.sellerShortcutTitle.textContent = "Dashboard";
    if (dom.sellerShortcutText) dom.sellerShortcutText.textContent = "Administra tu tienda desde la pantalla que si usa la base de datos del inventario.";
    if (dom.sellerShortcutLink) {
      dom.sellerShortcutLink.href = "dashboard.html";
      dom.sellerShortcutLink.textContent = "Abrir dashboard";
    }
    return;
  }

  if (dom.sellerShortcutTitle) dom.sellerShortcutTitle.textContent = "Quiero vender";
  if (dom.sellerShortcutText) dom.sellerShortcutText.textContent = "Si necesitas administrar productos, entra por la zona de vendedores.";
  if (dom.sellerShortcutLink) {
    dom.sellerShortcutLink.href = "#";
    dom.sellerShortcutLink.textContent = "Abrir acceso vendedor";
  }
}

function switchAuthTab(tab) {
  clearErrors();

  const isUserLogin = tab === "user-login";
  const isUserRegister = tab === "user-register";
  const isSeller = tab === "seller";

  dom.loginTab.classList.toggle("active", isUserLogin);
  dom.registerTab.classList.toggle("active", isUserRegister);
  dom.sellerTab.classList.toggle("active", isSeller);

  dom.loginForm.hidden = !isUserLogin;
  dom.registerForm.hidden = !isUserRegister;
  dom.sellerPanel.hidden = !isSeller;
}

function switchSellerTab(tab) {
  clearErrors();

  const isLogin = tab !== "register";
  dom.sellerLoginTab.classList.toggle("active", isLogin);
  dom.sellerRegisterTab.classList.toggle("active", !isLogin);
  dom.sellerLoginForm.hidden = !isLogin;
  dom.sellerRegisterForm.hidden = isLogin;
}

function focusAuth(mode) {
  if (state.currentUser) {
    return;
  }

  const tab = mode === "register" ? "user-register" : "user-login";
  switchAuthTab(tab);
  dom.authShell.scrollIntoView({ behavior: "smooth", block: "start" });

  window.setTimeout(function () {
    if (tab === "user-register") {
      dom.registerName.focus();
      return;
    }

    dom.loginEmail.focus();
  }, 220);
}

async function readJson(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(text || "Respuesta vacia del servidor");
  }
}

async function submitLogin(event) {
  event.preventDefault();
  clearErrors();

  const email = document.getElementById("loginEmail").value.trim().toLowerCase();
  const password_hash = document.getElementById("loginPassword").value;

  if (!email || !password_hash) {
    const message = "Escribe tu correo y tu contrasena.";
    setError(dom.loginError, message);
    showToast(message, "warning");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password_hash })
    });

    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.error || "No se pudo iniciar sesion");
    }

    saveSession(data.user, data.token);
    state.currentUser = data.user;
    dom.loginForm.reset();

    if (data.user.isSeller) {
      window.location.href = "dashboard.html";
      return;
    }

    renderSessionUi();
    showToast(`Bienvenido, ${getDisplayName(data.user)}.`, "success");
  } catch (error) {
    console.error(error);
    setError(dom.loginError, error.message);
    showToast(error.message, "error");
  }
}

async function submitRegister(event) {
  event.preventDefault();
  clearErrors();

  const nombre = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim().toLowerCase();
  const password_hash = document.getElementById("registerPassword").value;
  const confirmPassword = document.getElementById("registerConfirmPassword").value;

  if (!nombre || !email || !password_hash || !confirmPassword) {
    const message = "Completa todos los campos del registro.";
    setError(dom.registerError, message);
    showToast(message, "warning");
    return;
  }

  if (password_hash.length < 4) {
    const message = "La contrasena debe tener al menos 4 caracteres.";
    setError(dom.registerError, message);
    showToast(message, "warning");
    return;
  }

  if (password_hash !== confirmPassword) {
    const message = "Las contrasenas no coinciden.";
    setError(dom.registerError, message);
    showToast(message, "error");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, email, password_hash })
    });

    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.error || "No se pudo crear la cuenta");
    }

    dom.registerForm.reset();
    switchAuthTab("user-login");
    showToast("Cuenta creada correctamente. Ahora puedes iniciar sesion.", "success");
  } catch (error) {
    console.error(error);
    setError(dom.registerError, error.message);
    showToast(error.message, "error");
  }
}

async function submitSellerLogin(event) {
  event.preventDefault();
  clearErrors();

  const email = document.getElementById("sellerLoginEmail").value.trim().toLowerCase();
  const password_hash = document.getElementById("sellerLoginPassword").value;

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password_hash })
    });

    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.error || "No se pudo iniciar sesion");
    }

    if (!data.user.isSeller) {
      throw new Error("Esta cuenta no tiene permisos de vendedor.");
    }

    saveSession(data.user, data.token);
    window.location.href = "dashboard.html";
  } catch (error) {
    console.error(error);
    setError(dom.sellerLoginError, error.message);
    showToast(error.message, "error");
  }
}

async function submitSellerRegister(event) {
  event.preventDefault();
  clearErrors();

  const nombre = document.getElementById("sellerRegName").value.trim();
  const nombre_tienda = document.getElementById("sellerRegStore").value.trim();
  const email = document.getElementById("sellerRegEmail").value.trim().toLowerCase();
  const password_hash = document.getElementById("sellerRegPassword").value;

  if (!nombre || !nombre_tienda || !email || !password_hash) {
    const message = "Completa todos los campos de la tienda.";
    setError(dom.sellerRegError, message);
    showToast(message, "warning");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/register-seller`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, email, password_hash, nombre_tienda })
    });

    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data.error || "No se pudo registrar la tienda");
    }

    dom.sellerRegisterForm.reset();
    switchAuthTab("seller");
    switchSellerTab("login");
    showToast("Tienda registrada correctamente. Ahora puedes iniciar sesion.", "success");
  } catch (error) {
    console.error(error);
    setError(dom.sellerRegError, error.message);
    showToast(error.message, "error");
  }
}

function logout() {
  clearSession();
  state.currentUser = null;
  clearErrors();
  renderSessionUi();
  switchAuthTab("user-login");
  showToast("Sesion cerrada correctamente.", "warning");
  dom.authShell.scrollIntoView({ behavior: "smooth", block: "start" });
}

function bindEvents() {
  document.querySelectorAll("[data-auth-tab]").forEach(function (button) {
    button.addEventListener("click", function () {
      switchAuthTab(button.dataset.authTab);
    });
  });

  document.querySelectorAll("[data-seller-tab]").forEach(function (button) {
    button.addEventListener("click", function () {
      switchSellerTab(button.dataset.sellerTab);
    });
  });

  document.querySelectorAll("[data-focus-auth]").forEach(function (button) {
    button.addEventListener("click", function () {
      focusAuth(button.dataset.focusAuth);
    });
  });

  dom.loginForm.addEventListener("submit", submitLogin);
  dom.registerForm.addEventListener("submit", submitRegister);
  dom.sellerLoginForm.addEventListener("submit", submitSellerLogin);
  dom.sellerRegisterForm.addEventListener("submit", submitSellerRegister);
  dom.logoutButton.addEventListener("click", logout);
  if (dom.sellerShortcutLink) {
    dom.sellerShortcutLink.addEventListener("click", function (event) {
      if (dom.sellerShortcutLink.getAttribute("href") === "#") {
        event.preventDefault();
        logout();
        switchAuthTab("seller");
      }
    });
  }
}

function init() {
  cacheDom();
  bindEvents();
  state.currentUser = parseStoredUser();
  switchAuthTab("user-login");
  switchSellerTab("login");
  renderSessionUi();
}

init();
