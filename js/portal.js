const PORTAL_SESSION_KEY = "agent_ops_portal_session";
const PORTAL_USERS_KEY = "agent_ops_portal_users";

const DEMO_ADMIN = {
  id: "admin",
  fullName: "מנהל מערכת",
  email: "admin@abd-finance.co.il",
  password: "123456",
  agency: "ABD finance",
  role: "super_admin",
  status: "approved",
  createdAt: new Date().toISOString()
};

const portalState = {
  publicPortal: null,
  landingView: null,
  loginView: null,
  registerView: null,
  adminPortal: null,
  appShell: null,
  loginForm: null,
  registerForm: null,
  logoutBtn: null,
  seedPendingBtn: null,
  pendingUsersList: null,
  approvedUsersList: null,
  pendingCount: null,
  approvedCount: null
};

document.addEventListener("DOMContentLoaded", initPortal);

function initPortal() {
  cachePortalElements();
  ensureDemoAdmin();
  bindPortalEvents();
  renderPortalRoute();
  window.addEventListener("hashchange", renderPortalRoute);
}

function cachePortalElements() {
  [
    "publicPortal", "landingView", "loginView", "registerView", "adminPortal", "appShell",
    "loginForm", "registerForm", "logoutBtn", "seedPendingBtn", "pendingUsersList",
    "approvedUsersList", "pendingCount", "approvedCount"
  ].forEach(id => portalState[id] = document.getElementById(id));
}

function bindPortalEvents() {
  portalState.loginForm?.addEventListener("submit", handleLogin);
  portalState.registerForm?.addEventListener("submit", handleRegister);
  portalState.logoutBtn?.addEventListener("click", logoutPortalUser);
  portalState.seedPendingBtn?.addEventListener("click", addDemoPendingUser);
  portalState.pendingUsersList?.addEventListener("click", handleAdminUserAction);
  portalState.approvedUsersList?.addEventListener("click", handleAdminUserAction);
}

function renderPortalRoute() {
  const route = (window.location.hash || "#landing").replace("#", "");
  const session = getPortalSession();
  const isAdminRoute = route === "admin";
  const isAppRoute = route === "app";

  if (isAppRoute && !isApprovedSession(session)) {
    window.location.hash = "#login";
    return;
  }

  if (isAdminRoute && !isAdminSession(session)) {
    window.location.hash = "#login";
    return;
  }

  setHidden(portalState.publicPortal, isAdminRoute || isAppRoute);
  setHidden(portalState.adminPortal, !isAdminRoute);
  setHidden(portalState.appShell, !isAppRoute);

  setHidden(portalState.landingView, route !== "landing" && route !== "features" && route !== "security" && route !== "workflow" && route !== "");
  setHidden(portalState.loginView, route !== "login");
  setHidden(portalState.registerView, route !== "register");

  document.body.classList.toggle("portal-mode", !isAppRoute);
  document.body.classList.toggle("ops-mode", isAppRoute);

  if (isAdminRoute) renderAdminUsers();
}

function handleLogin(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const email = normalizeEmail(form.get("email"));
  const password = String(form.get("password") || "");
  const user = getPortalUsers().find(item => normalizeEmail(item.email) === email);

  if (!user || user.password !== password) {
    showPortalMessage("פרטי ההתחברות אינם נכונים", "error");
    return;
  }

  if (user.status !== "approved") {
    showPortalMessage("המשתמש עדיין ממתין לאישור מנהל", "warning");
    return;
  }

  localStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify({
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    fullName: user.fullName
  }));

  window.location.hash = user.role === "super_admin" ? "#admin" : "#app";
}

function handleRegister(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const email = normalizeEmail(form.get("email"));
  const password = String(form.get("password") || "");
  const passwordConfirm = String(form.get("passwordConfirm") || "");
  const users = getPortalUsers();

  if (users.some(user => normalizeEmail(user.email) === email)) {
    showPortalMessage("כבר קיימת בקשה או הרשמה עם האימייל הזה", "warning");
    return;
  }

  if (password.length < 6) {
    showPortalMessage("הסיסמה חייבת לכלול לפחות 6 תווים", "warning");
    return;
  }

  if (password !== passwordConfirm) {
    showPortalMessage("אימות הסיסמה אינו תואם", "warning");
    return;
  }

  users.push({
    id: crypto.randomUUID ? crypto.randomUUID() : `user-${Date.now()}`,
    fullName: String(form.get("fullName") || "").trim(),
    email,
    phone: String(form.get("phone") || "").trim(),
    agency: String(form.get("agency") || "").trim(),
    note: String(form.get("note") || "").trim(),
    password,
    role: "agent",
    status: "pending",
    createdAt: new Date().toISOString()
  });

  setPortalUsers(users);
  event.currentTarget.reset();
  showPortalMessage("בקשת ההצטרפות נשלחה וממתינה לאישור מנהל", "success");
  window.location.hash = "#login";
}

