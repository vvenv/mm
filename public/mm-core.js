/** Pure helpers for Markdown Mindmap — shared by the page and tests. */

export const STORAGE_KEY = "mm.wenfu.dev/v1";
export const DOUBLE_TAP_MS = 350;

export function indentWidth(prefix) {
  let width = 0;
  for (const ch of prefix) width += ch === "\t" ? 2 : 1;
  return width;
}

export function parseMarkdown(markdown) {
  const lines = String(markdown).split(/\r?\n/);
  const root = { title: "Mindmap", subtitle: "", children: [] };
  const stack = [{ indent: -1, node: root }];
  let sawList = false;

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) continue;

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const title = heading[2].trim();
      if (level === 1) {
        root.title = title;
        continue;
      }
      if (level === 2 && !sawList && !root.subtitle && root.children.length === 0) {
        root.subtitle = title;
        continue;
      }
      const indent = (level - 2) * 2;
      const node = { title, children: [] };
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
      stack[stack.length - 1].node.children.push(node);
      stack.push({ indent, node });
      continue;
    }

    const item = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (!item) continue;
    sawList = true;
    const indent = indentWidth(item[1]);
    const node = { title: item[2].trim(), children: [] };
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
    stack[stack.length - 1].node.children.push(node);
    stack.push({ indent, node });
  }

  if (!root.children.length) throw new Error("没有解析到任何大纲节点");
  return root;
}

export function toMarkdown(node) {
  const lines = [`# ${node.title}`];
  if (node.subtitle) lines.push(`## ${node.subtitle}`);
  lines.push("");
  function walk(item, depth) {
    lines.push(`${"  ".repeat(depth)}- ${item.title}`);
    item.children.forEach((child) => walk(child, depth + 1));
  }
  node.children.forEach((child) => walk(child, 0));
  lines.push("");
  return lines.join("\n");
}

export function cloneData(node) {
  const out = { title: node.title, children: (node.children || []).map(cloneData) };
  if (node.subtitle) out.subtitle = node.subtitle;
  if (node.open) out.open = true;
  return out;
}

export function pageTitleOf(node) {
  return node.subtitle ? `${node.title} · ${node.subtitle}` : node.title;
}

/**
 * First click selects; a second click on the same node within the threshold edits.
 * Needed because selecting redraws SVG and destroys the DOM target, so native
 * `dblclick` never fires.
 */
export function recognizeNodeTap(prev, node, now = Date.now(), threshold = DOUBLE_TAP_MS) {
  if (prev && prev.node === node && now - prev.time <= threshold) {
    return { action: "edit", next: { node: null, time: 0 } };
  }
  return { action: "select", next: { node, time: now } };
}

export function createLocalStore(storage = globalThis.localStorage, key = STORAGE_KEY) {
  return {
    key,
    save(fileName, tree) {
      if (!storage) return false;
      storage.setItem(
        key,
        JSON.stringify({
          fileName,
          tree: cloneData(tree),
          savedAt: Date.now(),
        }),
      );
      return true;
    },
    load() {
      if (!storage) return null;
      try {
        const raw = storage.getItem(key);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || !data.tree || !Array.isArray(data.tree.children)) return null;
        return data;
      } catch {
        return null;
      }
    },
    clear() {
      if (!storage) return;
      storage.removeItem(key);
    },
  };
}
