import { vi } from "@/lib/i18n/vi";

import fs from "node:fs";
import path from "node:path";

const ROOTS = [
  "src/app/layout.tsx",
  "src/app/(auth)",
  "src/app/(main)/unauthorized",
  "src/app/(main)/dashboard/_components",
  "src/app/(main)/dashboard/layout.tsx",
  "src/app/(main)/dashboard/stock",
  "src/app/(main)/dashboard/items",
  "src/app/(main)/dashboard/boms",
  "src/app/(main)/dashboard/vouchers",
  "src/app/(main)/dashboard/reports",
  "src/app/(main)/dashboard/admin",
  "src/app/(main)/dashboard/account",
  "src/components/language-switcher.tsx",
  "src/config/app-config.ts",
  "src/lib/wms",
  "src/lib/i18n/provider.tsx",
  "src/navigation",
  "src/server/actions",
  "src/server/lib",
];

const EXEMPT = new Set(["Tiếng Việt"]);
const VIETNAMESE =
  /[ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠạẢảẤấẦầẨẩẪẫẬậẮắẰằẲẳẴẵẶặẸẹẺẻẼẽẾếỀềỂểỄễỆệỈỉỊịỌọỎỏỐốỒồỔổỖỗỘộỚớỜờỞởỠỡỢợỤụỦủỨứỪừỬửỮữỰựỲỳỴỵỶỷỸỹ]/;
// Biome rewrites strings that contain double quotes to single quotes, so both quote styles are read
const STRING_LITERAL = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g;
const T_CALL = /\bt\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/g;

function walk(target: string, out: string[]) {
  if (!fs.existsSync(target)) return;
  if (fs.statSync(target).isFile()) {
    if (/\.(ts|tsx)$/.test(target)) out.push(target);
    return;
  }
  for (const entry of fs.readdirSync(target)) walk(path.join(target, entry), out);
}

const files: string[] = [];
for (const root of ROOTS) walk(root, files);

// Undo the backslash escapes of either quote style
const unescapeQuotes = (raw: string) => raw.replace(/\\(.)/g, "$1");

const tKeys = new Map<string, string>(); // key passed to t() -> first file using it
const used = new Set<string>(); // t() keys plus any literal that matches a key in vi.ts
const vietnameseInCode = new Map<string, string>(); // Vietnamese literal -> first file

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  for (const m of text.matchAll(STRING_LITERAL)) {
    const value = unescapeQuotes(m[1] ?? m[2] ?? "");
    if (value in vi) used.add(value);
    else if (VIETNAMESE.test(value) && !EXEMPT.has(value) && !vietnameseInCode.has(value)) {
      vietnameseInCode.set(value, file);
    }
  }
  for (const m of text.matchAll(T_CALL)) {
    const key = unescapeQuotes(m[1] ?? m[2] ?? "");
    if (!tKeys.has(key)) tKeys.set(key, file);
    used.add(key);
  }
}

if (process.argv.includes("--list")) {
  console.log(JSON.stringify([...used], null, 1));
  process.exit(0);
}

// A translation must keep exactly the same {placeholders} as its English key
const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)]
    .map((m) => m[1])
    .sort()
    .join(",");
const mismatched = Object.entries(vi).filter(([key, value]) => placeholders(key) !== placeholders(value));

const missing = [...tKeys.keys()].filter((key) => !(key in vi));
const unused = Object.keys(vi).filter((key) => !used.has(key));
console.log(`${used.size} keys in code, ${Object.keys(vi).length} Vietnamese translations.`);
if (unused.length) console.warn(`${unused.length} unused translation(s):\n ${unused.join("\n  ")}`);

let failed = false;
if (missing.length) {
  console.error(`${missing.length} missing Vietnamese translation(s) in src/lib/i18n/vi.ts:\n ${missing.join("\n  ")}`);
  failed = true;
}
if (vietnameseInCode.size) {
  console.error(
    `${vietnameseInCode.size} Vietnamese literal(s) in code:\n ${[...vietnameseInCode.entries()]
      .map(([literal, file]) => `${literal} (in ${file})`)
      .join("\n  ")}`,
  );
  failed = true;
}
if (mismatched.length) {
  console.error(
    `${mismatched.length} mismatched translation(s):\n ${mismatched.map(([key, value]) => `${key} -> ${value}`).join("\n  ")}`,
  );
  failed = true;
}
if (failed) process.exit(1);
console.log("All translations are present and correct.");
