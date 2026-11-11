// Render the directory the way the browser parses HTML, and fail if a card
// title includes logo markup (initials plus a stray quote) instead of the name.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Script, createContext } from "node:vm";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const IMG_ATTRS = new Set(["class", "src", "alt", "width", "height", "loading", "onerror", "data-initials"]);

let failed = 0;
function fail(msg) {
  failed++;
  console.error("FAIL", msg);
}

function decode(s) {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (_, e) => {
    if (e === "amp") return "&";
    if (e === "lt") return "<";
    if (e === "gt") return ">";
    if (e === "quot") return '"';
    if (e === "apos") return "'";
    const cp = e[1] === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return String.fromCodePoint(cp);
  });
}

function readStartTag(html, i) {
  let j = i + 1;
  let tag = "";
  while (j < html.length && /[A-Za-z0-9:-]/.test(html[j])) tag += html[j++];
  tag = tag.toLowerCase();
  const attrs = {};
  let selfClosing = false;
  while (j < html.length) {
    const start = j;
    const c = html[j];
    if (c === " " || c === "\n" || c === "\t" || c === "\r") { j++; continue; }
    if (c === "/") { selfClosing = true; j++; continue; }
    if (c === ">") return { tag, attrs, selfClosing, next: j + 1 };
    // HTML5 attribute-name state appends " and ', it does not start a value.
    // That is what made onerror="...class=" leak the initials into the title.
    let name = "";
    while (j < html.length && !" \n\t\r=/>".includes(html[j])) name += html[j++];
    name = name.toLowerCase();
    while (" \n\t\r".includes(html[j] || "")) j++;
    let value = "";
    if (html[j] === "=") {
      j++;
      while (" \n\t\r".includes(html[j] || "")) j++;
      if (html[j] === '"' || html[j] === "'") {
        const q = html[j++];
        while (j < html.length && html[j] !== q) value += html[j++];
        if (html[j] === q) j++;
      } else {
        while (j < html.length && !" \n\t\r>/".includes(html[j])) value += html[j++];
      }
      if (name) attrs[name] = decode(value);
    } else if (name) {
      attrs[name] = "";
    }
    if (j === start) throw new Error("parser stuck near " + JSON.stringify(html.slice(j, j + 40)));
  }
  throw new Error("unterminated <" + tag + ">");
}

function parseHTML(html) {
  const root = { tag: "#root", attrs: {}, children: [] };
  const stack = [root];
  let i = 0;
  while (i < html.length) {
    if (html[i] !== "<") {
      const next = html.indexOf("<", i);
      const raw = html.slice(i, next === -1 ? html.length : next);
      i = next === -1 ? html.length : next;
      if (raw) stack.at(-1).children.push({ tag: "#text", text: decode(raw), attrs: {}, children: [] });
      continue;
    }
    if (html.startsWith("</", i)) {
      const end = html.indexOf(">", i);
      const tag = html.slice(i + 2, end).trim().toLowerCase();
      i = end + 1;
      for (let s = stack.length - 1; s > 0; s--) {
        if (stack[s].tag === tag) { stack.length = s; break; }
      }
      continue;
    }
    const tok = readStartTag(html, i);
    i = tok.next;
    const node = { tag: tok.tag, attrs: tok.attrs, children: [] };
    stack.at(-1).children.push(node);
    if (!tok.selfClosing && !VOID.has(tok.tag)) stack.push(node);
  }
  return root;
}

function classes(node) {
  return (node.attrs?.class || node.className || "").split(/\s+/).filter(Boolean);
}
function isLogo(node) {
  return (node.tag === "img" || node.tag === "span") && classes(node).includes("logo");
}
function textContent(node) {
  if (!node) return "";
  if (node.tag === "#text") return node.text;
  if (node.textContent) return node.textContent;
  return (node.children || []).map(textContent).join("");
}
function visibleText(node) {
  if (!node || node.tag === "#text") return node?.text || "";
  if (isLogo(node)) return "";
  return (node.children || []).map(visibleText).join("");
}
function findFirst(node, pred) {
  if (pred(node)) return node;
  for (const child of node.children || []) {
    const hit = findFirst(child, pred);
    if (hit) return hit;
  }
  return null;
}
function walk(node, pred, out = []) {
  if (pred(node)) out.push(node);
  for (const child of node.children || []) walk(child, pred, out);
  return out;
}
function logosIn(node) {
  const out = [];
  if (isLogo(node)) { out.push(node); return out; }
  for (const child of node.children || []) out.push(...logosIn(child));
  return out;
}

