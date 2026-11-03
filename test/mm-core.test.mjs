import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  EMOJI_CATEGORIES,
  EXTERNAL_SHORTEN_MAX_LEN,
  SHARE_HASH_PREFIX,
  buildDownload,
  buildShareHash,
  buildShareLongUrl,
  captureState,
  cloneData,
  countNodes,
  createHistory,
  createLocalStore,
  createRecentIconsStore,
  createShareLinks,
  decodeSharePayload,
  encodeSharePayload,
  parseShareIdFromSearch,
  clearShareVisit,
  markShareVisit,
  takeShareExit,
  SHARE_VISIT_KEY,
  searchEmojis,
  formatListLabel,
  nodeAtPath,
  FONT_KEY,
  FONT_PRESETS,
  MODE_KEY,
  THEME_KEY,
  THEME_PRESETS,
  buildLevelStyles,
  fontStacksFor,
  normalizeAppMode,
  normalizeDownloadName,
  normalizeFontId,
  normalizeThemeId,
  parseShareHash,
  preferExternalShorten,
  parseMarkdown,
  shortenWithBuiltin,
  shortenWithExternal,
  parseImportFile,
  parseJsonTree,
  parseOpml,
  parseInteractiveHtml,
  detectImportFormat,
  isImportableFile,
  looksLikeOutlinePaste,
  parseOutlinePaste,
  subtreeToOutline,
  readAppMode,
  readFontId,
  readThemeId,
  resolveTheme,
  parseTitleSubtitle,
  pathToNode,
  shouldConfirmOverwrite,
  splitLeadingIcon,
  toMarkdown,
  writeAppMode,
  writeFontId,
  writeThemeId,
} from "../public/mm-core.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, "..", "public");

test("parseMarkdown builds tree from headings and indented lists", () => {
  const tree = parseMarkdown(`# Root
## Sub

- A
  - A1
- B
`);
  assert.equal(tree.title, "Root");
  assert.equal(tree.desc, "Sub");
  assert.deepEqual(
    tree.children.map((c) => c.title),
    ["A", "B"],
  );
  assert.deepEqual(
    tree.children[0].children.map((c) => c.title),
    ["A1"],
  );
});

test("toMarkdown round-trips with parseMarkdown", () => {
  const source = `# 人机协同
## 副标题

- 经验
  - 阶段
    - 副驾驶
- 心得
`;
  const again = toMarkdown(parseMarkdown(source));
  const tree = parseMarkdown(again);
  assert.equal(tree.title, "人机协同");
  assert.equal(tree.desc, "副标题");
  assert.equal(tree.children.length, 2);
  assert.equal(tree.children[0].children[0].children[0].title, "副驾驶");
});

test("parseTitleSubtitle still reads legacy ::", () => {
  assert.deepEqual(parseTitleSubtitle("主驾驶 :: 人审关键"), { title: "主驾驶", desc: "人审关键" });
  assert.deepEqual(parseTitleSubtitle("只有标题"), { title: "只有标题", desc: "" });
  assert.deepEqual(parseTitleSubtitle("a :: b :: c"), { title: "a", desc: "b :: c" });
  assert.equal(formatListLabel({ title: "主驾驶", desc: "人审关键" }), "主驾驶");
});

test("list item desc round-trips as indented paragraph", () => {
  const source = `# Root
## Root sub

- 主驾驶
  人审关键
  - 子项
    说明
- 普通
`;
  const tree = parseMarkdown(source);
  assert.equal(tree.desc, "Root sub");
  assert.equal(tree.children[0].title, "主驾驶");
  assert.equal(tree.children[0].desc, "人审关键");
  assert.equal(tree.children[0].children[0].desc, "说明");
  assert.equal(tree.children[1].desc, undefined);

  const md = toMarkdown(tree);
  assert.match(md, /^- 主驾驶$/m);
  assert.match(md, /^  人审关键$/m);
  assert.match(md, /^    说明$/m);
  assert.doesNotMatch(md, /::/);
  assert.doesNotMatch(md, /^\s*\|/m);

  const again = parseMarkdown(md);
  assert.equal(again.children[0].desc, "人审关键");
  assert.equal(again.children[0].children[0].title, "子项");
  assert.equal(again.children[0].children[0].desc, "说明");
});

