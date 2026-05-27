const UI_STATE_KEY = "agent_ops_ui_state";
const EMAIL_SIGNATURE_KEY = "agent_ops_email_signature";
const FILING_EMAIL_KEY = "agent_ops_filing_email";
const PORTAL_SESSION_KEY_FOR_APP = "agent_ops_portal_session";
const savedUiState = parseStoredJson(UI_STATE_KEY, {});

let DB = {};
let currentModule = MODULES[savedUiState.currentModule] && !MODULES[savedUiState.currentModule].hidden && canAccessModule(savedUiState.currentModule)
  ? savedUiState.currentModule
  : "operational_emails";
let viewModes = parseStoredJson("agent_ops_view_modes", {});
let searchScope = savedUiState.searchScope === "global" ? "global" : "local";
let query = savedUiState.query || "";
let sortState = { field: null, direction: "asc" };
let filters = {};
let feeCompany = "";
let feeProduct = "";
let editing = null;
let activeTemplate = null;
let sendTemplate = null;
let sendEmailQuery = "";
let sendClientQuery = "";
let selectedSendClientIndex = null;
let selectedSendEmailIndexes = new Set();
let recentSearches = parseStoredJson("agent_ops_recent_searches", []);
let snifimQuery = "";
let currentBankNumber = null;
let activeClient = null;
let didRestoreScroll = false;
let scrollSaveTimer = null;

const els = {};

document.addEventListener("DOMContentLoaded", init);

let debounceTimer = null;
function debounce(func, delay = 250) {
  return function(...args) {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => func.apply(this, args), delay);
  };
}

function parseStoredJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

async function init() {
  try {
    cacheElements();
    hydrateIcons();
    bindEvents();
    await loadAllData();
    if (els.mainSearch) els.mainSearch.value = query;
    ensureFeeSelection();
    render();
    restoreScrollPosition();
  } catch (error) {
    console.error(error);
    document.body.innerHTML = `<div class="boot-error" dir="rtl">
      <h1>המערכת לא נטענה</h1>
      <p>${escapeHtml(error.message || "שגיאה לא ידועה")}</p>
      <button type="button" onclick="location.reload()">רענון</button>
    </div>`;
  }
}

function cacheElements() {
  [
    "sideNav", "mainSearch", "clearSearchBtn", "localSearchBtn", "globalSearchBtn",
    "importInput", "addRecordBtn", "tableViewBtn", "cardViewBtn", "settingsBtn", "settingsDropdown", "backupExcelBtn",
    "moduleTitle", "moduleMeta", "filtersBar", "results",
    "recordDialog", "recordForm", "formFields", "modalTitle", "modalSubtitle",
    "templateDialog", "templateTitle", "templateSubject", "templateBody", "closeTemplateBtn",
    "copyTemplateBtn", "sendTemplateDialog", "sendTemplateSubtitle", "closeSendTemplateBtn",
    "sendEmailSearch", "clearSendEmailSearchBtn", "sendEmailResults", "selectedSendEmail",
    "sendTemplateMailBtn", "sendClientSearch", "clearSendClientSearchBtn", "sendClientResults", "selectedSendClient",
    "toast", "clientDialog", "clientTitle", "clientSubtitle", "clientDetails", "closeClientBtn", "mailClientBtn",
    "snifimDialog", "snifimTitle", "snifimSubtitle", 
    "closeSnifimBtn", "snifimSearch", "clearSnifimSearchBtn", "snifimResults",
    "emailSignatureBtn", "settingsSignatureBtn", "signatureDialog", "signatureForm", "emailSignatureInput",
    "filingEmailBtn", "filingEmailDialog", "filingEmailForm", "filingEmailInput"
  ].forEach(id => els[id] = document.getElementById(id));
}

function bindEvents() {
  on(els.sideNav, "click", event => {
    const button = event.target.closest("[data-module]");
    if (!button) return;
    switchModule(button.dataset.module);
  });
  on(els.mainSearch, "input", debounce(event => {
    query = event.target.value;
    saveUiState();
    render();
  }));
  on(els.mainSearch, "keydown", event => {
    if (event.key === "Enter" && query.trim()) rememberSearch(query.trim());
  });
  on(els.clearSearchBtn, "click", () => {
    query = "";
    els.mainSearch.value = "";
    saveUiState();
    render();
  });
  on(els.localSearchBtn, "click", () => setSearchScope("local"));
  on(els.globalSearchBtn, "click", () => setSearchScope("global"));
  on(els.tableViewBtn, "click", () => setViewMode("table"));
  on(els.cardViewBtn, "click", () => setViewMode("cards"));
  on(els.importInput, "change", importData);
  on(els.addRecordBtn, "click", () => openRecordModal(currentModule));
  on(els.settingsBtn, "click", event => {
    event.stopPropagation();
    els.settingsDropdown.hidden = !els.settingsDropdown.hidden;
  });
  on(els.emailSignatureBtn, "click", openSignatureModal);
  on(els.settingsSignatureBtn, "click", () => {
    els.settingsDropdown.hidden = true;
    openSignatureModal();
  });
  on(els.backupExcelBtn, "click", () => {
    els.settingsDropdown.hidden = true;
    exportAllData();
  });
  on(els.filingEmailBtn, "click", () => {
    els.settingsDropdown.hidden = true;
    openFilingEmailModal();
  });
  on(els.filingEmailForm, "submit", saveFilingEmail);
  on(els.signatureForm, "submit", saveEmailSignature);
  on(els.recordForm, "submit", saveRecord);
  on(els.recordForm, "keydown", handleRecordFormKeydown);
  on(els.closeTemplateBtn, "click", () => els.templateDialog.close());
  on(els.copyTemplateBtn, "click", () => {
    if (activeTemplate) copyToClipboard(templateCopyText(activeTemplate), "התבנית הועתקה");
  });
  on(els.closeSendTemplateBtn, "click", () => els.sendTemplateDialog.close());
  on(els.sendEmailSearch, "input", debounce(event => {
    sendEmailQuery = event.target.value;
    renderSendEmailResults();
  }));
  on(els.clearSendEmailSearchBtn, "click", () => {
    sendEmailQuery = "";
    els.sendEmailSearch.value = "";
    renderSendEmailResults();
  });
  on(els.sendClientSearch, "input", debounce(event => {
    sendClientQuery = event.target.value;
    renderSendClientResults();
  }));
  on(els.clearSendClientSearchBtn, "click", () => {
    sendClientQuery = "";
    els.sendClientSearch.value = "";
    renderSendClientResults();
  });
  on(els.sendTemplateMailBtn, "click", sendSelectedTemplateEmail);
  on(els.closeClientBtn, "click", () => els.clientDialog.close());
  on(els.mailClientBtn, "click", () => {
    if (activeClient?.email) window.location.href = `mailto:${encodeURIComponent(activeClient.email)}`;
  });
  on(els.closeSnifimBtn, "click", () => els.snifimDialog.close());
  on(els.snifimSearch, "input", debounce(event => {
    snifimQuery = event.target.value;
    renderSnifimResults();
  }));
  on(els.clearSnifimSearchBtn, "click", () => {
    snifimQuery = "";
    els.snifimSearch.value = "";
    renderSnifimResults();
  });
  document.addEventListener("click", handleDocumentClick);
  window.addEventListener("scroll", scheduleScrollSave, { passive: true });
  window.addEventListener("beforeunload", saveUiState);
}