function expectedInitials(name) {
  return name.replace(/[^\p{L}\p{N} ]/gu, "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}
function slug(s) {
  return s.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function loadApp() {
  const elements = {};
  const make = () => ({ innerHTML: "", value: "", hidden: true, onclick: null, oninput: null, classList: { toggle() {} }, scrollIntoView() {} });
  for (const id of ["#theme", "#cats", "#q", "#list", "#empty"]) elements[id] = make();
  const document = {
    documentElement: { dataset: {} },
    querySelector: sel => elements[sel] || null,
    querySelectorAll: () => [],
    getElementById: () => null,
  };
  const sandbox = { document, localStorage: {}, location: { hash: "" }, console };
  const src = readFileSync(join(root, "data.js"), "utf8") + "\n" + readFileSync(join(root, "app.js"), "utf8") + `
this.__api = {
  items: ITEMS,
  libs: LIB_TREE.nodes,
  categories: CATEGORIES,
  render,
  logoHTML,
  esc,
  clickCat(c) {
    document.querySelector("#cats").onclick({ target: { closest: () => ({ dataset: { c } }) } });
  },
  setQuery(q) {
    const input = document.querySelector("#q");
    input.value = q;
    input.oninput();
  },
  html: () => document.querySelector("#list").innerHTML,
  emptyHidden: () => document.querySelector("#empty").hidden,
};
`;
  new Script(src, { filename: "app.js" }).runInContext(createContext(sandbox));
  return sandbox.__api;
}

function titleNode(article) {
  return findFirst(article, n => n.tag === "h3")
    || findFirst(article, n => n.tag === "a" || classes(n).includes("lib-name"));
}

function runFallback(attrs) {
  let result = null;
  const document = {
    createElement() {
      return { tag: "span", className: "", attrs: {}, textContent: "", children: [], setAttribute(k, v) { this.attrs[k] = v; } };
    },
  };
  const img = {
    getAttribute: k => Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null,
    set outerHTML(html) { result = parseHTML(html).children[0] || null; },
    replaceWith(node) { result = node; },
  };
  new Function("document", attrs.onerror).call(img, document);
  return result;
}

function checkCard(article, entry, label) {
  const title = titleNode(article);
  if (!title) { fail(`${label}: no title element`); return; }
  const shown = visibleText(title);
  if (shown !== entry.name) fail(`${label}: title ${JSON.stringify(shown)} !== ${JSON.stringify(entry.name)}`);
  const logos = logosIn(title);
  if (logos.length !== 1) { fail(`${label}: expected 1 logo, found ${logos.length}`); return; }
  const logo = logos[0];
  const letters = expectedInitials(entry.name);
  if (!entry.logo) {
    if (logo.tag !== "span") fail(`${label}: missing initials placeholder`);
    if (!classes(logo).includes("ph")) fail(`${label}: placeholder missing ph class`);
    if (logo.attrs["aria-hidden"] !== "true") fail(`${label}: placeholder not aria-hidden`);
    if (textContent(logo) !== letters) fail(`${label}: initials ${JSON.stringify(textContent(logo))} !== ${JSON.stringify(letters)}`);
    return;
  }
  if (logo.tag !== "img") { fail(`${label}: expected an img logo`); return; }
  for (const key of Object.keys(logo.attrs)) {
    if (!IMG_ATTRS.has(key)) fail(`${label}: unexpected img attribute ${JSON.stringify(key)}`);
  }
  if (logo.attrs.src !== `assets/logos/${entry.logo}.png`) fail(`${label}: src ${logo.attrs.src}`);
  if (logo.attrs.alt !== "") fail(`${label}: alt should stay empty`);
  if (!existsSync(join(root, "assets/logos", `${entry.logo}.png`))) fail(`${label}: missing file assets/logos/${entry.logo}.png`);
  let fallback;
  try { fallback = runFallback(logo.attrs); }
  catch (err) { fail(`${label}: logo onerror threw ${err.message}`); return; }
  const fbClass = classes(fallback || {});
  if (!fallback || fallback.tag !== "span" || !fbClass.includes("logo") || !fbClass.includes("ph")) fail(`${label}: broken image did not become an initials placeholder`);
  const hidden = fallback.attrs?.["aria-hidden"] || "";
  if (hidden !== "true") fail(`${label}: fallback not aria-hidden`);
  if (textContent(fallback) !== letters) fail(`${label}: fallback initials ${JSON.stringify(textContent(fallback))} !== ${JSON.stringify(letters)}`);
}

function articlesById(html) {
  const tree = parseHTML(html);
  const articles = walk(tree, n => n.tag === "article");
  const byId = new Map();
  for (const article of articles) {
    const id = article.attrs.id || "";
    if (byId.has(id)) fail(`duplicate article id ${id}`);
    byId.set(id, article);
  }
  return { tree, articles, byId };
}

function checkAll(api, { items, libs, label }) {
  const html = api.html();
  const leak = html.indexOf(`'">`);
  if (leak !== -1) fail(`${label}: leaked '"> markup near ${JSON.stringify(html.slice(Math.max(0, leak - 30), leak + 30))}`);
  const { articles, byId } = articlesById(html);
  const expectIds = [
    ...items.map(e => slug(e.name)),
    ...libs.map(n => `lib-${n.id}`),
  ];
  if (articles.length !== expectIds.length) fail(`${label}: ${articles.length} cards, expected ${expectIds.length}`);
  for (const entry of items) {
    const article = byId.get(slug(entry.name));
    if (!article) { fail(`${label}: missing card ${entry.name}`); continue; }
    checkCard(article, entry, `${label} / ${entry.name}`);
  }
  for (const node of libs) {
    const article = byId.get(`lib-${node.id}`);
    if (!article) { fail(`${label}: missing library ${node.name}`); continue; }
    checkCard(article, { name: node.name, logo: node.logo || "" }, `${label} / ${node.name}`);
  }
  return { articles, byId };
}

const api = loadApp();
const live = api.items;
const libs = api.libs;

checkAll(api, { items: live, libs, label: "all" });

const headings = walk(parseHTML(api.html()), n => n.tag === "h2").map(n => visibleText(n));
for (const name of Object.values(api.categories)) {
  if (!headings.includes(name)) fail(`missing section heading ${JSON.stringify(name)}`);
}
if (!headings.includes("Libraries")) fail("missing Libraries heading");

api.clickCat("wallets");
checkAll(api, { items: live.filter(e => e.cat === "wallets"), libs: [], label: "wallets filter" });

api.clickCat("payments");
checkAll(api, { items: live.filter(e => e.cat === "payments"), libs: [], label: "payments filter" });

api.clickCat("libraries");
checkAll(api, { items: [], libs, label: "libraries filter" });

function entryHit(e, q) {
  return (e.name + " " + e.desc + " " + e.url + " " + Object.values(e.social || {}).join(" ")).toLowerCase().includes(q);
}
function libHit(n, q) {
  return (n.name + " " + (n.note || "")).toLowerCase().includes(q);
}

api.clickCat("all");
api.setQuery("wally");
checkAll(api, { items: live.filter(e => entryHit(e, "wally")), libs: libs.filter(n => libHit(n, "wally")), label: "search wally" });

api.setQuery("FULL NODE");
checkAll(api, { items: live.filter(e => entryHit(e, "full node")), libs: libs.filter(n => libHit(n, "full node")), label: "search FULL NODE" });

api.clickCat("wallets");
api.setQuery("spaceport");
checkAll(api, { items: live.filter(e => e.cat === "wallets" && entryHit(e, "spaceport")), libs: [], label: "wallets + spaceport" });

api.clickCat("all");
api.setQuery("zzzz-no-such-project");
{
  const html = api.html();
  const { articles } = articlesById(html);
  if (articles.length !== 0) fail(`empty search rendered ${articles.length} cards`);
  if (api.emptyHidden() !== false) fail("empty search should show the no-matches message");
}
api.setQuery("");
if (api.emptyHidden() !== true) fail("clearing search should hide the no-matches message");
checkAll(api, { items: live, libs, label: "search cleared" });

const wally = articlesById(api.html()).byId.get(slug("Wally Wallet"));
const wallyHrefs = walk(wally, n => n.tag === "a").map(a => a.attrs.href);
if (!wallyHrefs.includes("https://apps.apple.com/us/app/wally-nexa-wallet/id6469619075")) fail("Wally App Store link missing");
if (!wallyHrefs.includes("https://play.google.com/store/apps/details?id=info.bitcoinunlimited.www.wally")) fail("Wally Google Play link missing");
if (wallyHrefs.includes("https://otoplo.com/download")) fail("Wally should not show Otoplo's download");
if (!wallyHrefs.some(h => h && h.includes("t.me/wallywalletorg"))) fail("Wally Telegram link missing");

const quoted = `O'Brien "Q" & Co`;
for (const logo of ["wally", ""]) {
  const fragment = `<h3>${api.logoHTML(quoted, logo)}${api.esc(quoted)}</h3>`;
  const title = parseHTML(fragment).children[0];
  checkCard({ tag: "article", attrs: {}, children: [title] }, { name: quoted, logo }, `quoted name logo=${logo || "none"}`);
}

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log(`ok ${live.length} entries, ${libs.length} libraries`);
