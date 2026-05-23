const STORAGE_PREFIX = "agent_ops_platform_v3_";
const DATA_VERSION_KEY = "agent_ops_data_versions";
const DATA_VERSIONS = {
  insurance_discounts: "insurance-discounts-template-3-20260518"
};

const MODULES = {
  operational_emails: {
    file: "data/operational_emails.json",
    label: "מיילים",
    title: "מיילים תפעוליים",
    icon: "mail",
    fields: ["company", "category", "department", "action", "email", "notes", "source"],
    textareas: ["notes"],
    columns: [
      ["company", "חברה"],
      ["category", "קטגוריה"],
      ["department", "מחלקה"],
      ["action", "פעולה"],
      ["email", "מייל", "ltr"],
    ],
    filters: [
      ["company", "חברה"],
      ["category", "קטגוריה"],
      ["department", "מחלקה"],
      ["action", "פעולה"]
    ],
    primary: "company",
    secondary: "action",
    badge: "category",
    actions: ["copyEmail", "mailto", "edit", "delete"]
  },
  email_templates: {
    file: "data/email_templates.json",
    label: "תבניות",
    title: "תבניות מייל",
    icon: "file",
    fields: ["category", "title", "subject", "body"],
    textareas: ["body"],
    columns: [
      ["title", "שם תבנית"],
      ["category", "קטגוריה"],
      ["subject", "Subject"],
      ["body", "Body"]
    ],
    filters: [["category", "קטגוריה"]],
    primary: "title",
    secondary: "subject",
    badge: "category",
    actions: ["sendTemplate", "copyTemplate", "openTemplate", "edit", "delete"]
  },
  passwords: {
    file: "data/passwords.json",
    label: "סיסמאות",
    title: "מערכות וסיסמאות",
    icon: "lock",
    fields: ["company", "system", "url", "username", "password", "notes"],
    textareas: ["notes"],
    columns: [
      ["company", "חברה"],
      ["system", "מערכת"],
      ["url", "URL", "ltr"],
      ["username", "משתמש", "ltr"],
      ["password", "סיסמה", "password"]
    ],
    filters: [["company", "חברה"], ["system", "מערכת"]],
    primary: "company",
    secondary: "system",
    badge: "system",
    actions: ["copyUsername", "copyPassword", "openUrl", "edit", "delete"]
  },
  supervisors: {
    file: "data/supervisors.json",
    label: "מפקחים",
    title: "מפקחים",
    icon: "user",
    fields: ["name", "company", "role", "email", "phone", "source"],
    columns: [
      ["name", "שם"],
      ["company", "חברה"],
      ["role", "תפקיד"],
      ["email", "מייל", "ltr"],
      ["phone", "טלפון", "ltr"]
    ],
    filters: [["company", "חברה"], ["role", "תפקיד"]],
    primary: "name",
    secondary: "company",
    badge: "role",
    actions: ["copyEmail", "copyPhone", "mailto", "edit", "delete"]
  },
  employers: {
    file: "data/employers.json",
    label: "מעסיקים",
    title: "מעסיקים",
    icon: "briefcase",
    fields: ["employer", "contact_name", "email", "notes", "source"],
    textareas: ["notes"],
    columns: [
      ["employer", "חברה"],
      ["contact_name", "איש קשר"],
      ["email", "מייל", "ltr"],
      ["notes", "הערות"],
      ["source", "מקור"]
    ],
    filters: [["employer", "חברה"], ["contact_name", "איש קשר"]],
    primary: "employer",
    secondary: "contact_name",
    badge: "contact_name",
    actions: ["copyEmail", "mailto", "edit", "delete"]
  },
  clients: {
    file: "data/clients.json",
    label: "לקוחות",
    title: "לקוחות",
    icon: "user",
    fields: ["first_name", "last_name", "national_id", "address", "phone", "email", "birth_date", "issue_date"],
    columns: [
      ["client_name", "שם לקוח"],
      ["national_id", "ת.ז", "id_mask"],
      ["email", "מייל", "ltr"]
    ],
    filters: [["first_name", "שם"], ["last_name", "משפחה"], ["national_id", "ת.ז"], ["email", "מייל"]],
    primary: "first_name",
    secondary: "national_id",
    badge: "email",
    actions: ["openClient", "copyEmail", "mailto", "edit", "delete"]
  },
  management_fees: {
    file: "data/management_fees.json",
    label: "דמי ניהול",
    title: "דמי ניהול",
    icon: "percent",
    fields: ["company", "product", "range", "balance_fee", "deposit_fee", "validity", "priority", "source"],
    columns: [
      ["company", "חברה"],
      ["product", "מוצר"],
      ["range", "טווח צבירה"],
      ["balance_fee", "מצבירה"],
      ["deposit_fee", "מהפקדה"],
      ["validity", "תוקף"]
    ],
    filters: [["company", "חברה"], ["product", "מוצר"], ["range", "טווח"]],
    primary: "company",
    secondary: "product",
    badge: "range",
    actions: ["copyRow", "edit", "delete"],
    special: "fees"
  },
  insurance_discounts: {
    file: "data/insurance_discounts.json",
    label: "הנחות ביטוח",
    title: "הנחות ביטוח",
    icon: "spark",
    fields: ["company", "product", "track", "agreement_number", "discounts.year1", "discounts.year2", "discounts.year3", "discounts.year4", "discounts.year5to6", "validity", "notes", "conditions", "source"],
    textareas: ["notes", "conditions"],
    columns: [
      ["company", "חברה"],
      ["product", "מוצר"],
      ["track", "מסלול"],
      ["agreement_number", "הסכם"],
      ["discounts.year1", "א׳"],
      ["discounts.year2", "ב׳"],
      ["discounts.year3", "ג׳"],
      ["discounts.year4", "ד׳"],
      ["discounts.year5to6", "ה׳-ו׳"],
      ["validity", "תוקף"]
    ],
    filters: [["company", "חברה"], ["product", "מוצר"], ["agreement_number", "מס' הסכם"], ["track", "מסלול"]],
    primary: "company",
    secondary: "product",
    badge: "agreement_number",
    actions: ["copyRow", "edit", "delete"]
  },
  deposit_accounts: {
    file: "data/deposit_accounts.json",
    label: "חשבונות",
    title: "חשבונות להפקדה",
    icon: "bank",
    fields: ["company", "product", "bank", "branch", "account", "iban", "email", "notes", "source"],
    textareas: ["notes"],
    columns: [
      ["company", "חברה"],
      ["product", "מוצר"],
      ["bank", "בנק"],
      ["branch", "סניף"],
      ["account", "חשבון", "ltr"],
      ["iban", "IBAN", "ltr"],
      ["email", "מייל אסמכתאות", "ltr"]
    ],
    filters: [["company", "חברה"], ["bank", "בנק"], ["product", "מוצר"]],
    primary: "company",
    secondary: "bank",
    badge: "product",
    actions: ["copyIban", "copyEmail", "mailto", "edit", "delete"]
  },
  service_centers: {
    file: "data/service_centers.json",
    label: "מוקדים",
    title: "מוקדי שירות",
    icon: "headphones",
    fields: ["company", "department", "phone", "email", "hours", "customer_phone", "source"],
    columns: [
      ["company", "חברה"],
      ["department", "מחלקה"],
      ["phone", "טלפון", "ltr"],
      ["email", "מייל", "ltr"],
      ["hours", "שעות פעילות"]
    ],
    filters: [["company", "חברה"], ["department", "מחלקה"]],
    primary: "company",
    secondary: "department",
    badge: "department",
    actions: ["copyPhone", "copyEmail", "mailto", "edit", "delete"]
  },
  institution_codes: {
    file: "data/institution_codes.json",
    label: "קודי מוסד",
    title: "קודי מוסד",
    icon: "hash",
    fields: ["company", "type", "code", "source"],
    columns: [["company", "חברה"], ["type", "סוג"], ["code", "קוד", "ltr"], ["source", "מקור"]],
    filters: [["company", "חברה"], ["type", "סוג"]],
    primary: "company",
    secondary: "type",
    badge: "code",
    actions: ["copyCode", "edit", "delete"]
  },
  links: {
    file: "data/links.json",
    label: "קישורים",
    title: "קישורים חשובים",
    icon: "link",
    fields: ["company", "name", "url", "notes", "source"],
    textareas: ["notes"],
    columns: [["name", "שם"], ["company", "חברה"], ["url", "URL", "ltr"], ["notes", "הערות"]],
    filters: [["company", "חברה"], ["name", "שם"]],
    primary: "name",
    secondary: "company",
    badge: "company",
    actions: ["openUrl", "copyUrl", "edit", "delete"]
  },
  agent_numbers: {
    file: "data/agent_numbers.json",
    label: "מספרי סוכן",
    title: "מספרי סוכן",
    icon: "id",
    fields: ["company", "product", "agent_number", "source"],
    columns: [["company", "חברה"], ["product", "מוצר"], ["agent_number", "מספר סוכן", "ltr"], ["source", "מקור"]],
    filters: [["company", "חברה"], ["product", "מוצר"]],
    primary: "company",
    secondary: "product",
    badge: "agent_number",
    actions: ["copyAgent", "edit", "delete"]
  },
  bank_numbers: {
    file: "data/bank_numbers.json",
    label: "מספרי בנקים",
    title: "מספרי בנקים בישראל",
    icon: "bank",
    fields: ["bank_name", "bank_number"],
    columns: [["bank_name", "בנק"], ["bank_number", "מספר בנק", "ltr"]],
    filters: [["bank_name", "בנק"], ["bank_number", "מספר"]],
    primary: "bank_name",
    secondary: "bank_number",
    badge: "bank_number",
    actions: ["viewSnifim", "copyBankNumber", "edit", "delete"]
  },
  mortgage_release: {
    file: "data/mortgage_release.json",
    label: "משכנתא",
    title: "שחרור משכנתא",
    icon: "home",
    fields: ["entity", "contact", "type", "source"],
    columns: [["entity", "גורם"], ["contact", "איש קשר"], ["type", "סוג"], ["source", "מקור"]],
    filters: [["entity", "גורם"], ["type", "סוג"]],
    primary: "entity",
    secondary: "type",
    badge: "type",
    actions: ["copyContact", "edit", "delete"]
  },
  snifim: {
    file: "data/snifim.json",
    label: "סניפים",
    title: "סניפי בנקים",
    icon: "bank",
    hidden: true,
    fields: ["קוד הבנק", "שם הבנק", "קוד הסניף", "שם הסניף", "כתובת", "עיר", "טלפון"],
    columns: [],
    filters: [],
    primary: "שם הסניף",
    secondary: "עיר",
    badge: "קוד הסניף",
    actions: []
  },
  companies: {
    file: "data/companies.json",
    label: "חברות",
    title: "חברות ואליאסים",
    icon: "building",
    hidden: true,
    fields: ["name", "aliases", "type"],
    columns: [["name", "חברה"], ["aliases", "כינויים"], ["type", "סוג"]],
    filters: [["type", "סוג"]],
    primary: "name",
    secondary: "type",
    badge: "type",
    actions: ["edit", "delete"]
  }
};

