const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pcvbmmmvvnqjquhnklsj.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_4Uxji32DHeKYakczT98yRA_S7Sf6V8d";

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(source, target) {
  if (!fs.existsSync(source)) return;
  fs.rmSync(target, { recursive: true, force: true });
  copyDirContents(source, target);
}

function copyDirContents(source, target) {
  ensureDir(target);
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDirContents(sourcePath, targetPath);
    } else if (entry.isFile()) {
      copyFile(sourcePath, targetPath);
    }
  }
}

function copyFile(source, target) {
  if (!fs.existsSync(source)) return;
  ensureDir(path.dirname(target));
  fs.copyFileSync(source, target);
}

function writeSupabaseEnv() {
  const templatePath = path.join(root, "js", "supabase-env.js");
  const targetPath = path.join(publicDir, "js", "supabase-env.js");
  let content = fs.readFileSync(templatePath, "utf8");
  content = content
    .replace("__SUPABASE_URL__", supabaseUrl)
    .replace("__SUPABASE_PUBLISHABLE_KEY__", supabaseKey);
  fs.writeFileSync(targetPath, content);
}

ensureDir(publicDir);
copyDir(path.join(root, "data"), path.join(publicDir, "data"));
copyDir(path.join(root, "assets"), path.join(publicDir, "assets"));
copyDir(path.join(root, "js"), path.join(publicDir, "js"));
writeSupabaseEnv();

[
  "import-template.xlsx",
  "מרכז_תפעול_ייבוא_נתונים.xlsx",
  "מרכז_תפעול_תבנית_ייבוא_ריקה.xlsx"
].forEach(file => copyFile(path.join(root, file), path.join(publicDir, file)));

console.log("Synced static app assets into public/");
