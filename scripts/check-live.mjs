import { readFileSync, writeFileSync } from "node:fs";

const path = "data.js";
let src = readFileSync(path, "utf8");
const entries = new Function(`${src}\nreturn ENTRIES;`)();

async function up(url) {
  if (!url || !/^https:\/\//i.test(url)) return false;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, { redirect: "follow", signal: ctrl.signal, headers: { "user-agent": "nexa-ecosystem-livecheck" } });
    return res.status === 200;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

for (const entry of entries) {
  const meta = entry.at(-1);
  if (!meta || typeof meta !== "object" || meta.live !== false) continue;
  const url = entry[3];
  if (!(await up(url))) {
    console.log(`down ${url || "(no url)"}`);
    continue;
  }
  const esc = String(url).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const next = src.replace(new RegExp(`("${esc}"[\\s\\S]{0,600}?\\blive:)false`), "$1true");
  if (next === src) {
    console.error(`could not flip ${url}`);
    process.exit(1);
  }
  src = next;
  console.log(`live ${url}`);
}

if (src !== readFileSync(path, "utf8")) writeFileSync(path, src);