const SEARCH_ORDER = Object.keys(MODULES);
const MODULE_SCOPE = {
  operational_emails: "global",
  email_templates: "global",
  management_fees: "global",
  insurance_discounts: "global",
  service_centers: "global",
  institution_codes: "global",
  bank_numbers: "global",
  mortgage_release: "global",
  snifim: "global",
  companies: "global",
  links: "private",
  passwords: "private",
  supervisors: "private",
  employers: "private",
  clients: "private",
  deposit_accounts: "global",
  agent_numbers: "private"
};
Object.entries(MODULE_SCOPE).forEach(([key, scope]) => {
  if (MODULES[key]) MODULES[key].scope = scope;
});
const FEE_COMPANY_ORDER = ["הפניקס", "מגדל", "הראל", "כלל", "מיטב", "מור", "אלטשולר", "מנורה", "אנליסט", "הכשרה", "ילין לפידות"];
const PRODUCT_ORDER = ["פנסיה", "קרנות פנסיה", "קרן השתלמות", "השתלמות", "גמל והשתלמות", "קופת גמל", "גמל", "גמל להשקעה", "פוליסה פיננסית", "BEST INVEST", "חיסכון לפרישה", "מגוון", "IRA", "תיקון 190", "ריסק", "בריאות"];
const QUICK_SEARCHES = ["הפניקס", "כלל", "מגדל", "הראל", "מיטב", "מור", "ניוד", "פדיון", "דמי ניהול", "הפקדות"];
const FIELD_LABELS = Object.fromEntries(Object.values(MODULES).flatMap(module => module.fields.map(field => [field, field])));
Object.assign(FIELD_LABELS, {
  company: "חברה", category: "קטגוריה", action: "פעולה", email: "מייל", notes: "הערות", source: "מקור",
  title: "שם תבנית", subject: "Subject", body: "Body", system: "מערכת", url: "URL", username: "שם משתמש",
  password: "סיסמה", name: "שם", role: "תפקיד", phone: "טלפון", employer: "חברה", contact_name: "איש קשר",
  first_name: "שם", last_name: "משפחה", client_name: "שם לקוח", national_id: "ת.ז", address: "כתובת מלאה", birth_date: "תאריך לידה", issue_date: "תאריך הנפקה",
  product: "מוצר", range: "טווח צבירה", balance_fee: "מצבירה", deposit_fee: "מהפקדה", validity: "תוקף",
  priority: "עדיפות", track: "מסלול", agreement_number: "מס' הסכם", "discounts.year1": "שנה א׳", "discounts.year2": "שנה ב׳", "discounts.year3": "שנה ג׳", "discounts.year4": "שנה ד׳", "discounts.year5to6": "שנים ה׳-ו׳", period: "תקופה", discount: "הנחה", bank: "בנק", branch: "סניף",
  account: "חשבון", iban: "IBAN", department: "מחלקה", hours: "שעות פעילות", customer_phone: "טלפון לקוחות",
  type: "סוג", code: "קוד", agent_number: "מספר סוכן", bank_name: "בנק", bank_number: "מספר בנק", entity: "גורם", contact: "איש קשר", aliases: "כינויים"
});

