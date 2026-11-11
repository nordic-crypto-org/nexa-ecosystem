import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const LEAK = /['"]\s*>/;

function titleText(el) {
  const clone = el.cloneNode(true);
  for (const logo of clone.querySelectorAll(".logo")) logo.remove();
  return clone.textContent.replace(/\s+/g, " ").trim();
}

function loadDirectory() {
  const html = readFileSync(join(root, "index.html"), "utf8")
    .replace(/<script src="data\.js[^"]*"><\/script>/, "")
    .replace(/<script src="app\.js[^"]*"><\/script>/, "");
  const virtualConsole = new VirtualConsole();
  virtualConsole.sendTo(console, { omitJSDOMErrors: true });
  const dom = new JSDOM(html, {
    url: "https://nexa.nordiccrypto.no/",
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      window.matchMedia = query => ({
        matches: false,
        media: query,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() { return false; }
      });
    }
  });
  const dataJs = readFileSync(join(root, "data.js"), "utf8");
  const appJs = readFileSync(join(root, "app.js"), "utf8");
  dom.window.eval(
    dataJs + "\n" + appJs + "\n" +
    "window.ITEMS=ITEMS;window.slug=slug;window.LIB_TREE=typeof LIB_TREE!=='undefined'?LIB_TREE:null;"
  );
  return dom;
}

function assertCleanTitle(el, expected, label) {
  assert.ok(el, `missing title element for ${label}`);
  const text = titleText(el);
  assert.equal(text, expected, `${label}: title should be the entry name`);
  // Attribute quotes in innerHTML are fine; the bug leaked `'">` into visible text.
  assert.doesNotMatch(el.textContent, LEAK, `${label}: textContent leaked markup`);
  assert.doesNotMatch(text, LEAK, `${label}: visible title leaked markup`);
}

function assertAllCards(window) {
  const { document, ITEMS, slug, LIB_TREE } = window;
  assert.ok(ITEMS.length, "expected live directory entries");
  for (const item of ITEMS) {
    const article = document.getElementById(slug(item.name));
    assert.ok(article, `missing card for ${item.name}`);
    assertCleanTitle(article.querySelector("h3"), item.name, item.name);
    assert.doesNotMatch(
      article.innerHTML,
      /onerror\s*=\s*["'][^"']*outerHTML/i,
      `${item.name}: logo fallback must not be HTML inside onerror`
    );
    const logos = article.querySelectorAll("h3 .logo");
    assert.equal(logos.length, 1, `${item.name}: expected exactly one logo or placeholder in the title`);
  }
  if (LIB_TREE) {
    for (const node of LIB_TREE.nodes) {
      const article = document.getElementById(`lib-${node.id}`);
      assert.ok(article, `missing library card for ${node.name}`);
      const nameHost = article.querySelector("a") || article.querySelector(".lib-name");
      assertCleanTitle(nameHost, node.name, `library:${node.name}`);
    }
  }
}

test("directory card titles match entry names and do not leak markup", () => {
  const dom = loadDirectory();
  assertAllCards(dom.window);
  const { document } = dom.window;
  for (const img of [...document.querySelectorAll("img.logo")]) {
    img.dispatchEvent(new dom.window.Event("error"));
  }
  assertAllCards(dom.window);
  for (const article of document.querySelectorAll("#list article.card")) {
    assert.doesNotMatch(
      article.textContent,
      LEAK,
      `${article.id || article.textContent.slice(0, 40)} leaked markup after logo error`
    );
  }
  const h3s = [...document.querySelectorAll("#list article.card h3")];
  assert.equal(h3s.length, dom.window.ITEMS.length, "every live entry should render one h3");
  dom.window.close();
});
