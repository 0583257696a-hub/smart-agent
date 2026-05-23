const PORTAL_SESSION_KEY = "agent_ops_portal_session";
const PORTAL_USERS_KEY = "agent_ops_portal_users";

const ADMIN_MODULE_PERMISSIONS = [
  ["operational_emails", "מיילים"],
  ["email_templates", "תבניות"],
  ["passwords", "סיסמאות"],
  ["supervisors", "מפקחים"],
  ["employers", "מעסיקים"],
  ["clients", "לקוחות"],
  ["management_fees", "דמי ניהול"],
  ["insurance_discounts", "הנחות ביטוח"],
  ["deposit_accounts", "חשבונות"],
  ["service_centers", "מוקדים"],
  ["institution_codes", "קודי מוסד"],
  ["links", "קישורים"],
  ["agent_numbers", "מספרי סוכן"],
  ["bank_numbers", "בנקים"]
];

const DEMO_ADMIN = {
  id: "admin",
  fullName: "מנהל מערכת",
  email: "admin@abd-finance.co.il",
  password: "123456",
  agency: "ABD finance",
  role: "super_admin",
  status: "approved",
  permissions: ["*"],
  createdAt: new Date().toISOString()
};

const portalState = {
  supabase: null,
  useSupabase: false,
  adminUsers: [],
  adminSearch: "",
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
  adminUsersList: null,
  adminUserSearch: null,
  pendingCount: null,
  approvedCount: null,
  rejectedCount: null,
  totalUsersCount: null
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPortal);
} else {
  initPortal();
}

async function initPortal() {
  cachePortalElements();
  if (!portalState.useSupabase) ensureDemoAdmin();
  bindPortalEvents();
  renderPortalRoute();
  window.addEventListener("hashchange", renderPortalRoute);
  bootstrapSupabase().then(renderPortalRoute).catch(error => {
    console.warn("Supabase session restore failed", error);
  });
}

function cachePortalElements() {
  [
    "publicPortal", "landingView", "loginView", "registerView", "adminPortal", "appShell",
    "loginForm", "registerForm", "logoutBtn", "seedPendingBtn", "adminUsersList",
    "adminUserSearch", "pendingCount", "approvedCount", "rejectedCount", "totalUsersCount"
  ].forEach(id => portalState[id] = document.getElementById(id));
}

function initSupabaseClient() {
  const config = window.AGENT_OPS_SUPABASE || {};
  if (!window.supabase || !config.url || !config.publishableKey) return;
  portalState.supabase = window.supabase.createClient(config.url, config.publishableKey);
  portalState.useSupabase = true;
}

async function bootstrapSupabase() {
  await loadSupabaseSdk();
  initSupabaseClient();
  await restoreSupabaseSession();
}

function loadSupabaseSdk() {
  if (window.supabase) return Promise.resolve();
  return new Promise(resolve => {
    const existing = document.querySelector("script[data-supabase-sdk]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => resolve(), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.async = true;
    script.dataset.supabaseSdk = "true";
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
    window.setTimeout(resolve, 4000);
  });
}

function bindPortalEvents() {
  portalState.loginForm?.addEventListener("submit", handleLogin);
  portalState.registerForm?.addEventListener("submit", handleRegister);
  portalState.logoutBtn?.addEventListener("click", logoutPortalUser);
  portalState.seedPendingBtn?.addEventListener("click", addDemoPendingUser);
  portalState.adminUsersList?.addEventListener("click", handleAdminUserAction);
  portalState.adminUserSearch?.addEventListener("input", event => {
    portalState.adminSearch = event.target.value || "";
    renderAdminLists(portalState.adminUsers);
  });
  document.addEventListener("click", event => {
    const routeLink = event.target.closest('a[href^="#"]');
    if (!routeLink) return;
    window.setTimeout(renderPortalRoute, 0);
  });
}

async function renderPortalRoute() {
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
  setHidden(portalState.landingView, !["landing", "features", "security", "workflow", ""].includes(route));
  setHidden(portalState.loginView, route !== "login");
  setHidden(portalState.registerView, route !== "register");

  document.body.classList.toggle("portal-mode", !isAppRoute);
  document.body.classList.toggle("ops-mode", isAppRoute);

  if (isAdminRoute) await renderAdminUsers();
}

async function handleLogin(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const email = normalizeEmail(form.get("email"));
  const password = String(form.get("password") || "");

  if (portalState.useSupabase) {
    await loginWithSupabase(email, password);
    return;
  }

  const user = getPortalUsers().find(item => normalizeEmail(item.email) === email);
  if (!user || user.password !== password) {
    showPortalMessage("פרטי ההתחברות אינם נכונים", "error");
    return;
  }
  if (user.status !== "approved") {
    showPortalMessage("המשתמש עדיין ממתין לאישור מנהל", "warning");
    return;
  }
  setPortalSession(user);
  window.location.hash = user.role === "super_admin" ? "#admin" : "#app";
}

async function loginWithSupabase(email, password) {
  const { data, error } = await portalState.supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    showPortalMessage("פרטי ההתחברות אינם נכונים", "error");
    return;
  }

  const profile = await fetchCurrentProfile(data.user.id);
  if (!profile) {
    await portalState.supabase.auth.signOut();
    showPortalMessage("לא נמצא פרופיל משתמש. צריך להריץ את SQL ההתקנה ב-Supabase", "error");
    return;
  }
  if (profile.status !== "approved") {
    await portalState.supabase.auth.signOut();
    showPortalMessage("המשתמש עדיין ממתין לאישור מנהל", "warning");
    return;
  }

  setPortalSession(profile);
  window.location.hash = profile.role === "super_admin" ? "#admin" : "#app";
}

