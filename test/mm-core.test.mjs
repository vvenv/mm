import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  DOUBLE_TAP_MS,
  buildDownload,
  captureState,
  cloneData,
  countNodes,
  createHistory,
  createLocalStore,
  nodeAtPath,
  normalizeDownloadName,
  parseMarkdown,
  pathToNode,
  recognizeNodeTap,
  shouldConfirmOverwrite,
  toMarkdown,
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
  assert.equal(tree.subtitle, "Sub");
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
  assert.equal(tree.subtitle, "副标题");
  assert.equal(tree.children.length, 2);
  assert.equal(tree.children[0].children[0].children[0].title, "副驾驶");
});

test("recognizeNodeTap: first tap selects, second tap within window edits", () => {
  const node = { title: "A" };
  const first = recognizeNodeTap(null, node, 1000);
  assert.equal(first.action, "select");
  assert.equal(first.next.node, node);

  const second = recognizeNodeTap(first.next, node, 1000 + DOUBLE_TAP_MS - 1);
  assert.equal(second.action, "edit");
  assert.equal(second.next.node, null);
});

test("recognizeNodeTap: slow second tap selects again (native dblclick would be lost after redraw)", () => {
  const node = { title: "A" };
  const first = recognizeNodeTap(null, node, 1000);
  const second = recognizeNodeTap(first.next, node, 1000 + DOUBLE_TAP_MS + 1);
  assert.equal(second.action, "select");
  assert.equal(second.next.time, 1000 + DOUBLE_TAP_MS + 1);
});

test("recognizeNodeTap: switching nodes starts a new select streak", () => {
  const a = { title: "A" };
  const b = { title: "B" };
  const first = recognizeNodeTap(null, a, 1000);
  const second = recognizeNodeTap(first.next, b, 1100);
  assert.equal(second.action, "select");
  assert.equal(second.next.node, b);

  const third = recognizeNodeTap(second.next, b, 1200);
  assert.equal(third.action, "edit");
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
 * Documents the production bug: selecting redraws SVG and replaces the node
 * element, so a browser `dblclick` on the original target never fires.
 * Interaction must use recognizeNodeTap instead of native dblclick.
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

  // app-level recognizer still sees the same logical node
  const logical = { title: "同一节点" };
  const a = recognizeNodeTap(null, logical, 1);
  const b = recognizeNodeTap(a.next, logical, 2);
  assert.equal(b.action, "edit");
});