const EXCEL_SHEETS = {
  operational_emails: ["מיילים", "operational_emails"],
  email_templates: ["תבניות", "email_templates"],
  passwords: ["סיסמאות", "passwords"],
  supervisors: ["מפקחים", "supervisors"],
  employers: ["מעסיקים", "employers"],
  clients: ["לקוחות", "clients"],
  management_fees: ["דמי ניהול", "management_fees"],
  insurance_discounts: ["הנחות ביטוח", "insurance_discounts"],
  deposit_accounts: ["חשבונות בנק", "deposit_accounts"],
  service_centers: ["מוקדי שירות", "service_centers"],
  institution_codes: ["קודי מוסד", "קודי מוסדות", "מוסדות", "קודים", "קופות", "institution_codes", "institution codes"],
  links: ["קישורים", "links"],
  agent_numbers: ["מספרי סוכן", "agent_numbers"],
  bank_numbers: ["מספרי בנקים", "bank_numbers"],
  mortgage_release: ["משכנתא", "mortgage_release"],
  companies: ["חברות", "companies"]
};

const EXCEL_HEADER_ALIASES = {
  company: ["יצרן", "חברה", "שם חברה", "חברה מנהלת", "גוף מוסדי", "יצרן/חברה", "בית השקעות"],
  category: ["קטגוריה"],
  action: ["פעולה"],
  email: ["מייל", "אימייל", "מייל אסמכתאות"],
  notes: ["הערות"],
  source: ["מקור"],
  title: ["שם תבנית", "תבנית"],
  subject: ["נושא", "Subject"],
  body: ["גוף", "Body"],
  system: ["מערכת"],
  url: ["URL", "קישור"],
  username: ["משתמש", "שם משתמש"],
  password: ["סיסמה"],
  name: ["שם"],
  role: ["תפקיד"],
  phone: ["טלפון"],
  employer: ["מעסיק", "חברה"],
  contact_name: ["איש קשר"],
  first_name: ["שם", "שם פרטי", "פרטי"],
  last_name: ["משפחה", "שם משפחה"],
  national_id: ["ת.ז", "תז", "תעודת זהות", "מספר זהות", "מס' זהות", "זהות"],
  address: ["כתובת", "כתובת מלאה"],
  birth_date: ["תאריך לידה", "לידה"],
  issue_date: ["תאריך הנפקה", "הנפקה", "תאריך הנפקת תעודה"],
  product: ["מוצר", "סוג"],
  range: ["טווח", "טווח צבירה", "שכר"],
  balance_fee: ["מצבירה"],
  deposit_fee: ["מהפקדה"],
  validity: ["תוקף"],
  priority: ["עדיפות"],
  track: ["מסלול"],
  agreement_number: ["מס' הסכם", "מספר הסכם", "הסכם", "קוד הסכם"],
  "discounts.year1": ["שנה א׳", "שנה א", "א׳", "א", "year1", "year 1"],
  "discounts.year2": ["שנה ב׳", "שנה ב", "ב׳", "ב", "year2", "year 2"],
  "discounts.year3": ["שנה ג׳", "שנה ג", "ג׳", "ג", "year3", "year 3"],
  "discounts.year4": ["שנה ד׳", "שנה ד", "ד׳", "ד", "year4", "year 4"],
  "discounts.year5to6": ["שנים ה׳-ו׳", "שנים ה-ו", "ה׳-ו׳", "ה-ו", "שנה ה", "שנה ו", "year5to6"],
  period: ["תקופה"],
  discount: ["הנחה"],
  bank: ["בנק"],
  branch: ["סניף"],
  account: ["חשבון"],
  iban: ["IBAN"],
  department: ["מחלקה", "מוקד", "תחום", "ענף", "חטיבה", "יחידה"],
  hours: ["שעות פעילות"],
  customer_phone: ["מוקד לקוחות"],
  type: ["סוג", "מוצר", "סוג מוצר", "קופה", "שם קופה", "שם מוסד", "שם המוסד", "תיאור", "מסלול", "שם מסלול", "ענף", "קטגוריה"],
  code: ["קוד", "קוד מוסד", "מספר מוסד", "מס' מוסד", "קוד קופה", "מספר קופה", "מס' קופה", "קוד באוצר", "מספר באוצר", "קוד מסלקה", "מספר מסלקה", "מזהה"],
  aliases: ["אליאסים", "כינויים"],
  agent_number: ["מספר סוכן"],
  bank_name: ["בנק", "שם בנק"],
  bank_number: ["מספר בנק", "קוד בנק"],
  entity: ["גורם"],
  contact: ["אמצעי קשר", "איש קשר"]
};

