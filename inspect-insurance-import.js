const XLSX = require("xlsx");

const file = "C:\\Users\\Lenovo\\Downloads\\מרכז_תפעול_תבנית_ייבוא_ריקה (3).xlsx";
const sheet = XLSX.readFile(file).Sheets["הנחות ביטוח"];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false })
  .filter(row => Object.values(row).some(value => String(value || "").trim()));

const groups = new Map();
for (const row of rows) {
  const key = [row["חברה / יצרן"], row["מוצר"], row["מסלול"], row["מס' הסכם"], row["תוקף"]].join("|");
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(row);
}

const duplicates = [...groups.entries()].filter(([, value]) => value.length > 1);
console.log({ rows: rows.length, groups: groups.size, duplicateGroups: duplicates.length });
for (const [key, values] of duplicates.slice(0, 20)) {
  console.log("---", key, "count", values.length);
  for (const row of values) {
    console.log([
      row["שנה א׳"],
      row["שנה ב׳"],
      row["שנה ג׳"],
      row["שנה ד׳"],
      row["שנים ה׳-ו׳"],
      row["הערות"],
      row["תנאים"]
    ].join(" / "));
  }
}
