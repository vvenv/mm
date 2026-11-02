import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  DOUBLE_TAP_MS,
  EMOJI_CATEGORIES,
  buildDownload,
  captureState,
  cloneData,
  countNodes,
  createHistory,
  createLocalStore,
  createRecentIconsStore,
  searchEmojis,
  formatListLabel,
  nodeAtPath,
  FONT_KEY,
  FONT_PRESETS,
  MODE_KEY,
  buildLevelStyles,
  fontStacksFor,
  normalizeAppMode,
  normalizeDownloadName,
  normalizeFontId,
  parseMarkdown,
  readAppMode,
  readFontId,
  parseTitleSubtitle,
  pathToNode,
  recognizeNodeTap,
  shouldConfirmOverwrite,
  splitLeadingIcon,
  toMarkdown,
  writeAppMode,
  writeFontId,
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
});

test("searchEmojis matches names and category labels", () => {
  assert.ok(searchEmojis("苹果").includes("🍎"));
  assert.ok(searchEmojis("apple").includes("🍎"));
  assert.ok(searchEmojis("食物").includes("🍜"));
  assert.deepEqual(searchEmojis("   "), []);
  assert.equal(searchEmojis("zzznomatch").length, 0);
});

test("searchEmojis heart terms hit hearts, not whole symbols category", () => {
  const hearts = searchEmojis("heart");
  assert.ok(hearts.includes("❤️"));
  assert.ok(hearts.includes("💕"));
  assert.ok(!hearts.includes("❌"), "must not dump unrelated symbols");
  assert.ok(hearts.length < 40, `expected heart subset, got ${hearts.length}`);

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

test("recognizeNodeTap: single tap edits title", () => {
  const node = { title: "A" };
  const result = recognizeNodeTap(null, node, 1000);
  assert.equal(result.action, "edit");
  assert.equal(result.field, "title");
  assert.equal(result.next.node, null);
});

test("recognizeNodeTap: single tap edits desc", () => {
  const node = { title: "A", desc: "s" };
  const result = recognizeNodeTap(null, node, 1000, DOUBLE_TAP_MS, "desc");
  assert.equal(result.action, "edit");
  assert.equal(result.field, "desc");
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
 * redraws SVG and replaces the node element.
 */
test("index.html wires recognizeNodeTap and does not rely on native dblclick", () => {
  const html = fs.readFileSync(path.join(publicDir, "index.html"), "utf8");
  assert.match(html, /recognizeNodeTap/);
  assert.match(html, /from "\.\/mm-core\.js(?:\?[^"]*)?"/);
  assert.equal(/addEventListener\(\s*["']dblclick["']/.test(html), false);
  assert.match(html, /ctx-menu/);
  assert.match(html, /confirmModal/);
  assert.match(html, /downloadModal/);
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
  assert.match(html, /FONT_PRESETS/);
  assert.match(html, /buildLevelStyles/);
  assert.match(html, /readFontId/);
  assert.match(html, /writeFontId/);
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

test("normalizeDownloadName and buildDownload for markdown", () => {
  assert.equal(normalizeDownloadName("demo.markdown"), "demo.md");
  assert.equal(normalizeDownloadName("a/b:c", ".md"), "a-b-c.md");
  const tree = parseMarkdown("# Hello\n\n- a\n");
  const packed = buildDownload(tree, "markdown", "hello");
  assert.equal(packed.filename, "hello.md");
  assert.match(packed.content, /^# Hello/m);
  assert.throws(() => buildDownload(tree, "xmind"), /即将支持/);
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

  // app-level recognizer edits on a single logical click
  const logical = { title: "同一节点" };
  const result = recognizeNodeTap(null, logical, 1);
  assert.equal(result.action, "edit");
});
