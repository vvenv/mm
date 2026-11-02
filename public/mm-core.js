/** Pure helpers for Markdown Mindmap — shared by the page and tests. */

export const STORAGE_KEY = "mm.wenfu.dev/v1";
export const DOUBLE_TAP_MS = 350;

export const DOWNLOAD_FORMATS = [
  { id: "markdown", label: "Markdown", ext: ".md", mime: "text/markdown;charset=utf-8", available: true },
  { id: "xmind", label: "XMind", ext: ".xmind", mime: "application/vnd.xmind.workbook", available: false },
  { id: "html", label: "交互 HTML", ext: ".html", mime: "text/html;charset=utf-8", available: false },
];

export function indentWidth(prefix) {
  let width = 0;
  for (const ch of prefix) width += ch === "\t" ? 2 : 1;
  return width;
}

/** Split `title :: subtitle` on the first `::`. Empty title keeps the raw string. */
export function parseTitleSubtitle(raw) {
  const text = String(raw || "").trim();
  const idx = text.indexOf("::");
  if (idx === -1) return { title: text, subtitle: "" };
  const title = text.slice(0, idx).trim();
  const subtitle = text.slice(idx + 2).trim();
  if (!title) return { title: text, subtitle: "" };
  return { title, subtitle };
}

export function formatListLabel(node) {
  const title = node && node.title != null ? String(node.title) : "";
  const subtitle = node && node.subtitle ? String(node.subtitle).trim() : "";
  return subtitle ? `${title} :: ${subtitle}` : title;
}

function nodeFromTitleLine(raw) {
  const parts = parseTitleSubtitle(raw);
  const node = { title: parts.title, children: [] };
  if (parts.subtitle) node.subtitle = parts.subtitle;
  return node;
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
      const node = nodeFromTitleLine(title);
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
      stack[stack.length - 1].node.children.push(node);
      stack.push({ indent, node });
      continue;
    }

    const quote = line.match(/^(\s*)>\s?(.*)$/);
    if (quote) {
      const host = stack[stack.length - 1].node;
      const piece = quote[2];
      host.note = host.note ? `${host.note}\n${piece}` : piece;
      continue;
    }

    const item = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (!item) continue;
    sawList = true;
    const indent = indentWidth(item[1]);
    const node = nodeFromTitleLine(item[2]);
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
    stack[stack.length - 1].node.children.push(node);
    stack.push({ indent, node });
  }

  if (!root.children.length) throw new Error("没有解析到任何大纲节点");
  return root;
}

function appendNoteLines(lines, note, prefix) {
  String(note).split(/\n/).forEach((noteLine) => {
    lines.push(`${prefix}> ${noteLine}`);
  });
}

export function toMarkdown(node) {
  const lines = [`# ${node.title}`];
  if (node.subtitle) lines.push(`## ${node.subtitle}`);
  if (node.note) {
    lines.push("");
    appendNoteLines(lines, node.note, "");
  }
  lines.push("");
  function walk(item, depth) {
    lines.push(`${"  ".repeat(depth)}- ${formatListLabel(item)}`);
    if (item.note) appendNoteLines(lines, item.note, `${"  ".repeat(depth)}  `);
    item.children.forEach((child) => walk(child, depth + 1));
  }
  node.children.forEach((child) => walk(child, 0));
  lines.push("");
  return lines.join("\n");
}

export function cloneData(node) {
  const out = { title: node.title, children: (node.children || []).map(cloneData) };
  if (node.subtitle) out.subtitle = node.subtitle;
  if (node.note) out.note = node.note;
  if (typeof node.open === "boolean") out.open = node.open;
  else if (node.open) out.open = true;
  return out;
}

export function pageTitleOf(node) {
  return node.subtitle ? `${node.title} · ${node.subtitle}` : node.title;
}

export function countNodes(node) {
  return 1 + (node.children || []).reduce((sum, child) => sum + countNodes(child), 0);
}

/** Importing replaces the in-memory map; confirm when there is anything to lose. */
export function shouldConfirmOverwrite(tree) {
  return !!(tree && Array.isArray(tree.children) && (tree.children.length > 0 || tree.title));
}

export function normalizeDownloadName(name, ext = ".md") {
  const raw = String(name || "mindmap").trim() || "mindmap";
  const base = raw.replace(/\.(md|markdown|txt|html|xmind)$/i, "");
  const safe = base.replace(/[\\/:*?"<>|]+/g, "-").trim() || "mindmap";
  return safe + ext;
}

export function buildDownload(tree, formatId = "markdown", name) {
  const format = DOWNLOAD_FORMATS.find((item) => item.id === formatId);
  if (!format || !format.available) {
    throw new Error(format ? `${format.label} 即将支持` : "未知格式");
  }
  if (format.id === "markdown") {
    return {
      filename: normalizeDownloadName(name || tree.title, format.ext),
      mime: format.mime,
      content: toMarkdown(tree),
    };
  }
  throw new Error(`${format.label} 即将支持`);
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

/** Index path from root → node, e.g. [1, 0] for tree.children[1].children[0]. */
export function pathToNode(root, target) {
  if (root === target) return [];
  function walk(node, path) {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const next = path.concat(i);
      if (child === target) return next;
      const found = walk(child, next);
      if (found) return found;
    }
    return null;
  }
  return walk(root, []);
}

export function nodeAtPath(root, path) {
  if (!root) return null;
  if (!path || !path.length) return root;
  let node = root;
  for (const index of path) {
    if (!node.children || !node.children[index]) return null;
    node = node.children[index];
  }
  return node;
}

export function captureState(tree, fileName, selected) {
  return {
    tree: cloneData(tree),
    fileName,
    selectedPath: selected ? pathToNode(tree, selected) : null,
  };
}

export function createHistory(limit = 80) {
  const undoStack = [];
  const redoStack = [];
  return {
    push(snapshot) {
      if (!snapshot || !snapshot.tree) return;
      undoStack.push(snapshot);
      if (undoStack.length > limit) undoStack.shift();
      redoStack.length = 0;
    },
    undo(current) {
      if (!undoStack.length) return null;
      redoStack.push(current);
      return undoStack.pop();
    },
    redo(current) {
      if (!redoStack.length) return null;
      undoStack.push(current);
      return redoStack.pop();
    },
    canUndo() {
      return undoStack.length > 0;
    },
    canRedo() {
      return redoStack.length > 0;
    },
    clear() {
      undoStack.length = 0;
      redoStack.length = 0;
    },
    sizes() {
      return { undo: undoStack.length, redo: redoStack.length };
    },
  };
}