const EXCEL_DEDUPE_KEYS = {
  operational_emails: ["company", "category", "department", "action", "email"],
  email_templates: ["category", "title", "subject"],
  passwords: ["company", "system", "url", "username"],
  supervisors: ["name", "company", "email", "phone"],
  employers: ["employer", "contact_name", "email"],
  clients: ["first_name", "last_name", "national_id"],
  management_fees: ["company", "product", "range", "balance_fee", "deposit_fee", "validity"],
  insurance_discounts: ["company", "product", "agreement_number", "track", "discounts.year1", "discounts.year2", "discounts.year3", "discounts.year4", "discounts.year5to6", "validity"],
  deposit_accounts: ["company", "product", "bank", "branch", "account", "iban", "email"],
  service_centers: ["company", "department", "phone", "email"],
  institution_codes: ["company", "type", "code"],
  links: ["company", "name", "url"],
  agent_numbers: ["company", "product", "agent_number"],
  bank_numbers: ["bank_name", "bank_number"],
  mortgage_release: ["entity", "contact", "type"],
  companies: ["name"]
};

const ICONS = {
  mail: '<svg viewBox="0 0 24 24"><path d="M4 6h16v12H4z"/><path d="m4 7 8 6 8-6"/></svg>',
  file: '<svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  user: '<svg viewBox="0 0 24 24"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>',
  briefcase: '<svg viewBox="0 0 24 24"><path d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1"/><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 12h18"/></svg>',
  percent: '<svg viewBox="0 0 24 24"><path d="m19 5-14 14"/><circle cx="7" cy="7" r="2"/><circle cx="17" cy="17" r="2"/></svg>',
  spark: '<svg viewBox="0 0 24 24"><path d="M12 3 9.5 9.5 3 12l6.5 2.5L12 21l2.5-6.5L21 12l-6.5-2.5z"/></svg>',
  bank: '<svg viewBox="0 0 24 24"><path d="m3 10 9-6 9 6"/><path d="M5 10h14M6 10v8M10 10v8M14 10v8M18 10v8M4 18h16"/></svg>',
  headphones: '<svg viewBox="0 0 24 24"><path d="M4 13a8 8 0 0 1 16 0"/><path d="M4 13v4a2 2 0 0 0 2 2h1v-7H6a2 2 0 0 0-2 2ZM20 13v4a2 2 0 0 1-2 2h-1v-7h1a2 2 0 0 1 2 2Z"/></svg>',
  hash: '<svg viewBox="0 0 24 24"><path d="M9 3 7 21M17 3l-2 18M4 9h17M3 15h17"/></svg>',
  link: '<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1"/></svg>',
  id: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.7-1.4 1.7-2 3-2s2.3.6 3 2M14 10h4M14 14h4"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>',
  building: '<svg viewBox="0 0 24 24"><path d="M4 21V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v16"/><path d="M17 9h1a2 2 0 0 1 2 2v10"/><path d="M8 7h5M8 11h5M8 15h5M3 21h18"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
  send: '<svg viewBox="0 0 24 24"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>',
  upload: '<svg viewBox="0 0 24 24"><path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 21h14"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  open: '<svg viewBox="0 0 24 24"><path d="M14 3h7v7"/><path d="M21 3 10 14"/><path d="M19 14v6H4V5h6"/></svg>',
  table: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M9 10v9M15 10v9"/></svg>',
  cards: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="8" height="7" rx="1"/><rect x="13" y="4" width="8" height="7" rx="1"/><rect x="3" y="13" width="8" height="7" rx="1"/><rect x="13" y="13" width="8" height="7" rx="1"/></svg>',
  print: '<svg viewBox="0 0 24 24"><path d="M7 8V3h10v5"/><rect x="5" y="14" width="14" height="7"/><path d="M5 18H3v-7h18v7h-2"/></svg>'
  ,
  settings: '<svg viewBox="0 0 24 24"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 0 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 0 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.6V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.6h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 0 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6 1h.1a2 2 0 0 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>'
};