test("legacy :: list labels still import, export as paragraph", () => {
  const tree = parseMarkdown(`# Root

- 主驾驶 :: 人审关键
  - 子项 :: 说明
`);
  assert.equal(tree.children[0].title, "主驾驶");
  assert.equal(tree.children[0].desc, "人审关键");
  assert.equal(tree.children[0].children[0].desc, "说明");
  const md = toMarkdown(tree);
  assert.match(md, /^  人审关键$/m);
  assert.doesNotMatch(md, /::/);
});

test("splitLeadingIcon and icon markdown round-trip", () => {
  assert.deepEqual(splitLeadingIcon("🚀 发射"), { icon: "🚀", title: "发射" });
  assert.deepEqual(splitLeadingIcon("发射"), { icon: "", title: "发射" });
  assert.deepEqual(splitLeadingIcon("🚀"), { icon: "", title: "🚀" });

  const source = `# 🗺️ Root

- 📤 上传
  说明
  - 子项
- 普通
`;
  const tree = parseMarkdown(source);
  assert.equal(tree.icon, "🗺️");
  assert.equal(tree.title, "Root");
  assert.equal(tree.children[0].icon, "📤");
  assert.equal(tree.children[0].title, "上传");
  assert.equal(tree.children[0].desc, "说明");
  assert.equal(formatListLabel(tree.children[0]), "📤 上传");

  const again = parseMarkdown(toMarkdown(tree));
  assert.equal(again.icon, "🗺️");
  assert.equal(again.children[0].icon, "📤");
  assert.equal(again.children[0].desc, "说明");
  assert.equal(again.children[1].icon, undefined);
});

test("createRecentIconsStore keeps newest-first unique list", () => {
  const memory = new Map();
  const storage = {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => memory.set(key, String(value)),
    removeItem: (key) => memory.delete(key),
  };
  const store = createRecentIconsStore(storage, "icons", 3);
  assert.deepEqual(store.push("🚀"), ["🚀"]);
  assert.deepEqual(store.push("🎨"), ["🎨", "🚀"]);
  assert.deepEqual(store.push("🚀"), ["🚀", "🎨"]);
  assert.deepEqual(store.push("📤"), ["📤", "🚀", "🎨"]);
  assert.deepEqual(store.push("⬇️"), ["⬇️", "📤", "🚀"]);
  assert.ok(EMOJI_CATEGORIES.length >= 3);
  assert.ok(EMOJI_CATEGORIES.every((c) => c.id && c.label && c.emojis.length));
  assert.ok(EMOJI_CATEGORIES.some((c) => c.id === "flags"));
  const all = EMOJI_CATEGORIES.flatMap((c) => c.emojis);
  assert.ok(new Set(all).size >= 1500);
  assert.ok(all.includes("💩"));
  assert.ok(all.includes("👑"));
});

test("searchEmojis matches names and category labels", () => {
  assert.ok(searchEmojis("苹果").includes("🍎"));
  assert.ok(searchEmojis("apple").includes("🍎"));
  assert.ok(searchEmojis("食物").includes("🍜"));
  assert.ok(searchEmojis("便便").includes("💩"));
  assert.ok(searchEmojis("poop").includes("💩"));
  assert.ok(searchEmojis("王冠").includes("👑"));
  assert.ok(searchEmojis("crown").includes("👑"));
  assert.deepEqual(searchEmojis("   "), []);
  assert.equal(searchEmojis("zzznomatch").length, 0);
});