async function handleRegister(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const email = normalizeEmail(form.get("email"));
  const password = String(form.get("password") || "");
  const passwordConfirm = String(form.get("passwordConfirm") || "");

  if (!validateRegistrationPassword(password, passwordConfirm)) return;

  if (portalState.useSupabase) {
    await registerWithSupabase(event.currentTarget, form, email, password);
    return;
  }

  const users = getPortalUsers();
  if (users.some(user => normalizeEmail(user.email) === email)) {
    showPortalMessage("כבר קיימת בקשה או הרשמה עם האימייל הזה", "warning");
    return;
  }

  users.push(buildLocalPendingUser(form, email, password));
  setPortalUsers(users);
  event.currentTarget.reset();
  showPortalMessage("בקשת ההצטרפות נשלחה וממתינה לאישור מנהל", "success");
  window.location.hash = "#login";
}

async function registerWithSupabase(formElement, form, email, password) {
  const fullName = String(form.get("fullName") || "").trim();
  const phone = String(form.get("phone") || "").trim();
  const agency = String(form.get("agency") || "").trim();
  const note = String(form.get("note") || "").trim();

  const { error } = await portalState.supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, phone, agency, note } }
  });

  if (error) {
    showPortalMessage(error.message || "לא ניתן להשלים הרשמה", "error");
    return;
  }

  formElement?.reset?.();
  showPortalMessage("בקשת ההצטרפות נשלחה וממתינה לאישור מנהל", "success");
  window.location.hash = "#login";
}

function validateRegistrationPassword(password, passwordConfirm) {
  if (password.length < 6) {
    showPortalMessage("הסיסמה חייבת לכלול לפחות 6 תווים", "warning");
    return false;
  }
  if (password !== passwordConfirm) {
    showPortalMessage("אימות הסיסמה אינו תואם", "warning");
    return false;
  }
  return true;
}

function buildLocalPendingUser(form, email, password) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `user-${Date.now()}`,
    fullName: String(form.get("fullName") || "").trim(),
    email,
    phone: String(form.get("phone") || "").trim(),
    agency: String(form.get("agency") || "").trim(),
    note: String(form.get("note") || "").trim(),
    password,
    role: "agent",
    status: "pending",
    permissions: defaultPermissionsForRole("agent"),
    createdAt: new Date().toISOString()
  };
}

async function handleAdminUserAction(event) {
  const button = event.target.closest("[data-user-action]");
  if (!button) return;

  if (button.dataset.userAction === "saveUser") {
    await saveAdminUser(button.closest(".admin-user-row"));
    return;
  }

  await quickUpdateUser(button);
}

async function quickUpdateUser(button) {
  const userId = button.dataset.userId;
  if (!userId) return;
  const row = button.closest(".admin-user-row");
  const status = button.dataset.userAction === "approve"
    ? "approved"
    : button.dataset.userAction === "reject"
      ? "rejected"
      : button.dataset.userAction === "pending"
        ? "pending"
        : null;
  if (!status) return;
  row.querySelector("[data-user-status]").value = status;
  await saveAdminUser(row);
}