function handleAdminUserAction(event) {
  const button = event.target.closest("[data-user-action]");
  if (!button) return;

  const users = getPortalUsers();
  const user = users.find(item => item.id === button.dataset.userId);
  if (!user || user.role === "super_admin") return;

  if (button.dataset.userAction === "approve") user.status = "approved";
  if (button.dataset.userAction === "reject") user.status = "rejected";
  if (button.dataset.userAction === "pending") user.status = "pending";
  if (button.dataset.userAction === "savePassword") {
    const input = button.closest(".admin-user-row")?.querySelector("[data-password-input]");
    const password = String(input?.value || "");
    if (password.length < 6) {
      showPortalMessage("הסיסמה חייבת לכלול לפחות 6 תווים", "warning");
      return;
    }
    user.password = password;
    showPortalMessage("הסיסמה עודכנה", "success");
  }
  setPortalUsers(users);
  renderAdminUsers();
}

function renderAdminUsers() {
  const users = getPortalUsers().filter(user => user.role !== "super_admin");
  const pending = users.filter(user => user.status === "pending");
  const approved = users.filter(user => user.status === "approved");

  if (portalState.pendingCount) portalState.pendingCount.textContent = pending.length;
  if (portalState.approvedCount) portalState.approvedCount.textContent = approved.length;

  portalState.pendingUsersList.innerHTML = pending.length
    ? pending.map(user => userRowTemplate(user, "pending")).join("")
    : `<div class="empty-admin-state">אין כרגע בקשות שממתינות לאישור</div>`;

  portalState.approvedUsersList.innerHTML = approved.length
    ? approved.map(user => userRowTemplate(user, "approved")).join("")
    : `<div class="empty-admin-state">אין עדיין משתמשים מאושרים</div>`;
}

function userRowTemplate(user, mode) {
  const date = new Date(user.createdAt || Date.now()).toLocaleDateString("he-IL");
  const actions = mode === "pending"
    ? `<button data-user-action="approve" data-user-id="${escapeAttr(user.id)}">אישור</button>
       <button class="danger" data-user-action="reject" data-user-id="${escapeAttr(user.id)}">דחייה</button>`
    : `<button data-user-action="pending" data-user-id="${escapeAttr(user.id)}">החזר לממתין</button>`;

  return `<article class="admin-user-row">
    <div>
      <strong>${escapeHtml(user.fullName || "ללא שם")}</strong>
      <span>${escapeHtml(user.agency || "ללא סוכנות")} · ${escapeHtml(user.email || "")}</span>
      ${user.note ? `<p>${escapeHtml(user.note)}</p>` : ""}
    </div>
    <label class="admin-password-field">
      <span>סיסמה</span>
      <input data-password-input type="text" value="${escapeAttr(user.password || "")}" autocomplete="off">
    </label>
    <small>${date}</small>
    <div class="admin-row-actions">
      <button data-user-action="savePassword" data-user-id="${escapeAttr(user.id)}">שמירת סיסמה</button>
      ${actions}
    </div>
  </article>`;
}

function addDemoPendingUser() {
  const users = getPortalUsers();
  users.push({
    id: crypto.randomUUID ? crypto.randomUUID() : `demo-${Date.now()}`,
    fullName: "סוכן לדוגמה",
    email: `agent${Date.now()}@example.co.il`,
    phone: "050-0000000",
    agency: "סוכנות לדוגמה",
    note: "בקשת דוגמה לבדיקת תהליך האישור.",
    password: "123456",
    role: "agent",
    status: "pending",
    createdAt: new Date().toISOString()
  });
  setPortalUsers(users);
  renderAdminUsers();
}

function logoutPortalUser() {
  localStorage.removeItem(PORTAL_SESSION_KEY);
  window.location.hash = "#landing";
}

function ensureDemoAdmin() {
  const users = getPortalUsers();
  if (!users.some(user => user.email === DEMO_ADMIN.email)) {
    users.unshift(DEMO_ADMIN);
    setPortalUsers(users);
  }
}

function getPortalUsers() {
  try {
    const value = localStorage.getItem(PORTAL_USERS_KEY);
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

function setPortalUsers(users) {
  localStorage.setItem(PORTAL_USERS_KEY, JSON.stringify(users));
}

function getPortalSession() {
  try {
    const value = localStorage.getItem(PORTAL_SESSION_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function isApprovedSession(session) {
  return session && session.status === "approved";
}

function isAdminSession(session) {
  return isApprovedSession(session) && session.role === "super_admin";
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function setHidden(element, hidden) {
  if (element) element.hidden = hidden;
}

function showPortalMessage(message, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  window.setTimeout(() => toast.classList.remove("show", type), 3200);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