test("searchEmojis heart terms hit hearts, not whole symbols category", () => {
  const hearts = searchEmojis("heart");
  assert.ok(hearts.includes("❤️"));
  assert.ok(hearts.includes("💕"));
  assert.ok(!hearts.includes("❌"), "must not dump unrelated symbols");
  assert.ok(hearts.length < 80, `expected heart subset, got ${hearts.length}`);

  const zh = searchEmojis("心");
  assert.ok(zh.includes("❤️"));
  assert.ok(!zh.includes("⚛️"));

  const phrase = searchEmojis("heart emoji");
  assert.ok(phrase.includes("❤️"));
  assert.ok(!phrase.includes("✅"));
});

test("node notes round-trip via blockquotes", () => {
  const source = `# Root
## Root sub

> root note
> line 2

- A
  sub
  > note A
  > more
  - B
    > note B
- C
`;
  const tree = parseMarkdown(source);
  assert.equal(tree.note, "root note\nline 2");
  assert.equal(tree.children[0].desc, "sub");
  assert.equal(tree.children[0].note, "note A\nmore");
  assert.equal(tree.children[0].children[0].note, "note B");
  assert.equal(tree.children[1].note, undefined);

  const md = toMarkdown(tree);
  assert.match(md, /^> root note$/m);
  assert.match(md, /^  sub$/m);
  assert.match(md, /^  > note A$/m);
  const again = parseMarkdown(md);
  assert.equal(again.note, "root note\nline 2");
  assert.equal(again.children[0].desc, "sub");
  assert.equal(again.children[0].note, "note A\nmore");
  assert.equal(again.children[0].children[0].note, "note B");
});

test("app mode persists as view or edit", () => {
  assert.equal(normalizeAppMode("view"), "view");
  assert.equal(normalizeAppMode("edit"), "edit");
  assert.equal(normalizeAppMode("nope"), "edit");
  const memory = new Map();
  const storage = {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => memory.set(key, String(value)),
  };
  assert.equal(readAppMode(storage), "edit");
  assert.equal(writeAppMode("view", storage), true);
  assert.equal(storage.getItem(MODE_KEY), "view");
  assert.equal(readAppMode(storage), "view");
  writeAppMode("edit", storage);
  assert.equal(readAppMode(storage), "edit");
});

test("global font persists and drives level styles", () => {
  assert.equal(normalizeFontId("kai"), "kai");
  assert.equal(normalizeFontId("nope"), "default");
  assert.ok(FONT_PRESETS.some((preset) => preset.id === "hei"));

  const defaults = fontStacksFor("default");
  assert.notEqual(defaults.title, defaults.body);
  const kai = fontStacksFor("kai");
  assert.equal(kai.title, kai.body);
  assert.match(kai.title, /Kaiti/);

  const styles = buildLevelStyles("hei");
  assert.equal(styles.length, 5);
  assert.equal(styles[0].family, styles[4].family);
  assert.match(styles[0].family, /PingFang/);
  assert.equal(styles[0].fill, "var(--map-ink)");
  assert.equal(styles[4].fill, "var(--map-ink-soft)");

  const memory = new Map();
  const storage = {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => memory.set(key, String(value)),
  };
  assert.equal(readFontId(storage), "default");
  assert.equal(writeFontId("song", storage), true);
  assert.equal(storage.getItem(FONT_KEY), "song");
  assert.equal(readFontId(storage), "song");
});

test("theme preference persists and resolves light/dark/system", () => {
  assert.equal(normalizeThemeId("dark"), "dark");
  assert.equal(normalizeThemeId("nope"), "system");
  assert.ok(THEME_PRESETS.some((preset) => preset.id === "system"));
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");

  const memory = new Map();
  const storage = {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => memory.set(key, String(value)),
  };
  assert.equal(readThemeId(storage), "system");
  assert.equal(writeThemeId("dark", storage), true);
  assert.equal(storage.getItem(THEME_KEY), "dark");
  assert.equal(readThemeId(storage), "dark");
});