async function saveAdminUser(row) {
  if (!row) return;
  const userId = row.dataset.userId;
  const role = row.querySelector("[data-user-role]")?.value || "agent";
  const status = row.querySelector("[data-user-status]")?.value || "pending";
  const permissions = role === "super_admin"
    ? ["*"]
    : [...row.querySelectorAll("[data-permission]:checked")].map(input => input.value);

  if (portalState.useSupabase) {
    const { error } = await portalState.supabase
      .from("profiles")
      .update({ role, status, permissions, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) {
      showPortalMessage("אין הרשאה לעדכן משתמש. בדוק שהוגדרת כ-super_admin ב-Supabase", "error");
      return;
    }
  } else {
    const users = getPortalUsers();
    const user = users.find(item => item.id === userId);
    if (!user || user.role === "super_admin") return;
    user.role = role;
    user.status = status;
    user.permissions = permissions;
    const passwordInput = row.querySelector("[data-password-input]");
    if (passwordInput) {
      const password = String(passwordInput.value || "");
      if (password.length < 6) {
        showPortalMessage("הסיסמה חייבת לכלול לפחות 6 תווים", "warning");
        return;
      }
      user.password = password;
    }
    setPortalUsers(users);
  }

  showPortalMessage("הרשאות המשתמש נשמרו", "success");
  await renderAdminUsers();
}

async function renderAdminUsers() {
  if (portalState.useSupabase) {
    await renderSupabaseAdminUsers();
    return;
  }

  portalState.adminUsers = getPortalUsers().filter(user => user.role !== "super_admin");
  renderAdminLists(portalState.adminUsers);
}

async function renderSupabaseAdminUsers() {
  portalState.adminUsersList.innerHTML = `<div class="empty-admin-state">טוען משתמשים...</div>`;
  const { data, error } = await portalState.supabase
    .from("profiles")
    .select("id, full_name, email, phone, agency, note, role, status, permissions, created_at")
    .neq("role", "super_admin")
    .order("created_at", { ascending: false });

  if (error) {
    portalState.adminUsersList.innerHTML = `<div class="empty-admin-state">לא ניתן לטעון משתמשים. צריך להריץ SQL הרשאות ב-Supabase.</div>`;
    return;
  }

  portalState.adminUsers = (data || []).map(profileToUser);
  renderAdminLists(portalState.adminUsers);
}

function renderAdminLists(users) {
  const filtered = filterAdminUsers(users);
  const counts = {
    pending: users.filter(user => user.status === "pending").length,
    approved: users.filter(user => user.status === "approved").length,
    rejected: users.filter(user => user.status === "rejected").length,
    total: users.length
  };

  if (portalState.pendingCount) portalState.pendingCount.textContent = counts.pending;
  if (portalState.approvedCount) portalState.approvedCount.textContent = counts.approved;
  if (portalState.rejectedCount) portalState.rejectedCount.textContent = counts.rejected;
  if (portalState.totalUsersCount) portalState.totalUsersCount.textContent = counts.total;

  portalState.adminUsersList.innerHTML = filtered.length
    ? filtered.map(userRowTemplate).join("")
    : `<div class="empty-admin-state">לא נמצאו משתמשים תואמים</div>`;
}

function filterAdminUsers(users) {
  const term = normalizeText(portalState.adminSearch);
  if (!term) return users;
  return users.filter(user => normalizeText([user.fullName, user.email, user.agency, user.role, user.status].join(" ")).includes(term));
}

function userRowTemplate(user) {
  const date = new Date(user.createdAt || Date.now()).toLocaleDateString("he-IL");
  const role = user.role || "agent";
  const status = user.status || "pending";
  const permissions = normalizePermissions(user.permissions, role);
  const actions = status === "pending"
    ? `<button data-user-action="approve" data-user-id="${escapeAttr(user.id)}">אישור</button>
       <button class="danger" data-user-action="reject" data-user-id="${escapeAttr(user.id)}">דחייה</button>`
    : `<button data-user-action="pending" data-user-id="${escapeAttr(user.id)}">החזר לממתין</button>`;
  const passwordCell = portalState.useSupabase
    ? `<div class="admin-password-field readonly"><span>סיסמה</span><em>שמורה מוצפנת ב-Supabase</em></div>`
    : `<label class="admin-password-field">
        <span>סיסמה</span>
        <input data-password-input type="text" value="${escapeAttr(user.password || "")}" autocomplete="off">
      </label>`;

  return `<article class="admin-user-row permission-row" data-user-id="${escapeAttr(user.id)}">
    <div class="admin-user-main">
      <strong>${escapeHtml(user.fullName || "ללא שם")}</strong>
      <span>${escapeHtml(user.agency || "ללא סוכנות")} · ${escapeHtml(user.email || "")}</span>
      ${user.note ? `<p>${escapeHtml(user.note)}</p>` : ""}
      <small>נוצר: ${date}</small>
    </div>
    <div class="admin-controls">
      <label>תפקיד
        <select data-user-role>
          ${roleOption("agent", "משתמש", role)}
          ${roleOption("agency_admin", "מנהל סוכנות", role)}
          ${roleOption("super_admin", "מנהל מערכת", role)}
        </select>
      </label>
      <label>סטטוס
        <select data-user-status>
          ${statusOption("pending", "ממתין", status)}
          ${statusOption("approved", "מאושר", status)}
          ${statusOption("rejected", "חסום", status)}
        </select>
      </label>
      ${passwordCell}
    </div>
    <div class="permission-matrix">
      ${ADMIN_MODULE_PERMISSIONS.map(([key, label]) => permissionCheckbox(key, label, permissions, role)).join("")}
    </div>
    <div class="admin-row-actions">
      <button class="primary-action" data-user-action="saveUser" data-user-id="${escapeAttr(user.id)}">שמירת הרשאות</button>
      ${actions}
    </div>
  </article>`;
}

function roleOption(value, label, selected) {
  return `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`;
}

function statusOption(value, label, selected) {
  return `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`;
}

function permissionCheckbox(key, label, permissions, role) {
  const checked = role === "super_admin" || permissions.includes(key);
  const disabled = role === "super_admin" ? "disabled" : "";
  return `<label class="permission-chip">
    <input data-permission type="checkbox" value="${escapeAttr(key)}" ${checked ? "checked" : ""} ${disabled}>
    <span>${escapeHtml(label)}</span>
  </label>`;
}

function defaultPermissionsForRole(role = "agent") {
  if (role === "super_admin") return ["*"];
  if (role === "agency_admin") return ADMIN_MODULE_PERMISSIONS.map(([key]) => key);
  return ["operational_emails", "email_templates", "clients", "management_fees", "insurance_discounts", "service_centers", "institution_codes", "bank_numbers"];
}

function normalizePermissions(value, role = "agent") {
  if (Array.isArray(value) && value.length) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return value.split(",").map(item => item.trim()).filter(Boolean);
    }
  }
  return defaultPermissionsForRole(role);
}