function on(element, eventName, handler, options) {
  if (element) element.addEventListener(eventName, handler, options);
}

async function loadAllData() {
  const dataVersions = parseStoredJson(DATA_VERSION_KEY, {});
  await Promise.all(Object.entries(MODULES).map(async ([key, config]) => {
    const sourceRows = shouldLoadSourceRows(key) ? await fetchSourceRows(config.file) : [];
    const storageKey = dataStorageKey(key);
    const stored = localStorage.getItem(storageKey);
    if (DATA_VERSIONS[key] && dataVersions[key] !== DATA_VERSIONS[key]) {
      DB[key] = normalizeModuleRows(key, sourceRows);
      saveDataToLocalStorage(key);
      dataVersions[key] = DATA_VERSIONS[key];
      localStorage.setItem(DATA_VERSION_KEY, JSON.stringify(dataVersions));
      return;
    }
    if (!stored) {
      DB[key] = normalizeModuleRows(key, sourceRows);
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        DB[key] = normalizeModuleRows(key, sourceRows);
        saveDataToLocalStorage(key);
        return;
      }
      DB[key] = normalizeModuleRows(key, parsed);
    } catch {
      DB[key] = normalizeModuleRows(key, sourceRows);
      saveDataToLocalStorage(key);
    }
  }));
}