test("createLocalStore persists and restores tree", () => {
  const memory = new Map();
  const storage = {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => memory.set(key, String(value)),
    removeItem: (key) => memory.delete(key),
  };
  const store = createLocalStore(storage, "test-mm");
  const tree = parseMarkdown(`# T\n\n- x\n  - y\n`);
  assert.equal(store.save("demo.md", tree), true);

  const loaded = store.load();
  assert.equal(loaded.fileName, "demo.md");
  assert.equal(loaded.tree.title, "T");
  assert.deepEqual(cloneData(loaded.tree), cloneData(tree));

  store.clear();
  assert.equal(store.load(), null);
});

/**
 * Documents why interaction must not rely on native dblclick: selecting
 * redraws SVG and replaces the node element. Editing starts via beginEdit
 * on a single pointerup (clickEdit / drag.mode select|desc).
 */
test("index.html edits on single click and does not rely on native dblclick", () => {
  const html = fs.readFileSync(path.join(publicDir, "index.html"), "utf8");
  assert.match(html, /beginEdit\(/);
  assert.match(html, /clickEdit:/);
  assert.match(html, /from "\.\/mm-core\.js(?:\?[^"]*)?"/);
  assert.equal(/addEventListener\(\s*["']dblclick["']/.test(html), false);
  assert.equal(/recognizeNodeTap/.test(html), false);
  assert.equal(/DOUBLE_TAP_MS/.test(html), false);
  assert.match(html, /ctx-menu/);
  assert.match(html, /confirmModal/);
  assert.match(html, /downloadModal/);
  assert.match(html, /id="closeDocBtn"/);
  assert.match(html, /requestCloseDocument/);
  assert.match(html, /closeDocument/);
  assert.match(html, /关闭当前文档？/);
  assert.match(html, /store\.clear\(\)/);
  assert.match(html, /缩进段落 → 副标题/);
  assert.match(html, /undoBtn/);
  assert.match(html, /redoBtn/);
  assert.match(html, /showCtxMenu/);
  assert.match(html, /LONG_PRESS_MS/);
  assert.match(html, /isSecondaryPointer/);
  assert.match(html, /data-node-path/);
  assert.match(html, /data-act="desc"/);
  assert.match(html, /beginEdit\(selected, "desc"\)/);
  assert.match(html, /id="modeSwitch"/);
  assert.match(html, /data-mode="view"/);
  assert.match(html, /data-mode="edit"/);
  assert.match(html, /id="fontSelect"/);
  assert.match(html, /id="themeSelect"/);
  assert.match(html, /FONT_PRESETS/);
  assert.match(html, /THEME_PRESETS/);
  assert.match(html, /buildLevelStyles/);
  assert.match(html, /readFontId/);
  assert.match(html, /writeFontId/);
  assert.match(html, /readThemeId/);
  assert.match(html, /writeThemeId/);
  assert.match(html, /data-theme/);
  assert.match(html, /var\(--map-ink\)/);
  assert.match(html, /armLongPress/);
  assert.match(html, /data-field", "desc"/);
  assert.match(html, /readAppMode/);
  assert.match(html, /beginEdit\(drag\.node, field\)/);
  assert.match(html, /nodeShowsSubtitle/);
  assert.match(html, /data-act="note"/);
  assert.match(html, /openNote\(selected/);
  assert.match(html, /notePop/);
  assert.match(html, /iconPop/);
  assert.match(html, /openIconPicker/);
  assert.match(html, /createRecentIconsStore/);
  assert.match(html, /iconSearch/);
  assert.match(html, /searchEmojis/);
  assert.match(html, /flex-wrap: nowrap/);
  assert.match(html, /grid-auto-rows: 40px/);
  assert.equal(/requestDelete/.test(html), false);
});

test("shouldConfirmOverwrite when the current map has content", () => {
  assert.equal(shouldConfirmOverwrite({ title: "A", children: [] }), true);
  assert.equal(shouldConfirmOverwrite({ title: "", children: [{ title: "x", children: [] }] }), true);
  assert.equal(shouldConfirmOverwrite(null), false);
});

test("normalizeDownloadName and buildDownload for common formats", () => {
  assert.equal(normalizeDownloadName("demo.markdown"), "demo.md");
  assert.equal(normalizeDownloadName("a/b:c", ".md"), "a-b-c.md");
  assert.equal(normalizeDownloadName("demo.opml", ".json"), "demo.json");
  const tree = parseMarkdown("# Hello\n\n- a\n  note line\n  > memo\n");
  const md = buildDownload(tree, "markdown", "hello");
  assert.equal(md.filename, "hello.md");
  assert.match(md.content, /^# Hello/m);

  const xmind = buildDownload(tree, "xmind", "hello");
  assert.equal(xmind.filename, "hello.xmind");
  assert.ok(xmind.content instanceof Uint8Array);
  assert.equal(xmind.content[0], 0x50); // P
  assert.equal(xmind.content[1], 0x4b); // K
  const xmindText = Buffer.from(xmind.content).toString("latin1");
  assert.match(xmindText, /content\.json/);
  assert.match(xmindText, /Hello/);

  const html = buildDownload(tree, "html", "hello");
  assert.equal(html.filename, "hello.html");
  assert.match(html.content, /<!DOCTYPE html>/);
  assert.match(html.content, /"title":"Hello"/);
  assert.match(html.content, /"note":"memo"/);
  assert.match(html.content, /notePop/);
  assert.match(html.content, /openNote/);
  assert.match(html.content, /NOTE_ICON_W/);

  const opml = buildDownload(tree, "opml", "hello");
  assert.equal(opml.filename, "hello.opml");
  assert.match(opml.content, /<opml version="2.0">/);
  assert.match(opml.content, /text="Hello"/);

  const json = buildDownload(tree, "json", "hello");
  assert.equal(json.filename, "hello.json");
  const parsed = JSON.parse(json.content);
  assert.equal(parsed.title, "Hello");
  assert.equal(parsed.children[0].title, "a");

  assert.throws(() => buildDownload(tree, "pdf"), /未知格式/);
});

test("countNodes includes the node itself", () => {
  const tree = parseMarkdown("# R\n\n- a\n  - b\n- c\n");
  assert.equal(countNodes(tree), 4);
});

test("createHistory undo/redo restores snapshots", () => {
  const history = createHistory(3);
  const a = parseMarkdown("# A\n\n- 1\n");
  const b = parseMarkdown("# B\n\n- 2\n");
  const c = parseMarkdown("# C\n\n- 3\n");
  history.push(captureState(a, "a.md", a));
  history.push(captureState(b, "b.md", b.children[0]));
  assert.equal(history.canUndo(), true);
  assert.equal(history.canRedo(), false);

  const back = history.undo(captureState(c, "c.md", c));
  assert.equal(back.tree.title, "B");
  assert.equal(back.fileName, "b.md");
  assert.deepEqual(back.selectedPath, [0]);

  const forward = history.redo(captureState(back.tree, back.fileName, nodeAtPath(back.tree, back.selectedPath)));
  assert.equal(forward.tree.title, "C");
  assert.equal(history.canRedo(), false);
});

test("pathToNode / nodeAtPath round-trip", () => {
  const tree = parseMarkdown("# R\n\n- a\n  - b\n- c\n");
  const target = tree.children[0].children[0];
  const path = pathToNode(tree, target);
  assert.deepEqual(path, [0, 0]);
  assert.equal(nodeAtPath(tree, path).title, "b");
  assert.deepEqual(pathToNode(tree, tree), []);
});

test("looksLikeOutlinePaste detects nested lists and plain indents", () => {
  assert.equal(looksLikeOutlinePaste("单行"), false);
  assert.equal(looksLikeOutlinePaste("一行\n两行无结构"), false);
  assert.equal(looksLikeOutlinePaste("- 叶子节点"), true);
  assert.equal(
    looksLikeOutlinePaste(`	- 领域
		- Web
			- 管理后台`),
    true,
  );
  assert.equal(
    looksLikeOutlinePaste(`经验
  阶段
    副驾驶`),
    true,
  );
});

test("subtreeToOutline round-trips through parseOutlinePaste", () => {
  const tree = parseMarkdown(`# Root
- 🍎 领域
  范围说明
  > 备注一行
  - Web
    - 管理后台
  - App
`);
  const branch = tree.children[0];
  const outline = subtreeToOutline(branch);
  assert.match(outline, /^- 🍎 领域/m);
  assert.match(outline, /^\s+- Web/m);
  const children = parseOutlinePaste(outline);
  assert.equal(children.length, 1);
  assert.equal(children[0].title, "领域");
  assert.equal(children[0].icon, "🍎");
  assert.equal(children[0].desc, "范围说明");
  assert.equal(children[0].note, "备注一行");
  assert.deepEqual(
    children[0].children.map((c) => c.title),
    ["Web", "App"],
  );
});

test("parseOutlinePaste builds children from a mid-tree Markdown fragment", () => {
  const children = parseOutlinePaste(`	- 领域
		- Web
			- 管理后台
				- 单模型
				- 单工具
					- Claude code
					- Cursor
				- 几乎不用关心 skills/mcp
			- 前台网站
		- App
			- 我不会任何 App 开发框架，我可以开发好 App 吗？
				- 产品
				- 研发
		- 游戏
			- 我不会任何游戏开发框架，我可以开发好游戏吗？
				- 产品
				- 研发`);
  assert.equal(children.length, 1);
  assert.equal(children[0].title, "领域");
  assert.deepEqual(
    children[0].children.map((c) => c.title),
    ["Web", "App", "游戏"],
  );
  assert.deepEqual(
    children[0].children[0].children[0].children.map((c) => c.title),
    ["单模型", "单工具", "几乎不用关心 skills/mcp"],
  );
  assert.deepEqual(
    children[0].children[0].children[0].children[1].children.map((c) => c.title),
    ["Claude code", "Cursor"],
  );
});

test("parseOutlinePaste accepts plain indented outlines", () => {
  const children = parseOutlinePaste(`领域
  Web
    管理后台`);
  assert.equal(children[0].title, "领域");
  assert.equal(children[0].children[0].title, "Web");
  assert.equal(children[0].children[0].children[0].title, "管理后台");
});

test("selection redraw invalidates native dblclick targets", () => {
  const events = [];
  let element = {
    id: "node-1",
    dispatch(type) {
      events.push({ id: this.id, type });
    },
  };

  // first click → app redraws and replaces the element
  element.dispatch("click");
  element = { id: "node-1-redrawn", dispatch(type) { events.push({ id: this.id, type }); } };

  // second click lands on a new DOM node; no dblclick is synthesized on the old one
  element.dispatch("click");
  assert.deepEqual(events, [
    { id: "node-1", type: "click" },
    { id: "node-1-redrawn", type: "click" },
  ]);
  assert.ok(!events.some((e) => e.type === "dblclick"));
});

test("detectImportFormat and isImportableFile cover export formats", () => {
  assert.equal(detectImportFormat("a.md"), "markdown");
  assert.equal(detectImportFormat("a.opml"), "opml");
  assert.equal(detectImportFormat("a.json"), "json");
  assert.equal(detectImportFormat("a.html"), "html");
  assert.equal(detectImportFormat("a.xmind"), "xmind");
  assert.equal(detectImportFormat("", "", '{"title":"T","children":[]}'), "json");
  assert.equal(detectImportFormat("", "", "<opml version=\"2.0\"><body></body></opml>"), "opml");
  assert.equal(isImportableFile({ name: "demo.xmind", type: "" }), true);
  assert.equal(isImportableFile({ name: "demo.opml", type: "text/xml" }), true);
  assert.equal(isImportableFile({ name: "nope.bin", type: "application/octet-stream" }), false);
});

test("parseJsonTree / parseOpml / parseInteractiveHtml round-trip export", () => {
  const tree = parseMarkdown(`# 🗺️ Root

- 📦 a
  subtitle
  > memo
  - b
`);
  const json = buildDownload(tree, "json", "demo");
  const fromJson = parseJsonTree(json.content);
  assert.equal(fromJson.title, "Root");
  assert.equal(fromJson.icon, "🗺️");
  assert.equal(fromJson.children[0].title, "a");
  assert.equal(fromJson.children[0].icon, "📦");
  assert.equal(fromJson.children[0].desc, "subtitle");
  assert.equal(fromJson.children[0].note, "memo");
  assert.equal(fromJson.children[0].children[0].title, "b");

  const opml = buildDownload(tree, "opml", "demo");
  // topicTitle embeds icon into text; import splits it back
  const fromOpml = parseOpml(opml.content);
  assert.equal(fromOpml.title, "Root");
  assert.equal(fromOpml.icon, "🗺️");
  assert.equal(fromOpml.children[0].title, "a");
  assert.equal(fromOpml.children[0].icon, "📦");
  assert.equal(fromOpml.children[0].desc, "subtitle");
  assert.equal(fromOpml.children[0].note, "memo");

  const html = buildDownload(tree, "html", "demo");
  const fromHtml = parseInteractiveHtml(html.content);
  assert.deepEqual(fromHtml, fromJson);
});

test("parseImportFile round-trips markdown json opml html xmind", async () => {
  const tree = parseMarkdown(`# Hello

- a
  note line
  > memo
  - b
`);
  const md = await parseImportFile(toMarkdown(tree), { name: "hello.md" });
  assert.equal(md.format, "markdown");
  assert.equal(md.tree.title, "Hello");
  assert.equal(md.tree.children[0].children[0].title, "b");

  const jsonPacked = buildDownload(tree, "json", "hello");
  const json = await parseImportFile(jsonPacked.content, { name: "hello.json" });
  assert.equal(json.format, "json");
  assert.equal(json.tree.children[0].note, "memo");

  const opmlPacked = buildDownload(tree, "opml", "hello");
  const opml = await parseImportFile(opmlPacked.content, { name: "hello.opml" });
  assert.equal(opml.format, "opml");
  assert.equal(opml.tree.children[0].desc, "note line");

  const htmlPacked = buildDownload(tree, "html", "hello");
  const html = await parseImportFile(htmlPacked.content, { name: "hello.html" });
  assert.equal(html.format, "html");
  assert.equal(html.tree.title, "Hello");

  const xmindPacked = buildDownload(tree, "xmind", "hello");
  const xmind = await parseImportFile(xmindPacked.content, { name: "hello.xmind" });
  assert.equal(xmind.format, "xmind");
  assert.equal(xmind.tree.title, "Hello");
  assert.equal(xmind.tree.children[0].title, "a");
  assert.equal(xmind.tree.children[0].desc, "note line");
  assert.equal(xmind.tree.children[0].note, "memo");
  assert.equal(xmind.tree.children[0].children[0].title, "b");
});

test("share payload round-trips through #v1= hash", async () => {
  const tree = parseMarkdown(`# 分享测试
## 副标题

- 分支
  > 备注
  - 子节点 🎯
`);
  const payload = await encodeSharePayload(tree);
  assert.match(payload, /^[A-Za-z0-9_-]+$/);
  const decoded = await decodeSharePayload(payload);
  assert.equal(decoded.title, "分享测试");
  assert.equal(decoded.desc, "副标题");
  assert.equal(decoded.children[0].title, "分支");
  assert.equal(decoded.children[0].note, "备注");
  assert.equal(decoded.children[0].children[0].title, "子节点 🎯");

  const hash = await buildShareHash(tree);
  assert.equal(hash.startsWith(`#${SHARE_HASH_PREFIX}`), true);
  const fromHash = await parseShareHash(hash);
  assert.equal(fromHash.title, "分享测试");
  assert.equal(await parseShareHash("#nope"), null);
  assert.equal(await parseShareHash("#v1="), null);
  assert.equal(await parseShareHash("#v1=!!!"), null);

  const longUrl = await buildShareLongUrl(tree, "https://mm.wenfu.dev");
  assert.equal(longUrl.startsWith("https://mm.wenfu.dev/#v1="), true);
  assert.equal(preferExternalShorten(100), true);
  assert.equal(preferExternalShorten(EXTERNAL_SHORTEN_MAX_LEN), true);
  assert.equal(preferExternalShorten(EXTERNAL_SHORTEN_MAX_LEN + 1), false);
});

test("createShareLinks prefers builtin short then external then long-only", async () => {
  const tree = { title: "Hi", children: [{ title: "A", children: [] }] };

  const builtin = await createShareLinks(tree, "https://mm.wenfu.dev", {
    fetchImpl: async (url, init) => {
      assert.match(String(url), /\/api$/);
      assert.equal(init.method, "POST");
      return {
        ok: true,
        json: async () => ({ id: "Ab12Cd34", url: "https://s.wenfu.dev/Ab12Cd34" }),
      };
    },
  });
  assert.equal(builtin.shortened, true);
  assert.equal(builtin.shortUrl, "https://s.wenfu.dev/Ab12Cd34");
  assert.equal(builtin.provider, "swenfu");
  assert.match(builtin.longUrl, /^https:\/\/mm\.wenfu\.dev\/#v1=/);

  let calls = 0;
  const external = await createShareLinks(tree, "https://mm.wenfu.dev", {
    fetchImpl: async (url) => {
      calls += 1;
      if (String(url).includes("s.wenfu.dev")) {
        return { ok: false, status: 503, json: async () => ({ error: "down" }) };
      }
      return {
        ok: true,
        json: async () => ({ shorturl: "https://is.gd/abc" }),
      };
    },
  });
  assert.equal(external.shortened, true);
  assert.equal(external.shortUrl, "https://is.gd/abc");
  assert.equal(external.provider, "isgd");
  assert.ok(calls >= 2);

  const fail = await createShareLinks(tree, "https://mm.wenfu.dev", {
    fetchImpl: async () => {
      throw new Error("network");
    },
  });
  assert.equal(fail.shortened, false);
  assert.equal(fail.shortUrl, null);
  assert.match(fail.longUrl, /^https:\/\/mm\.wenfu\.dev\/#v1=/);

  assert.equal(parseShareIdFromSearch("?s=Ab12Cd34"), "Ab12Cd34");
  assert.equal(parseShareIdFromSearch("?s=!!"), null);

  const visit = {
    data: new Map(),
    getItem(key) {
      return this.data.has(key) ? this.data.get(key) : null;
    },
    setItem(key, value) {
      this.data.set(key, String(value));
    },
    removeItem(key) {
      this.data.delete(key);
    },
  };
  assert.equal(takeShareExit(visit), false);
  assert.equal(markShareVisit(visit), true);
  assert.equal(visit.getItem(SHARE_VISIT_KEY), "1");
  assert.equal(takeShareExit(visit), true);
  assert.equal(takeShareExit(visit), false);
  markShareVisit(visit);
  clearShareVisit(visit);
  assert.equal(takeShareExit(visit), false);

  const built = await shortenWithBuiltin("abcPAYLOAD", {
    apiOrigin: "https://s.wenfu.dev",
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ id: "x", url: "https://s.wenfu.dev/x" }),
    }),
  });
  assert.equal(built.provider, "swenfu");

  await assert.rejects(
    () =>
      shortenWithExternal("https://mm.wenfu.dev/#v1=x", {
        fetchImpl: async () => ({
          ok: true,
          json: async () => ({ errormessage: "Error: Please enter a valid URL to shorten" }),
        }),
      }),
    /isgd:|vgd:/,
  );
});