function addDemoPendingUser() {
  if (portalState.useSupabase) {
    showPortalMessage("במצב Supabase מוסיפים משתמש דרך מסך הרשמה", "warning");
    return;
  }

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
    permissions: defaultPermissionsForRole("agent"),
    createdAt: new Date().toISOString()
  });
  setPortalUsers(users);
  renderAdminUsers();
}

async function logoutPortalUser() {
  localStorage.removeItem(PORTAL_SESSION_KEY);
  if (portalState.useSupabase) await portalState.supabase.auth.signOut();
  window.location.hash = "#landing";
}

async function restoreSupabaseSession() {
  if (!portalState.useSupabase) return;
  const { data, error } = await portalState.supabase.auth.getSession();
  if (error) return;
  const user = data?.session?.user;
  if (!user) return;
  const profile = await fetchCurrentProfile(user.id);
  if (profile?.status === "approved") setPortalSession(profile);
}

async function fetchCurrentProfile(userId) {
  const { data, error } = await portalState.supabase
    .from("profiles")
    .select("id, full_name, email, phone, agency, note, role, status, permissions, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return profileToUser(data);
}

function profileToUser(profile = {}) {
  return {
    id: profile.id,
    fullName: profile.full_name || "",
    email: profile.email || "",
    phone: profile.phone || "",
    agency: profile.agency || "",
    note: profile.note || "",
    role: profile.role || "agent",
    status: profile.status || "pending",
    permissions: normalizePermissions(profile.permissions, profile.role || "agent"),
    createdAt: profile.created_at || new Date().toISOString()
  };
}

function setPortalSession(user) {
  localStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify({
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    fullName: user.fullName,
    agency: user.agency,
    permissions: normalizePermissions(user.permissions, user.role)
  }));
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

function normalizeText(value = "") {
  return String(value || "").toLowerCase().trim();
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
