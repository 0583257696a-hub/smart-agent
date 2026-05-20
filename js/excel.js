function exportAllData() {
  if (window.XLSX) {
    exportAllDataToExcel();
    return;
  }
  downloadJson({ exported_at: new Date().toISOString(), modules: DB }, "agent-operations-platform-data.json");
  toast("הקובץ יוצא");
}

function exportSelectedRows() {
  const rows = currentModule === "management_fees" ? getFeeRows().map(item => item.row) : getCurrentRows().map(item => item.row);
  downloadJson(rows, `${currentModule}-selected.json`);
}

function exportAllDataToExcel() {
  const workbook = XLSX.utils.book_new();
  Object.entries(MODULES)
    .filter(([, config]) => !config.hidden)
    .forEach(([moduleKey, config]) => {
      const rows = DB[moduleKey] || [];
      const fields = config.fields.filter(field => field !== "source");
      const headers = fields.map(field => FIELD_LABELS[field] || field);
      const data = [headers, ...rows.map(row => fields.map(field => getFieldValue(row, field) || ""))];
      const sheet = XLSX.utils.aoa_to_sheet(data);
      sheet["!cols"] = headers.map(header => ({ wch: Math.min(Math.max(String(header).length + 8, 12), 32) }));
      XLSX.utils.book_append_sheet(workbook, sheet, (EXCEL_SHEETS[moduleKey]?.[0] || config.label).slice(0, 31));
    });
  XLSX.writeFile(workbook, "agent-operations-platform-data.xlsx");
  toast("קובץ Excel יוצא");
}

function downloadJson(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
async function importExcelWorkbook(file) {
  if (!window.XLSX) throw new Error("XLSX library is not loaded");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  let imported = 0;
  let skipped = 0;

  workbook.SheetNames.forEach(sheetName => {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "", raw: false });
    const moduleKey = moduleKeyFromSheetName(sheetName) || inferModuleKeyFromRows(rows, workbook.SheetNames.length);
    if (!moduleKey) return;
    const config = MODULES[moduleKey];
    const mappedRows = rows
      .map(row => mapExcelRow(row, config.fields))
      .filter(row => hasImportableValue(row, config.fields));
    const importRows = normalizeModuleRows(moduleKey, mappedRows);

    importRows.forEach(row => {
      if (moduleKey === "companies" && !row.name && row.company) row.name = row.company;
      if (!row.source) row.source = `Excel: ${file.name}`;
      if (!isDuplicateRow(DB[moduleKey] || [], row, moduleKey, config.fields)) {
        DB[moduleKey].push(row);
        imported += 1;
      } else {
        skipped += 1;
      }
      ensureCompanyRecord(row.company || row.employer || row.name);
    });

    if (importRows.length) saveDataToLocalStorage(moduleKey);
  });

  saveDataToLocalStorage("companies");
  return { imported, skipped };
}

function moduleKeyFromSheetName(sheetName) {
  const normalized = normalizeText(sheetName);
  return Object.keys(EXCEL_SHEETS).find(key =>
    EXCEL_SHEETS[key].some(alias => normalizeText(alias) === normalized)
  );
}

function inferModuleKeyFromRows(rows, sheetCount) {
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  if (!headers.length) return sheetCount === 1 ? currentModule : "";
  const scoredModules = Object.keys(MODULES)
    .filter(key => !MODULES[key].hidden)
    .map(key => ({ key, score: scoreHeadersForModule(headers, MODULES[key].fields) }))
    .sort((a, b) => b.score - a.score);
  const best = scoredModules[0];
  if (best && best.score >= 2) return best.key;
  return sheetCount === 1 ? currentModule : "";
}

function scoreHeadersForModule(headers, fields) {
  const matchedFields = new Set();
  headers.forEach(header => {
    const field = fieldFromHeader(header, fields);
    if (field) matchedFields.add(field);
  });
  return matchedFields.size;
}

function mapExcelRow(row, fields) {
  const mapped = {};
  Object.entries(row).forEach(([header, value]) => {
    const field = fieldFromHeader(header, fields);
    if (field) setFieldValue(mapped, field, normalizeExcelValue(value));
  });
  fields.forEach(field => {
    if (getFieldValue(mapped, field) === undefined) setFieldValue(mapped, field, "");
  });
  return mapped;
}

function fieldFromHeader(header, fields) {
  const normalizedHeader = normalizeText(header);
  return fields.find(field => {
    const aliases = [field, FIELD_LABELS[field], ...(EXCEL_HEADER_ALIASES[field] || [])].filter(Boolean);
    return aliases.some(alias => {
      const normalizedAlias = normalizeText(alias);
      return normalizedAlias === normalizedHeader || (normalizedAlias.length > 2 && normalizedHeader.includes(normalizedAlias));
    });
  });
}
function normalizeExcelValue(value) {
  return decodeEscapedNewlines(String(value ?? "").trim());
}

function hasImportableValue(row, fields) {
  return fields.some(field => field !== "source" && String(getFieldValue(row, field) || "").trim());
}