async function fetchSourceRows(file) {
  try {
    const response = await fetch(file, { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to load ${file}`);
    const rows = await response.json();
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.error("Fetch Error:", error);
    return [];
  }
}

function normalizeModuleRows(moduleKey, rows = []) {
  if (moduleKey === "clients") return rows.map(normalizeClientRow);
  if (moduleKey !== "insurance_discounts") return rows;
  return normalizeInsuranceDiscountRows(rows);
}

function normalizeClientRow(row = {}) {
  const normalized = { ...row };
  if (!normalized.first_name && normalized.name) normalized.first_name = normalized.name;
  if (!normalized.last_name && normalized.family) normalized.last_name = normalized.family;
  ["first_name", "last_name", "national_id", "address", "phone", "email", "birth_date", "issue_date"].forEach(field => {
    normalized[field] = String(normalized[field] || "").trim();
  });
  return normalized;
}

function normalizeInsuranceDiscountRows(rows = []) {
  const grouped = new Map();
  rows.forEach(row => {
    if (!row || typeof row !== "object") return;
    const normalized = { ...row, discounts: { ...(row.discounts || {}) } };
    if (row.year1 || row.year2 || row.year3 || row.year4 || row.year5to6) {
      normalized.discounts = {
        year1: row.year1 || normalized.discounts.year1 || "",
        year2: row.year2 || normalized.discounts.year2 || "",
        year3: row.year3 || normalized.discounts.year3 || "",
        year4: row.year4 || normalized.discounts.year4 || "",
        year5to6: row.year5to6 || normalized.discounts.year5to6 || ""
      };
    }
    if (row.period && row.discount) normalized.discounts[discountPeriodKey(row.period)] = row.discount;
    delete normalized.period;
    delete normalized.discount;
    delete normalized.year1;
    delete normalized.year2;
    delete normalized.year3;
    delete normalized.year4;
    delete normalized.year5to6;

    const key = [normalized.company, normalized.product, normalized.track, normalized.agreement_number, normalized.validity]
      .map(value => normalizeDedupeValue(value || ""))
      .join("|");
    if (!grouped.has(key)) {
      grouped.set(key, normalized);
      return;
    }
    const existing = grouped.get(key);
    existing.discounts = { ...(existing.discounts || {}), ...(normalized.discounts || {}) };
    ["notes", "conditions", "source"].forEach(field => {
      if (!existing[field] && normalized[field]) existing[field] = normalized[field];
    });
  });
  return [...grouped.values()];
}

function discountPeriodKey(period = "") {
  const text = normalizeText(period);
  if (/5|6|ה|ו|חמש|שש/.test(text) && /-|עד|ו/.test(text)) return "year5to6";
  if (/1|א|ראש/.test(text)) return "year1";
  if (/2|ב|שני/.test(text)) return "year2";
  if (/3|ג|שליש/.test(text)) return "year3";
  if (/4|ד|רביע/.test(text)) return "year4";
  if (/5|ה|6|ו/.test(text)) return "year5to6";
  return "year1";
}

function saveDataToLocalStorage(key = currentModule) {
  try {
    localStorage.setItem(dataStorageKey(key), JSON.stringify(DB[key] || []));
  } catch (error) {
    console.error("Storage Error:", error);
    if (error.name === "QuotaExceededError" && typeof toast === "function") {
      toast("שגיאה: אין מספיק מקום באחסון הדפדפן.");
    }
  }
}

async function resetToSourceData() {
  if (!confirm("לטעון מחדש את כל נתוני המקור מקבצי ה־JSON? שינויים מקומיים שלא יוצאו יוחלפו.")) return;
  await Promise.all(Object.entries(MODULES).map(async ([key, config]) => {
    DB[key] = normalizeModuleRows(key, shouldLoadSourceRows(key) ? await fetchSourceRows(config.file) : []);
    saveDataToLocalStorage(key);
  }));
  query = "";
  filters = {};
  els.mainSearch.value = "";
  ensureFeeSelection(true);
  toast("נתוני המקור נטענו");
  render();
}

function normalizeText(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0591-\u05C7]/g, "")
    .replace(/[ך]/g, "כ")
    .replace(/[ם]/g, "מ")
    .replace(/[ן]/g, "נ")
    .replace(/[ף]/g, "פ")
    .replace(/[ץ]/g, "צ")
    .replace(/[״׳'"`´’‘“”.,:;()[\]{}_\-\\/|!?@#$%^&*=+~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function aliasTokens(value = "") {
  const normalized = normalizeText(value);
  const groups = [
    ["הפניקס", "פניקס", "phoenix", "fnx"],
    ["כלל", "clal"],
    ["מגדל", "migdal"],
    ["הראל", "harel"],
    ["מיטב", "meitav"],
    ["מור", "more"],
    ["אלטשולר", "altshul", "altshuler"],
    ["הכשרה", "hcsra", "best invest"],
    ["אנליסט", "analyst"],
    ["מנורה", "menora"]
  ];
  const aliases = new Set([normalized]);
  groups.forEach(group => {
    const normalizedGroup = group.map(normalizeText);
    if (normalizedGroup.some(alias => normalized.includes(alias))) normalizedGroup.forEach(alias => aliases.add(alias));
  });
  return [...aliases].join(" ");
}

function searchableText(row) {
  return aliasTokens(flattenSearchValues(row).join(" "));
}

function dataStorageKey(moduleKey) {
  return STORAGE_PREFIX + moduleKey;
}

function shouldLoadSourceRows(moduleKey) {
  return true;
}

function isPrivateModule(moduleKey) {
  return MODULES[moduleKey]?.scope === "private";
}

function currentTenantKey() {
  const session = getPortalSessionForApp();
  const identity = session?.agency || session?.id || session?.email || "local";
  return normalizeStorageSegment(identity);
}

function normalizeStorageSegment(value = "") {
  return String(value || "local").toLowerCase().replace(/[^a-z0-9א-ת_-]+/g, "_").slice(0, 80) || "local";
}

function getPortalSessionForApp() {
  return parseStoredJson(PORTAL_SESSION_KEY_FOR_APP, {});
}

function isSuperAdminSession() {
  return getPortalSessionForApp()?.role === "super_admin";
}

function canAccessModule(moduleKey) {
  const session = getPortalSessionForApp();
  if (!session || !session.role) return true;
  if (session.role === "super_admin") return true;
  const permissions = Array.isArray(session.permissions) ? session.permissions : [];
  return permissions.includes("*") || permissions.includes(moduleKey);
}

function getFieldValue(row = {}, field = "") {
  if (field === "client_name") return clientFullName(row);
  if (!field.includes(".")) return row[field];
  return field.split(".").reduce((value, part) => value && value[part] !== undefined ? value[part] : "", row);
}

function setFieldValue(row = {}, field = "", value = "") {
  if (!field.includes(".")) {
    row[field] = value;
    return row;
  }
  const parts = field.split(".");
  let target = row;
  parts.slice(0, -1).forEach(part => {
    if (!target[part] || typeof target[part] !== "object") target[part] = {};
    target = target[part];
  });
  target[parts[parts.length - 1]] = value;
  return row;
}

function flattenSearchValues(value) {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.flatMap(flattenSearchValues);
  if (typeof value === "object") return Object.values(value).flatMap(flattenSearchValues);
  return [String(value)];
}

function isFuzzyMatch(haystack, needle) {
  if (!needle) return true;
  if (haystack.includes(needle)) return true;
  let index = 0;
  for (const char of haystack) {
    if (char === needle[index]) index += 1;
    if (index === needle.length) return true;
  }
  return false;
}

function matchesSearch(row, value) {
  const normalizedQuery = aliasTokens(value);
  if (!normalizedQuery) return true;
  const haystack = searchableText(row);
  return normalizedQuery.split(" ").every(token => isFuzzyMatch(haystack, token));
}

function scoreSearch(row, value) {
  const normalizedQuery = aliasTokens(value);
  if (!normalizedQuery) return 0;
  const tokens = normalizedQuery.split(" ").filter(Boolean);
  const priority = aliasTokens([row.company, row.name, row.entity, row.employer, row.action, row.title, row.product].join(" "));
  const contact = aliasTokens([row.email, row.url, row.username, row.phone, row.contact].join(" "));
  const category = aliasTokens([row.category, row.type, row.department, row.system, row.role].join(" "));
  const all = searchableText(row);
  return tokens.reduce((sum, token) => {
    if (priority.includes(token)) return sum + 120;
    if (contact.includes(token)) return sum + 90;
    if (category.includes(token)) return sum + 70;
    if (all.includes(token)) return sum + 25;
    return isFuzzyMatch(all, token) ? sum + 10 : sum;
  }, row.__favorite ? 15 : 0);
}

function searchAll(value) {
  const output = {};
  SEARCH_ORDER.forEach(key => {
    if (!canAccessModule(key)) return;
    const rows = searchRows(key, value, {}, true);
    if (rows.length) output[key] = rows;
  });
  return output;
}

function searchRows(moduleKey, value = query, moduleFilters = filters, ignoreFilters = false) {
  const rows = (DB[moduleKey] || [])
    .map((row, index) => ({ row, index }))
    .filter(item => matchesSearch(item.row, value))
    .filter(item => ignoreFilters || matchesFilters(item.row, moduleFilters))
    .map(item => ({ ...item, score: scoreSearch(item.row, value) }));

  if (sortState.field) {
    rows.sort((a, b) => compareValues(getFieldValue(a.row, sortState.field), getFieldValue(b.row, sortState.field)) * (sortState.direction === "asc" ? 1 : -1));
  } else if (value) {
    rows.sort((a, b) => b.score - a.score);
  }
  return rows;
}

function matchesFilters(row, activeFilters) {
  return Object.entries(activeFilters).every(([field, value]) => !value || normalizeText(getFieldValue(row, field)).includes(normalizeText(value)));
}

function compareValues(a = "", b = "") {
  return String(a).localeCompare(String(b), "he", { numeric: true, sensitivity: "base" });
}

function render() {
  const config = MODULES[currentModule];
  const localRows = getCurrentRows();
  const total = searchScope === "global" && query.trim()
    ? Object.values(searchAll(query)).reduce((sum, rows) => sum + rows.length, 0)
    : localRows.length;

  els.moduleTitle.textContent = searchScope === "global" && query.trim() ? "תוצאות חיפוש גלובלי" : config.title;
  els.moduleMeta.textContent = searchScope === "global" && query.trim()
    ? `${total} תוצאות מכל מקורות הנתונים`
    : `${localRows.length} מתוך ${(DB[currentModule] || []).length} רשומות · ${moduleScopeLabel(currentModule)}`;

  renderNavigation();
  renderFilters();
  renderResults(localRows);
}

function getCurrentRows() {
  if (currentModule === "management_fees") return getFeeRows();
  return searchRows(currentModule);
}

function renderNavigation() {
  const navHtml = Object.entries(MODULES)
    .filter(([key, config]) => !config.hidden && canAccessModule(key))
    .map(([key, config]) => navButton(key, config))
    .join("");
  els.sideNav.innerHTML = navHtml;
  els.localSearchBtn.classList.toggle("active", searchScope === "local");
  els.globalSearchBtn.classList.toggle("active", searchScope === "global");
  els.tableViewBtn.classList.toggle("active", getViewMode() === "table");
  els.cardViewBtn.classList.toggle("active", getViewMode() === "cards");
  els.mainSearch.placeholder = searchScope === "global" ? "חיפוש בכל המערכת..." : `חיפוש בתוך ${MODULES[currentModule].label}...`;
}

function navButton(key, config) {
  return `
    <button class="nav-pill ${key === currentModule ? "active" : ""}" type="button" data-module="${key}">
      <span class="icon">${ICONS[config.icon] || ICONS.file}</span>
      <span>${escapeHtml(config.label)}</span>
      <small class="scope-chip ${isPrivateModule(key) ? "private" : "global"}">${isPrivateModule(key) ? "פרטי" : "גלובלי"}</small>
      <b>${(DB[key] || []).length}</b>
    </button>
  `;
}

function moduleScopeLabel(moduleKey) {
  return isPrivateModule(moduleKey) ? "מידע פרטי למשתמש/סוכנות" : "מידע גלובלי לכל המשתמשים";
}

function switchModule(moduleKey) {
  if (!MODULES[moduleKey] || MODULES[moduleKey].hidden || !canAccessModule(moduleKey)) return;
  currentModule = moduleKey;
  searchScope = "local";
  filters = {};
  sortState = { field: null, direction: "asc" };
  ensureFeeSelection(true);
  saveUiState({ scrollY: 0 });
  render();
  window.scrollTo({ top: 0, behavior: "auto" });
}

function renderFilters() {
  if (currentModule === "management_fees") {
    renderFeeFilters();
    return;
  }
  const config = MODULES[currentModule];
  els.filtersBar.innerHTML = `
    <div class="filter-group">
      ${(config.filters || []).map(([field, label]) => renderSelectFilter(field, label, uniqueValues(currentModule, field))).join("")}
    </div>
    <button class="toolbar-button compact" type="button" data-action="clearFilters">ניקוי פילטרים</button>
  `;
}

function renderSelectFilter(field, label, values) {
  return `
    <label class="filter-control">
      <span>${escapeHtml(label)}</span>
      <select data-filter="${field}">
        <option value="">הכל</option>
        ${values.map(value => `<option value="${escapeHtml(value)}" ${filters[field] === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}
      </select>
    </label>
  `;
}

function uniqueValues(moduleKey, field, rows = DB[moduleKey] || []) {
  const values = [...new Set(rows.map(row => getFieldValue(row, field)).filter(Boolean).map(String))];
  if (moduleKey === "management_fees" && field === "company") return sortByPreferredOrder(values, FEE_COMPANY_ORDER);
  if (moduleKey === "management_fees" && field === "product") return sortByPreferredOrder(values, PRODUCT_ORDER);
  return values.sort((a, b) => compareValues(a, b));
}

function sortByPreferredOrder(values, preferred) {
  return values.sort((a, b) => {
    const ai = preferred.findIndex(item => normalizeText(a).includes(normalizeText(item)) || normalizeText(item).includes(normalizeText(a)));
    const bi = preferred.findIndex(item => normalizeText(b).includes(normalizeText(item)) || normalizeText(item).includes(normalizeText(b)));
    const ar = ai === -1 ? 999 : ai;
    const br = bi === -1 ? 999 : bi;
    return ar === br ? compareValues(a, b) : ar - br;
  });
}

function renderFeeFilters() {
  const rows = DB.management_fees || [];
  const companies = uniqueValues("management_fees", "company", rows);
  const products = uniqueValues("management_fees", "product", rows.filter(row => !feeCompany || row.company === feeCompany));
  const feeRows = getFeeRows();
  const validity = [...new Set(feeRows.map(item => item.row.validity).filter(Boolean))].join(" | ") || "לא צוין";
  els.filtersBar.innerHTML = `
    <div class="fee-flow">
      <div class="pill-row">
        <span class="filter-label">יצרן</span>
        ${companies.map(company => pill("fee-company", company, feeCompany === company)).join("")}
      </div>
      <div class="pill-row">
        <span class="filter-label">מוצר</span>
        ${products.map(product => pill("fee-product", product, feeProduct === product)).join("")}
      </div>
      <div class="fee-summary">
        <strong>${escapeHtml(feeCompany || "בחר יצרן")} ${feeProduct ? "→ " + escapeHtml(feeProduct) : ""}</strong>
        <span>${feeRows.length} מדרגים נמצאו · תוקף: ${escapeHtml(validity)}</span>
      </div>
      <div class="fee-actions">
        <button class="toolbar-button compact" type="button" data-action="copyFeeRows">Copy rows</button>
        <button class="toolbar-button compact" type="button" data-action="exportSelected">Export selected</button>
        <button class="toolbar-button compact" type="button" data-action="printView"><span class="icon">${ICONS.print}</span> Print</button>
        <button class="toolbar-button compact" type="button" data-action="clearFilters">ניקוי</button>
      </div>
    </div>
  `;
}

function pill(type, value, active) {
  return `<button class="filter-pill ${active ? "active" : ""}" type="button" data-${type}="${escapeHtml(value)}">${escapeHtml(value)}</button>`;
}

function ensureFeeSelection(force = false) {
  if (currentModule !== "management_fees") return;
  const rows = DB.management_fees || [];
  const companies = uniqueValues("management_fees", "company", rows);
  if (force || !feeCompany || !companies.includes(feeCompany)) feeCompany = companies[0] || "";
  const products = uniqueValues("management_fees", "product", rows.filter(row => !feeCompany || row.company === feeCompany));
  if (force || !feeProduct || !products.includes(feeProduct)) feeProduct = products[0] || "";
}

function getFeeRows() {
  ensureFeeSelection();
  return searchRows("management_fees", query, {}, true)
    .filter(item => (!feeCompany || item.row.company === feeCompany) && (!feeProduct || item.row.product === feeProduct));
}

function renderResults(localRows) {
  if (searchScope === "global" && query.trim()) {
    els.results.innerHTML = renderGlobalResults(searchAll(query));
  } else if (getViewMode() === "cards" && currentModule !== "management_fees") {
    els.results.innerHTML = renderCardsGrid(currentModule, localRows);
  } else {
    els.results.innerHTML = renderTable(currentModule, localRows);
  }
  hydrateIcons(els.results);
}

function renderGlobalResults(groups) {
  const entries = Object.entries(groups);
  if (!entries.length) return emptyState("לא נמצאו תוצאות", "נסה שם חברה, פעולה, מוצר, מייל או מילת מפתח אחרת.");
  return entries.map(([key, rows]) => `
    <section class="result-group">
      <div class="group-title">
        <h3>${escapeHtml(MODULES[key].title)}</h3>
        <span>${rows.length}</span>
      </div>
      ${renderTable(key, rows.slice(0, 12), true)}
    </section>
  `).join("");
}

function renderTable(moduleKey, rows, compact = false) {
  const config = MODULES[moduleKey];
  if (!rows.length) return emptyState("אין רשומות להצגה", "נסה לשנות חיפוש או פילטרים.");
  const columns = getColumns(moduleKey);
  return `
    <div class="data-grid-wrap ${compact ? "compact-grid" : ""}">
      <table class="data-grid">
        <thead>
          <tr>
            ${columns.map(([field, label]) => `<th><button type="button" data-sort="${field}">${escapeHtml(label)} ${sortState.field === field ? (sortState.direction === "asc" ? "↑" : "↓") : ""}</button></th>`).join("")}
            <th class="actions-col">פעולות</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(item => renderTableRow(moduleKey, item.row, item.index, columns, config)).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function getColumns(moduleKey) {
  if (moduleKey === "clients") {
    return [["client_name", "שם לקוח"], ["national_id", "ת.ז", "id_mask"], ["email", "מייל", "ltr"]];
  }
  if (moduleKey === "management_fees" && feeProduct && /פנסיה/.test(feeProduct)) {
    return withoutSourceColumn([["range", "שכר"], ["deposit_fee", "מהפקדה"], ["balance_fee", "מצבירה"], ["validity", "תוקף"]]);
  }
  return withoutSourceColumn(MODULES[moduleKey].columns);
}

function withoutSourceColumn(columns = []) {
  return columns.filter(([field]) => field !== "source");
}

function renderTableRow(moduleKey, row, index, columns, config) {
  const rowClass = moduleKey === "management_fees" && isBestFee(row) ? "best-row" : "";
  return `
    <tr class="${rowClass} ${moduleKey === "clients" ? "clickable-row" : ""}" ${moduleKey === "clients" ? `data-open-client-index="${index}"` : ""}>
      ${columns.map(([field, , type]) => {
        const value = getFieldValue(row, field);
        const cellClasses = [
          type === "ltr" || looksLtr(value) ? "ltr" : "",
          looksNumericCell(value) ? "numeric-cell" : "",
          field.startsWith("discounts.") ? "matrix-cell" : "",
          field === "track" && moduleKey === "insurance_discounts" ? "track-cell" : ""
        ].filter(Boolean).join(" ");
        return `<td class="${cellClasses}">${formatCell(value, type)}</td>`;
      }).join("")}
      <td class="row-actions">${renderActions(moduleKey, row, index)}</td>
    </tr>
  `;
}

function looksNumericCell(value = "") {
  return /^[\d\s.,%+\-*/]+$/.test(String(value || "").trim());
}

function formatCell(value = "", type) {
  if (type === "password") return "<span class=\"password-mask\">********</span>";
  if (type === "id_mask") return escapeHtml(maskNationalId(value));
  const text = decodeEscapedNewlines(value);
  return escapeHtml(text.length > 130 ? text.slice(0, 130) + "..." : text);
}

function isBestFee(row) {
  const balance = parseFloat(String(row.balance_fee || "").replace(/[^\d.]/g, ""));
  const deposit = parseFloat(String(row.deposit_fee || "").replace(/[^\d.]/g, ""));
  return Number.isFinite(balance) && balance <= 0.5 || Number.isFinite(deposit) && deposit <= 1;
}

function renderCardsGrid(moduleKey, rows) {
  if (!rows.length) return emptyState("אין רשומות להצגה", "נסה לשנות חיפוש או פילטרים.");
  return `<div class="cards-grid">${rows.map(item => renderCard(moduleKey, item.row, item.index)).join("")}</div>`;
}

function renderCard(moduleKey, row, index) {
  if (moduleKey === "bank_numbers") return renderBankNumberCard(row, index);
  const config = MODULES[moduleKey];
  const title = row[config.primary] || "רשומה";
  const subtitle = row[config.secondary] || "";
  const badge = row[config.badge] || config.label;
  const fields = getColumns(moduleKey).filter(([field]) => getFieldValue(row, field)).map(([field, label, type]) => `
    <div class="card-field">
      <span>${escapeHtml(label)}</span>
      <b class="${type === "ltr" || looksLtr(getFieldValue(row, field)) ? "ltr" : ""}">${formatCell(getFieldValue(row, field), type)}</b>
    </div>
  `).join("");
  return `
    <article class="card">
      <div class="card-top">
        <div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(subtitle)}</p>
        </div>
        <span class="badge">${escapeHtml(badge)}</span>
      </div>
      <div class="card-fields">${fields}</div>
      <div class="row-actions">${renderActions(moduleKey, row, index)}</div>
    </article>
  `;
}

function renderBankNumberCard(row, index) {
  return `
    <article class="card bank-number-card">
      <div class="card-top">
        <div>
          <h3>${escapeHtml(row.bank_name || "בנק")}</h3>
        </div>
      </div>
      <div class="bank-number-display">${escapeHtml(row.bank_number || "")}</div>
      <div class="row-actions">${renderActions("bank_numbers", row, index)}</div>
    </article>
  `;
}

function renderActions(moduleKey, row, index) {
  const config = MODULES[moduleKey];
  const buttons = {
    copyEmail: row.email ? actionButton("copy", "מייל", "copy", row.email) : "",
    mailto: row.email ? actionButton("send", "שלח", "mailto", row.email, "primary") : "",
    sendTemplate: actionButton("send", "שלח", "sendTemplate", index, "primary"),
    copyTemplate: actionButton("copy", "העתק", "copyTemplate", index),
    openTemplate: actionButton("open", "פתח", "openTemplate", index, "primary"),
    copyUsername: row.username ? actionButton("copy", "User", "copy", row.username) : "",
    copyPassword: row.password ? actionButton("copy", "Pass", "copy", row.password) : "",
    openUrl: row.url ? actionButton("open", "פתח", "openUrl", row.url, "primary") : "",
    copyUrl: row.url ? actionButton("copy", "URL", "copy", row.url) : "",
    copyPhone: row.phone ? actionButton("copy", "טלפון", "copy", row.phone) : "",
    copyIban: row.iban ? actionButton("copy", "IBAN", "copy", row.iban) : "",
    copyCode: row.code ? actionButton("copy", "קוד", "copy", row.code) : "",
    copyAgent: row.agent_number ? actionButton("copy", "מספר", "copy", row.agent_number) : "",
    copyBankNumber: row.bank_number ? actionButton("copy", "מספר", "copy", row.bank_number) : "",
    viewSnifim: row.bank_number ? actionButton("table", "סניפים", "viewSnifim", row.bank_number, "primary") : "",
    copyContact: row.contact ? actionButton("copy", "קשר", "copy", row.contact) : "",
    openClient: actionButton("open", "פתח", "openClient", index, "primary"),
    copyRow: actionButton("copy", "שורה", "copyRow", `${moduleKey}:${index}`),
    edit: actionButton("edit", "ערוך", "edit", `${moduleKey}:${index}`),
    delete: actionButton("trash", "מחק", "delete", `${moduleKey}:${index}`, "danger")
  };
  return config.actions.map(action => buttons[action] || "").join("");
}

function actionButton(icon, label, action, value, variant = "") {
  return `<button class="row-button ${variant}" type="button" data-action="${action}" data-value="${escapeHtml(value)}">${ICONS[icon] || ""}<span>${escapeHtml(label)}</span></button>`;
}

function handleDocumentClick(event) {
  if (els.settingsDropdown && !event.target.closest(".settings-menu")) {
    els.settingsDropdown.hidden = true;
  }
  const clientRow = event.target.closest("[data-open-client-index]");
  if (clientRow && !event.target.closest("[data-action]")) {
    openClientModal(Number(clientRow.dataset.openClientIndex));
    return;
  }
  const filterButton = event.target.closest("[data-fee-company], [data-fee-product]");
  if (filterButton?.dataset.feeCompany) {
    feeCompany = filterButton.dataset.feeCompany;
    feeProduct = "";
    ensureFeeSelection();
    render();
    return;
  }
  if (filterButton?.dataset.feeProduct) {
    feeProduct = filterButton.dataset.feeProduct;
    render();
    return;
  }

  const sortButton = event.target.closest("[data-sort]");
  if (sortButton) {
    const field = sortButton.dataset.sort;
    sortState = sortState.field === field
      ? { field, direction: sortState.direction === "asc" ? "desc" : "asc" }
      : { field, direction: "asc" };
    render();
    return;
  }

  const actionButtonEl = event.target.closest("[data-action]");
  if (actionButtonEl) {
    handleAction(actionButtonEl.dataset.action, actionButtonEl.dataset.value || "");
    return;
  }

  const sendEmailRow = event.target.closest("[data-send-email-index]");
  if (sendEmailRow) {
    toggleSendEmailSelection(Number(sendEmailRow.dataset.sendEmailIndex));
    renderSendEmailResults();
    return;
  }

  const sendClientRow = event.target.closest("[data-send-client-index]");
  if (!sendClientRow) return;
  const index = Number(sendClientRow.dataset.sendClientIndex);
  selectedSendClientIndex = selectedSendClientIndex === index ? null : index;
  renderSendClientResults();
}

document.addEventListener("change", event => {
  const select = event.target.closest("[data-filter]");
  if (!select) return;
  filters[select.dataset.filter] = select.value;
  render();
});

function handleAction(action, value) {
  if (action === "copy") copyToClipboard(value, "הועתק ללוח");
  if (action === "mailto") window.location.href = `mailto:${value}`;
  if (action === "openUrl") window.open(value, "_blank", "noopener");
  if (action === "clearFilters") {
    filters = {};
    feeCompany = "";
    feeProduct = "";
    ensureFeeSelection(true);
    render();
  }
  if (action === "copyRow") {
    const [moduleKey, index] = value.split(":");
    copyToClipboard(rowText(DB[moduleKey][Number(index)]), "השורה הועתקה");
  }
  if (action === "copyFeeRows") copyToClipboard(getFeeRows().map(item => rowText(item.row)).join("\n"), "המדרגים הועתקו");
  if (action === "exportSelected") exportSelectedRows();
  if (action === "printView") window.print();
  if (action === "edit") {
    const [moduleKey, index] = value.split(":");
    openRecordModal(moduleKey, Number(index));
  }
  if (action === "delete") {
    const [moduleKey, index] = value.split(":");
    deleteRecord(moduleKey, Number(index));
  }
  if (action === "copyTemplate") {
    const row = DB.email_templates[Number(value)];
    copyToClipboard(templateCopyText(row), "התבנית הועתקה");
  }
  if (action === "openTemplate") openTemplate(Number(value));
  if (action === "sendTemplate") openSendTemplateModal(Number(value));
  if (action === "openClient") openClientModal(Number(value));
  if (action === "viewSnifim") openSnifimModal(value);
}

function setSearchScope(scope) {
  searchScope = scope;
  saveUiState();
  render();
}

function setViewMode(mode) {
  viewModes[currentModule] = mode;
  localStorage.setItem("agent_ops_view_modes", JSON.stringify(viewModes));
  saveUiState();
  render();
}

function getViewMode(moduleKey = currentModule) {
  return viewModes[moduleKey] || "table";
}

function saveUiState(overrides = {}) {
  const state = {
    currentModule,
    searchScope,
    query,
    scrollY: window.scrollY || 0,
    ...overrides
  };
  localStorage.setItem(UI_STATE_KEY, JSON.stringify(state));
}

function scheduleScrollSave() {
  if (scrollSaveTimer) return;
  scrollSaveTimer = window.setTimeout(() => {
    scrollSaveTimer = null;
    saveUiState();
  }, 160);
}

function restoreScrollPosition() {
  if (didRestoreScroll) return;
  didRestoreScroll = true;
  const y = Number(savedUiState.scrollY || 0);
  if (!Number.isFinite(y) || y <= 0) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => window.scrollTo({ top: y, left: 0, behavior: "auto" }));
  });
}

function setSearch(value) {
  query = value;
  els.mainSearch.value = value;
  rememberSearch(value);
  saveUiState();
  render();
}

function rememberSearch(value) {
  recentSearches = [value, ...recentSearches.filter(item => item !== value)].slice(0, 6);
  localStorage.setItem("agent_ops_recent_searches", JSON.stringify(recentSearches));
}

function openRecordModal(moduleKey, index = null) {
  currentModule = moduleKey;
  editing = { moduleKey, index };
  const config = MODULES[moduleKey];
  const row = index === null ? {} : DB[moduleKey][index];
  els.modalTitle.textContent = index === null ? `הוספת ${config.label}` : `עריכת ${config.label}`;
  els.modalSubtitle.textContent = config.title;
  els.formFields.innerHTML = config.fields.map(field => {
    const wide = (config.textareas || []).includes(field) || ["body", "notes"].includes(field);
    const rawValue = getFieldValue(row, field);
    const value = wide ? decodeEscapedNewlines(rawValue || "") : rawValue || "";
    const control = wide
      ? `<textarea id="field_${field}" name="${field}">${escapeHtml(value)}</textarea>`
      : `<input id="field_${field}" name="${field}" value="${escapeHtml(value)}" />`;
    return `<div class="form-field ${wide ? "wide" : ""}"><label for="field_${field}">${escapeHtml(FIELD_LABELS[field] || field)}</label>${control}</div>`;
  }).join("");
  render();
  els.recordDialog.showModal();
}

function handleRecordFormKeydown(event) {
  if (event.key !== "Enter" || event.isComposing) return;
  const target = event.target;
  if (target?.tagName === "TEXTAREA" && !event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  els.recordForm.requestSubmit();
}

function saveRecord(event) {
  event.preventDefault();
  if (event.submitter?.value === "cancel") {
    els.recordDialog.close();
    return;
  }
  const { moduleKey, index } = editing;
  const config = MODULES[moduleKey];
  const formData = new FormData(els.recordForm);
  const row = {};
  config.fields.forEach(field => setFieldValue(row, field, String(formData.get(field) || "").trim()));
  if (index === null) addRecord(moduleKey, row);
  else updateRecord(moduleKey, index, row);
  els.recordDialog.close();
  toast("הרשומה נשמרה");
  render();
}

function addRecord(type, record) {
  DB[type].unshift(record);
  saveDataToLocalStorage(type);
}

function updateRecord(type, id, record) {
  DB[type][id] = record;
  saveDataToLocalStorage(type);
}

function deleteRecord(type, id) {
  if (!confirm(`למחוק רשומה מתוך ${MODULES[type].label}?`)) return;
  DB[type].splice(id, 1);
  saveDataToLocalStorage(type);
  toast("הרשומה נמחקה");
  render();
}

function openTemplate(index) {
  activeTemplate = DB.email_templates[index];
  if (!activeTemplate) return;
  els.templateTitle.textContent = activeTemplate.title || "תבנית מייל";
  els.templateSubject.textContent = decodeEscapedNewlines(activeTemplate.subject || "");
  els.templateBody.textContent = decodeEscapedNewlines(activeTemplate.body || "");
  els.templateDialog.showModal();
}

function openSendTemplateModal(index) {
  sendTemplate = DB.email_templates[index];
  if (!sendTemplate) return;
  sendEmailQuery = "";
  sendClientQuery = "";
  selectedSendClientIndex = null;
  selectedSendEmailIndexes = new Set();
  els.sendEmailSearch.value = "";
  if (els.sendClientSearch) els.sendClientSearch.value = "";
  els.sendTemplateSubtitle.textContent = `${sendTemplate.title || "תבנית מייל"} · ${sendTemplate.subject || ""}`;
  renderSendClientResults();
  renderSendEmailResults();
  els.sendTemplateDialog.showModal();
  window.setTimeout(() => els.sendEmailSearch.focus(), 60);
}

function renderSendEmailResults() {
  const rows = getSendEmailCandidates();
  const selectedEmails = getSelectedSendEmails();
  els.selectedSendEmail.textContent = selectedEmails.length ? selectedEmails.join("; ") : "לא נבחר יעד";
  els.sendTemplateMailBtn.disabled = !selectedEmails.length;
  if (!rows.length) {
    els.sendEmailResults.innerHTML = `<div class="send-empty">לא נמצאו מיילים תואמים</div>`;
    return;
  }
  els.sendEmailResults.innerHTML = rows.map(({ row, index }) => `
    <button class="send-result ${selectedSendEmailIndexes.has(index) ? "selected" : ""}" type="button" data-send-email-index="${index}">
      <span class="send-check">${selectedSendEmailIndexes.has(index) ? "✓" : ""}</span>
      <span class="send-company">${escapeHtml(row.company || "")}</span>
      <span class="send-meta">${escapeHtml([row.category, row.department, row.action].filter(Boolean).join(" · "))}</span>
      <span class="send-email ltr">${escapeHtml(row.email || "")}</span>
    </button>
  `).join("");
}

function renderSendClientResults() {
  if (!els.sendClientResults) return;
  const rows = getSendClientCandidates();
  const selected = selectedSendClientIndex !== null ? DB.clients?.[selectedSendClientIndex] : null;
  els.selectedSendClient.textContent = selected ? `${clientFullName(selected)} · ${maskNationalId(selected.national_id)}` : "לא נבחר לקוח";
  if (!rows.length) {
    els.sendClientResults.innerHTML = `<div class="send-empty compact">לא נמצאו לקוחות תואמים</div>`;
    return;
  }
  els.sendClientResults.innerHTML = rows.map(({ row, index }) => `
    <button class="client-pick ${selectedSendClientIndex === index ? "selected" : ""}" type="button" data-send-client-index="${index}">
      <span>${escapeHtml(clientFullName(row) || "ללא שם")}</span>
      <b>${escapeHtml(maskNationalId(row.national_id))}</b>
      <small class="ltr">${escapeHtml(row.email || "")}</small>
    </button>
  `).join("");
}

function getSendClientCandidates() {
  const value = sendClientQuery.trim();
  const rows = (DB.clients || []).map((row, index) => ({ row, index }));
  const filtered = value
    ? rows.filter(item => matchesSearch(item.row, value))
    : rows.slice(0, 8);
  return filtered.slice(0, 20);
}

function getSendEmailCandidates() {
  const queryValue = sendEmailQuery.trim();
  const templateHints = [sendTemplate?.category, sendTemplate?.title, sendTemplate?.subject].filter(Boolean).join(" ");
  const effectiveQuery = queryValue || templateHints;
  const normalizedQuery = aliasTokens(effectiveQuery);
  const terms = normalizedQuery.split(" ").filter(Boolean);
  return (DB.operational_emails || [])
    .map((row, index) => {
      const searchable = aliasTokens([row.company, row.category, row.department, row.action, row.email].join(" "));
      const fullMatch = !terms.length || terms.every(term => searchable.includes(term));
      const partialScore = terms.reduce((score, term) => score + (searchable.includes(term) ? 2 : isFuzzyMatch(searchable, term) ? 1 : 0), 0);
      const templateScore = scoreTemplateEmailSuggestion(row, sendTemplate);
      const recentScore = getRecentTemplateEmails().includes(row.email) ? 4 : 0;
      return { row, index, score: (fullMatch ? 20 : 0) + partialScore + templateScore + recentScore };
    })
    .filter(item => item.row.email && (queryValue ? item.score > 0 : item.score > 2))
    .sort((a, b) => b.score - a.score || compareValues(a.row.company || "", b.row.company || ""))
    .slice(0, 40);
}

function scoreTemplateEmailSuggestion(row = {}, template = {}) {
  const hints = aliasTokens([template.category, template.title, template.subject].join(" "));
  if (!hints) return 0;
  const actionText = aliasTokens([row.category, row.department, row.action].join(" "));
  return hints.split(" ").filter(term => term.length > 1 && actionText.includes(term)).length * 6;
}

function toggleSendEmailSelection(index) {
  if (!Number.isInteger(index)) return;
  if (selectedSendEmailIndexes.has(index)) selectedSendEmailIndexes.delete(index);
  else selectedSendEmailIndexes.add(index);
}

function getSelectedSendEmails() {
  return [...selectedSendEmailIndexes]
    .map(index => DB.operational_emails[index]?.email)
    .filter(Boolean);
}

function sendSelectedTemplateEmail() {
  const targetEmails = getSelectedSendEmails();
  if (!targetEmails.length || !sendTemplate) return;
  const selectedClient = selectedSendClientIndex !== null ? DB.clients?.[selectedSendClientIndex] : null;
  const subjectText = buildTemplateSubject(sendTemplate.subject || "", selectedClient);
  const subject = encodeURIComponent(formatMailtoRtlSubject(subjectText));
  const body = encodeURIComponent(formatMailtoRtlPlainText(buildEmailBodyWithSignature(sendTemplate.body || "")));
  const filingEmail = getFilingEmail();
  const cc = filingEmail ? `&cc=${encodeURIComponent(filingEmail)}` : "";
  window.location.href = `mailto:${targetEmails.map(encodeURIComponent).join(";")}?subject=${subject}${cc}&body=${body}`;
  targetEmails.forEach(rememberRecentTemplateEmail);
}

function buildTemplateSubject(subject = "", client = null) {
  const cleanSubject = decodeEscapedNewlines(subject || "").trim();
  if (!client) return cleanSubject;
  const fullName = clientFullName(client);
  const nationalId = String(client.national_id || "").trim();
  const clientPart = [fullName, nationalId ? `ת.ז ${nationalId}` : ""].filter(Boolean).join(" ");
  return [clientPart, cleanSubject].filter(Boolean).join(" ");
}

function buildEmailBodyWithSignature(templateBody = "") {
  const body = decodeEscapedNewlines(templateBody).trimEnd();
  const signature = getEmailSignature().trim();
  if (!signature) return body;
  return `${body}\n\n${signature}`;
}

function openFilingEmailModal() {
  if (!els.filingEmailDialog || !els.filingEmailInput) return;
  els.filingEmailInput.value = getFilingEmail();
  els.filingEmailDialog.showModal();
  window.setTimeout(() => els.filingEmailInput.focus(), 60);
}

function saveFilingEmail(event) {
  event.preventDefault();
  localStorage.setItem(FILING_EMAIL_KEY, els.filingEmailInput?.value.trim() || "");
  els.filingEmailDialog.close();
  toast("מייל לתיוק נשמר");
}

function getFilingEmail() {
  return localStorage.getItem(FILING_EMAIL_KEY) || "";
}

function openSignatureModal() {
  if (!els.signatureDialog || !els.emailSignatureInput) return;
  els.emailSignatureInput.value = getEmailSignature();
  els.signatureDialog.showModal();
  window.setTimeout(() => els.emailSignatureInput.focus(), 60);
}

function saveEmailSignature(event) {
  event.preventDefault();
  localStorage.setItem(EMAIL_SIGNATURE_KEY, els.emailSignatureInput?.value || "");
  els.signatureDialog.close();
  toast("חתימת המייל נשמרה");
}

function getEmailSignature() {
  return localStorage.getItem(EMAIL_SIGNATURE_KEY) || "";
}

function openClientModal(index) {
  activeClient = DB.clients?.[index];
  if (!activeClient) return;
  els.clientTitle.textContent = clientFullName(activeClient) || "פרטי לקוח";
  els.clientSubtitle.textContent = `${maskNationalId(activeClient.national_id)} · ${activeClient.email || ""}`;
  els.mailClientBtn.disabled = !activeClient.email;
  const fields = [
    ["שם מלא", clientFullName(activeClient)],
    ["ת.ז", activeClient.national_id],
    ["כתובת מלאה", activeClient.address],
    ["טלפון", activeClient.phone],
    ["מייל", activeClient.email],
    ["תאריך לידה", activeClient.birth_date],
    ["תאריך הנפקה", activeClient.issue_date]
  ];
  els.clientDetails.innerHTML = fields.map(([label, value]) => `
    <div class="client-detail-row">
      <span>${escapeHtml(label)}</span>
      <strong class="${looksLtr(value) ? "ltr" : ""}">${escapeHtml(value || "")}</strong>
      <button class="copy-icon-only" type="button" data-action="copy" data-value="${escapeHtml(value || "")}" title="העתקה">
        ${ICONS.copy}
      </button>
    </div>
  `).join("");
  hydrateIcons(els.clientDetails);
  els.clientDialog.showModal();
}

function clientFullName(client = {}) {
  return [client.first_name, client.last_name].filter(Boolean).join(" ").trim();
}

function maskNationalId(value = "") {
  const text = String(value || "").trim();
  if (text.length <= 2) return text;
  return `${text.slice(0, 2)}${"*".repeat(Math.max(text.length - 2, 0))}`;
}

function formatMailtoRtlSubject(value = "") {
  const rtlEmbed = "\u202B";
  const popDirection = "\u202C";
  return `${rtlEmbed}${String(value || "").trim()}${popDirection}`;
}

function formatMailtoRtlPlainText(value = "") {
  const rtlEmbed = "\u202B";
  const popDirection = "\u202C";
  const text = String(value || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return text
    .split("\n")
    .map(line => line ? `${rtlEmbed}${line}${popDirection}` : "")
    .join("\r\n");
}

function rememberRecentTemplateEmail(email) {
  if (!email) return;
  const key = "agent_ops_recent_template_emails";
  const current = getRecentTemplateEmails();
  localStorage.setItem(key, JSON.stringify([email, ...current.filter(item => item !== email)].slice(0, 8)));
}

function getRecentTemplateEmails() {
  return parseStoredJson("agent_ops_recent_template_emails", []);
}






function openSnifimModal(bankNumber) {
  currentBankNumber = String(bankNumber).trim();
  snifimQuery = "";
  els.snifimSearch.value = "";
  
  const bankName = (DB.bank_numbers || []).find(b => String(b.bank_number) === currentBankNumber)?.bank_name || "";
  els.snifimTitle.textContent = `סניפי בנק ${bankName}`;
  els.snifimSubtitle.textContent = `מספר בנק: ${currentBankNumber}`;
  
  renderSnifimResults();
  els.snifimDialog.showModal();
}

function renderSnifimResults() {
  const snifim = (DB.snifim || []).filter(s => String(s['קוד הבנק'] || "") === currentBankNumber);
  
  const queryWords = normalizeText(snifimQuery).split(" ").filter(Boolean);
  
  const filtered = snifim.filter(s => {
    if (!queryWords.length) return true;
    const text = normalizeText([s['שם הסניף'], s['קוד הסניף'], s['עיר'], s['כתובת']].join(" "));
    return queryWords.every(w => text.includes(w));
  });
  
  if (!filtered.length) {
    els.snifimResults.innerHTML = emptyState("לא נמצאו סניפים", "נסה לחפש לפי מילת חיפוש אחרת.");
    return;
  }
  
  els.snifimResults.innerHTML = filtered.map(s => `
    <div class="send-item" style="border: 1px solid var(--border); border-radius: 9px; padding: 12px; margin-bottom: 8px; background: #fff;">
      <div class="send-info" style="display: flex; flex-direction: column; gap: 4px;">
        <strong style="color: var(--navy); font-size: 15px;">${escapeHtml(s['שם הסניף'] || "")} (סניף ${escapeHtml(s['קוד הסניף'] || "")})</strong>
        <span style="color: #617390; font-size: 13px;">${escapeHtml(s['עיר'] || "")}, ${escapeHtml(s['כתובת'] || "")}</span>
        ${s['טלפון'] ? `<span style="color: #617390; font-size: 13px;">טלפון: <span class="ltr">${escapeHtml(s['טלפון'])}</span></span>` : ""}
      </div>
    </div>
  `).join("");
}

async function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    if (/\.(xlsx|xls)$/i.test(file.name)) {
      const result = await importExcelWorkbook(file);
      toast(result.imported
        ? `יובאו ${result.imported} רשומות מ-Excel · ${result.skipped} כפילויות דולגו`
        : `לא נמצאו רשומות חדשות לייבוא · ${result.skipped} כפילויות דולגו`);
      render();
      return;
    }

    const parsed = JSON.parse(await file.text());
    const modules = parsed.modules || parsed;
    let imported = 0;
    let skipped = 0;
    Object.keys(MODULES).forEach(key => {
      if (Array.isArray(modules[key])) {
        const result = mergeRowsIntoModule(key, DB[key] || [], modules[key]);
        DB[key] = result.rows;
        saveDataToLocalStorage(key);
        imported += result.added;
        skipped += result.skipped;
      }
    });
    if (!imported && Array.isArray(parsed)) {
      const result = mergeRowsIntoModule(currentModule, DB[currentModule] || [], parsed);
      DB[currentModule] = result.rows;
      saveDataToLocalStorage(currentModule);
      imported = result.added;
      skipped = result.skipped;
    }
    toast(imported ? `יובאו ${imported} רשומות · ${skipped} כפילויות דולגו` : `לא נמצאו רשומות חדשות · ${skipped} כפילויות דולגו`);
    render();
  } catch (error) {
    console.error(error);
    toast("קובץ הייבוא לא תקין");
  } finally {
    event.target.value = "";
  }
}










function isDuplicateRow(existingRows, row, moduleKey, fields) {
  const keyFields = EXCEL_DEDUPE_KEYS[moduleKey] || [];
  const comparableFields = keyFields.filter(field => String(getFieldValue(row, field) || "").trim());
  const fallbackFields = fields.filter(field => field !== "source" && String(getFieldValue(row, field) || "").trim());
  const fieldsToCompare = comparableFields.length >= 2 || moduleKey === "companies" ? comparableFields : fallbackFields;
  if (!fieldsToCompare.length) return false;
  return existingRows.some(existing =>
    fieldsToCompare.every(field => normalizeDedupeValue(getFieldValue(existing, field)) === normalizeDedupeValue(getFieldValue(row, field)))
  );
}

function normalizeDedupeValue(value = "") {
  return normalizeText(value).replace(/\s+/g, " ").trim();
}

function decodeEscapedNewlines(value = "") {
  return String(value ?? "")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n");
}

function templateCopyText(template = {}) {
  const subject = decodeEscapedNewlines(template.subject || "").trim();
  const body = decodeEscapedNewlines(template.body || "").trim();
  return subject ? `${subject}\n\n${body}` : body;
}

function mergeRowsIntoModule(moduleKey, existingRows = [], incomingRows = []) {
  const config = MODULES[moduleKey];
  const rows = Array.isArray(existingRows) ? [...existingRows] : [];
  let added = 0;
  let skipped = 0;
  (Array.isArray(incomingRows) ? incomingRows : []).forEach(row => {
    if (!row || typeof row !== "object") return;
    if (isDuplicateRow(rows, row, moduleKey, config.fields)) {
      skipped += 1;
      return;
    }
    rows.push(row);
    added += 1;
  });
  return { rows, added, skipped };
}

function ensureCompanyRecord(name) {
  const cleanName = String(name || "").trim();
  if (!cleanName || !DB.companies) return;
  const exists = DB.companies.some(company => normalizeText(company.name || company.company || "") === normalizeText(cleanName));
  if (!exists) DB.companies.push({ name: cleanName, aliases: "", type: "יצרן" });
}

async function copyToClipboard(value, message) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const input = document.createElement("textarea");
    input.value = value;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }
  toast(message);
}

function rowText(row = {}) {
  if (row.discounts) {
    return [
      ["company", row.company],
      ["product", row.product],
      ["track", row.track],
      ["agreement_number", row.agreement_number],
      ["discounts.year1", row.discounts.year1],
      ["discounts.year2", row.discounts.year2],
      ["discounts.year3", row.discounts.year3],
      ["discounts.year4", row.discounts.year4],
      ["discounts.year5to6", row.discounts.year5to6],
      ["validity", row.validity]
    ].filter(([, value]) => value).map(([key, value]) => `${FIELD_LABELS[key] || key}: ${value}`).join(" | ");
  }
  return Object.entries(row).filter(([, value]) => value !== "").map(([key, value]) => `${FIELD_LABELS[key] || key}: ${value}`).join(" | ");
}

function emptyState(title, description) {
  return `<div class="empty-state"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(description)}</span></div>`;
}

function hydrateIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach(element => element.innerHTML = ICONS[element.dataset.icon] || "");
}

function looksLtr(value) {
  return /https?:|@|[A-Za-z0-9]{3,}/.test(String(value || ""));
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 1700);
}
