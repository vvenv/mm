/** Pure helpers for Markdown Mindmap — shared by the page and tests. */

import { EMOJI_CATEGORIES, EMOJI_KEYWORDS } from "./emoji-data.js";

export { EMOJI_CATEGORIES };

const STORAGE_KEY = "mm.wenfu.dev/v1";
const RECENT_ICONS_KEY = "mm.wenfu.dev/icons/recent";
export const MODE_KEY = "mm.wenfu.dev/mode";
export const FONT_KEY = "mm.wenfu.dev/font";
export const THEME_KEY = "mm.wenfu.dev/theme";

/** App mode is either read-only (`view`) or editable (`edit`). Unknown values stay editable. */
export function normalizeAppMode(value) {
  return value === "view" ? "view" : "edit";
}

export function readAppMode(storage = globalThis.localStorage, key = MODE_KEY) {
  if (!storage) return "edit";
  try {
    return normalizeAppMode(storage.getItem(key));
  } catch {
    return "edit";
  }
}

export function writeAppMode(mode, storage = globalThis.localStorage, key = MODE_KEY) {
  if (!storage) return false;
  try {
    storage.setItem(key, normalizeAppMode(mode));
    return true;
  } catch {
    return false;
  }
}

/** Curated global font presets for mindmap text. `default` keeps title serif + body sans. */
export const FONT_PRESETS = [
  { id: "default", label: "默认" },
  { id: "song", label: "宋体" },
  { id: "hei", label: "黑体" },
  { id: "kai", label: "楷体" },
  { id: "fangsong", label: "仿宋" },
  { id: "system", label: "系统" },
];

const FONT_STACKS = {
  song: '"Songti SC", "STSongti-SC-Regular", "Noto Serif SC", "SimSun", serif',
  hei: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif',
  kai: '"Kaiti SC", "STKaiti", "KaiTi", serif',
  fangsong: '"STFangsong", "FangSong", "仿宋", serif',
  system:
    'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
};

export function normalizeFontId(value) {
  return FONT_PRESETS.some((preset) => preset.id === value) ? value : "default";
}

export function readFontId(storage = globalThis.localStorage, key = FONT_KEY) {
  if (!storage) return "default";
  try {
    return normalizeFontId(storage.getItem(key));
  } catch {
    return "default";
  }
}

export function writeFontId(fontId, storage = globalThis.localStorage, key = FONT_KEY) {
  if (!storage) return false;
  try {
    storage.setItem(key, normalizeFontId(fontId));
    return true;
  } catch {
    return false;
  }
}

/** Resolve title/body font stacks for a preset. Non-default presets use one family globally. */
export function fontStacksFor(fontId) {
  const id = normalizeFontId(fontId);
  if (id === "default") {
    return { title: FONT_STACKS.song, body: FONT_STACKS.hei };
  }
  const family = FONT_STACKS[id] || FONT_STACKS.hei;
  return { title: family, body: family };
}

/** Level styles for layout/draw. Depth 0–2 use title stack; deeper levels use body stack.
 * Fills use CSS variables so the mindmap follows the active theme. */
export function buildLevelStyles(fontId) {
  const { title, body } = fontStacksFor(fontId);
  return [
    { size: 30, weight: 700, family: title, fill: "var(--map-ink)", h: 46 },
    { size: 22, weight: 700, family: title, fill: "var(--map-ink)", h: 38 },
    { size: 17, weight: 600, family: title, fill: "var(--map-ink)", h: 34 },
    { size: 15, weight: 500, family: body, fill: "var(--map-ink)", h: 30 },
    { size: 14, weight: 400, family: body, fill: "var(--map-ink-soft)", h: 28 },
  ];
}

/** Theme preference: light, dark, or follow the OS (`system`). */
export const THEME_PRESETS = [
  { id: "system", label: "跟随系统" },
  { id: "light", label: "浅色" },
  { id: "dark", label: "深色" },
];

export function normalizeThemeId(value) {
  return THEME_PRESETS.some((preset) => preset.id === value) ? value : "system";
}

export function readThemeId(storage = globalThis.localStorage, key = THEME_KEY) {
  if (!storage) return "system";
  try {
    return normalizeThemeId(storage.getItem(key));
  } catch {
    return "system";
  }
}

export function writeThemeId(themeId, storage = globalThis.localStorage, key = THEME_KEY) {
  if (!storage) return false;
  try {
    storage.setItem(key, normalizeThemeId(themeId));
    return true;
  } catch {
    return false;
  }
}

/** Resolve preference to a concrete light/dark theme. */
export function resolveTheme(themeId, prefersDark = false) {
  const id = normalizeThemeId(themeId);
  if (id === "light" || id === "dark") return id;
  return prefersDark ? "dark" : "light";
}

/** Category-level synonyms only — never item concepts (e.g. heart, fruit, car). */
const CATEGORY_ALIAS = {
  smileys: "表情 脸 情绪 face emotion smiley",
  people: "人物 人 people person body",
  nature: "自然 动物 植物 animal nature plant",
  food: "食物 饮食 food drink eat",
  activity: "活动 运动 游戏 sport game activity",
  travel: "旅行 交通 地点 travel place transport",
  objects: "物品 东西 object tool",
  symbols: "符号 标记 symbol sign mark",
  flags: "旗帜 国旗 flag flags",
};

const SEARCH_STOPWORDS = new Set(["emoji", "emojis", "icon", "icons"]);

export function searchEmojis(query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [];
  const terms = q
    .split(/[\s,]+/)
    .filter((term) => term && !SEARCH_STOPWORDS.has(term));
  if (!terms.length) return [];

  const termHit = (term, text) => {
    const value = String(text || "").toLowerCase();
    if (!value) return false;
    if (/[\u3400-\u9fff]/.test(term)) return value.includes(term);
    return value.split(/[\s,]+/).some((word) => word.startsWith(term));
  };

  const hits = [];
  const seen = new Set();
  for (const cat of EMOJI_CATEGORIES) {
    const catText = `${cat.label} ${CATEGORY_ALIAS[cat.id] || ""}`;
    for (const emoji of cat.emojis) {
      if (seen.has(emoji)) continue;
      const kw = EMOJI_KEYWORDS[emoji] || "";
      // Every query term must match category, keywords, or the glyph itself.
      const matched = terms.every(
        (term) =>
          termHit(term, catText) ||
          emoji.includes(term) ||
          termHit(term, kw),
      );
      if (!matched) continue;
      seen.add(emoji);
      hits.push(emoji);
    }
  }
  return hits;
}

export const DOWNLOAD_FORMATS = [
  { id: "markdown", label: "Markdown", ext: ".md", mime: "text/markdown;charset=utf-8", available: true },
  { id: "xmind", label: "XMind", ext: ".xmind", mime: "application/vnd.xmind.workbook", available: true },
  { id: "html", label: "交互 HTML", ext: ".html", mime: "text/html;charset=utf-8", available: true },
  { id: "opml", label: "OPML", ext: ".opml", mime: "text/x-opml;charset=utf-8", available: true },
  { id: "json", label: "JSON", ext: ".json", mime: "application/json;charset=utf-8", available: true },
];

/** File picker `accept` for import — mirrors export formats plus plain text. */
export const IMPORT_ACCEPT =
  ".md,.markdown,.txt,.opml,.json,.html,.htm,.xmind,text/markdown,text/plain,text/html,application/json,text/xml,application/xml,application/vnd.xmind.workbook";

const IMPORT_NAME_RE = /\.(md|markdown|txt|opml|json|html|htm|xmind)$/i;
const IMPORT_MIME_RE =
  /^(text\/(markdown|plain|html|xml|x-opml)|application\/(json|xml|vnd\.xmind\.workbook))(\s|;|$)/i;

const DOWNLOAD_NAME_EXTS = "md|markdown|txt|html|xmind|opml|json";

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function utf8Encode(text) {
  return new TextEncoder().encode(String(text));
}

function u16le(n) {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, n, true);
  return b;
}

function u32le(n) {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, true);
  return b;
}

function concatBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** Build an uncompressed ZIP (STORE). Enough for XMind JSON packages. */
function zipStore(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const entry of entries) {
    const nameBytes = utf8Encode(entry.name);
    const data = entry.data instanceof Uint8Array ? entry.data : utf8Encode(entry.data);
    const crc = crc32(data);
    const local = concatBytes([
      u32le(0x04034b50),
      u16le(20),
      u16le(0),
      u16le(0),
      u16le(0),
      u16le(0),
      u32le(crc),
      u32le(data.length),
      u32le(data.length),
      u16le(nameBytes.length),
      u16le(0),
      nameBytes,
      data,
    ]);
    const central = concatBytes([
      u32le(0x02014b50),
      u16le(20),
      u16le(20),
      u16le(0),
      u16le(0),
      u16le(0),
      u16le(0),
      u32le(crc),
      u32le(data.length),
      u32le(data.length),
      u16le(nameBytes.length),
      u16le(0),
      u16le(0),
      u16le(0),
      u16le(0),
      u32le(0),
      u32le(offset),
      nameBytes,
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const centralDir = concatBytes(centrals);
  const end = concatBytes([
    u32le(0x06054b50),
    u16le(0),
    u16le(0),
    u16le(entries.length),
    u16le(entries.length),
    u32le(centralDir.length),
    u32le(offset),
    u16le(0),
  ]);
  return concatBytes([...locals, centralDir, end]);
}

async function inflateRaw(data) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("当前环境无法解压 XMind");
  }
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Read local-file entries from a ZIP (STORE / DEFLATE). Enough for XMind packages. */
async function unzipEntries(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries = [];
  let offset = 0;
  while (offset + 30 <= bytes.length) {
    if (view.getUint32(offset, true) !== 0x04034b50) break;
    const method = view.getUint16(offset + 8, true);
    const flags = view.getUint16(offset + 6, true);
    let compSize = view.getUint32(offset + 18, true);
    const nameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const name = new TextDecoder().decode(bytes.subarray(nameStart, nameStart + nameLen));
    let dataStart = nameStart + nameLen + extraLen;
    if (flags & 0x8) {
      // Sizes live in a data descriptor after the payload — unsupported here.
      throw new Error("不支持的 XMind 压缩格式");
    }
    const compressed = bytes.subarray(dataStart, dataStart + compSize);
    let data = compressed;
    if (method === 8) data = await inflateRaw(compressed);
    else if (method !== 0) throw new Error("不支持的 XMind 压缩方法");
    entries.push({ name, data });
    offset = dataStart + compSize;
  }
  if (!entries.length) throw new Error("无效的 XMind 文件");
  return entries;
}

function topicTitle(node) {
  return formatListLabel(node) || "未命名";
}

function topicNotes(node) {
  const parts = [];
  if (node && node.desc) parts.push(String(node.desc));
  if (node && node.note) parts.push(String(node.note));
  return parts.join("\n\n");
}

function toXmindTopic(node, isRoot, nextId) {
  const item = { id: nextId(), class: "topic", title: topicTitle(node) };
  if (isRoot) item.structureClass = "org.xmind.ui.logic.right";
  const notes = topicNotes(node);
  if (notes) item.notes = { plain: { content: notes } };
  if (node.children && node.children.length) {
    item.children = { attached: node.children.map((child) => toXmindTopic(child, false, nextId)) };
  }
  return item;
}

function toXmindBytes(tree) {
  let seq = 0;
  const nextId = () => `t${++seq}`;
  const sheet = {
    id: nextId(),
    class: "sheet",
    title: tree.title || "Mindmap",
    rootTopic: toXmindTopic(tree, true, nextId),
  };
  const content = JSON.stringify([sheet]);
  const metadata = JSON.stringify({
    dataStructureVersion: "2",
    layoutEngineVersion: "3",
    creator: { name: "mm.wenfu.dev", version: "1.2.0" },
  });
  const manifest = JSON.stringify({
    "file-entries": { "content.json": {}, "metadata.json": {}, "manifest.json": {} },
  });
  return zipStore([
    { name: "content.json", data: content },
    { name: "metadata.json", data: metadata },
    { name: "manifest.json", data: manifest },
  ]);
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function opmlOutline(node) {
  const attrs = [`text="${escapeXml(topicTitle(node))}"`];
  const notes = topicNotes(node);
  if (notes) attrs.push(`_note="${escapeXml(notes)}"`);
  const kids = node.children || [];
  if (!kids.length) return `<outline ${attrs.join(" ")}/>`;
  const inner = kids.map(opmlOutline).join("");
  return `<outline ${attrs.join(" ")}>${inner}</outline>`;
}

function toOpml(tree) {
  const title = escapeXml(tree.title || "Mindmap");
  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>${title}</title>
  </head>
  <body>
    ${opmlOutline(tree)}
  </body>
</opml>
`;
}

function toJson(tree) {
  return `${JSON.stringify(cloneData(tree), null, 2)}\n`;
}

function toInteractiveHtml(tree) {
  const pageTitle = pageTitleOf(tree);
  const data = JSON.stringify(cloneData(tree)).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(pageTitle)} · 思维导图</title>
<style>
  html, body {
    margin: 0; height: 100%; background: #fff; color: #111; overflow: hidden;
    font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
    font-size: 13px; line-height: 1.4;
  }
  svg { width: 100%; height: 100%; display: block; touch-action: none; cursor: grab; }
  svg.dragging { cursor: grabbing; }
  .hint {
    position: fixed; top: 14px; right: 18px; margin: 0;
    font-size: 13px; line-height: 1.4;
    color: #999; pointer-events: none;
  }
  .note-pop {
    position: fixed; z-index: 4; display: none;
    width: min(320px, calc(100vw - 24px));
    margin: 0; padding: 0;
    border: 1px solid #ddd; border-radius: 10px; background: #fff; color: #222;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.12); overflow: hidden;
  }
  .note-pop.show { display: block; }
  .note-pop .note-view {
    margin: 0; padding: 12px 14px; min-height: 72px; max-height: 240px; overflow: auto;
    font-size: 13px; line-height: 1.5;
    white-space: pre-wrap; word-break: break-word; color: #333;
  }
</style>
</head>
<body>
<svg id="map" role="img" aria-label="${escapeHtml(pageTitle)}思维导图"></svg>
<p class="hint">点击展开 · 点备注图标查看 · 拖拽移动 · ⌘/Ctrl + 滚轮或 +/- 缩放 · ⌘0 适应</p>
<div class="note-pop" id="notePop" role="dialog" aria-label="备注"><div class="note-view" id="noteView"></div></div>
<script>
const tree = ${data};
const NS = "http://www.w3.org/2000/svg";
const svg = document.getElementById("map");
const notePop = document.getElementById("notePop");
const noteView = document.getElementById("noteView");
const viewport = document.createElementNS(NS, "g");
svg.appendChild(viewport);
const GAP_X = 56, GAP_Y = 18, DESC_SIZE = 13, DESC_GAP = 4, NODE_ICON_W = 26, NOTE_ICON_W = 22;
const song = '"Songti SC", "STSongti-SC-Regular", "Noto Serif SC", serif';
const sans = '"PingFang SC", "Hiragino Sans GB", sans-serif';
const styles = [
  { size: 30, weight: 700, family: song, fill: "#111", h: 46 },
  { size: 22, weight: 700, family: song, fill: "#111", h: 38 },
  { size: 17, weight: 600, family: song, fill: "#111", h: 34 },
  { size: 15, weight: 500, family: sans, fill: "#111", h: 30 },
  { size: 14, weight: 400, family: sans, fill: "#333", h: 28 },
];
let noteNode = null;
function walk(node, depth, visit) {
  visit(node, depth);
  (node.children || []).forEach((child) => walk(child, depth + 1, visit));
}
function prepare(node) {
  walk(node, 0, (item, depth) => {
    item.depth = depth;
    if (item.open === undefined) item.open = depth < 2;
  });
}
const measure = document.createElement("canvas").getContext("2d");
function textWidth(text, font) {
  measure.font = font;
  return Math.ceil(measure.measureText(text).width);
}
function descText(node) { return node && node.desc ? String(node.desc).trim() : ""; }
function noteText(node) { return node && node.note != null ? String(node.note) : ""; }
function nodeHasNote(node) { return !!(node && String(node.note || "").trim()); }
function iconText(node) { return node && node.icon ? String(node.icon).trim() : ""; }
function screenPoint(x, y) { return { x: tx + x * scale, y: ty + y * scale }; }
function hideNotePop() {
  noteNode = null;
  notePop.classList.remove("show");
}
function positionNotePop(anchor) {
  const pad = 8;
  const width = notePop.offsetWidth || 280;
  const height = notePop.offsetHeight || 160;
  let left = anchor.left;
  let top = anchor.bottom + 8;
  if (left + width > window.innerWidth - pad) left = window.innerWidth - width - pad;
  if (top + height > window.innerHeight - pad) top = Math.max(pad, anchor.top - height - 8);
  if (left < pad) left = pad;
  if (top < pad) top = pad;
  notePop.style.left = left + "px";
  notePop.style.top = top + "px";
}
function openNote(node, event) {
  if (!node || !nodeHasNote(node)) return;
  noteNode = node;
  noteView.textContent = noteText(node);
  notePop.classList.add("show");
  const pt = event
    ? { left: event.clientX, top: event.clientY, bottom: event.clientY }
    : (() => {
        const x = node.x + node.iconW + node.labelW + 4;
        const y = node.y + node.h / 2;
        const sp = screenPoint(x, y);
        return { left: sp.x, top: sp.y - 10, bottom: sp.y + 10 };
      })();
  positionNotePop(pt);
  draw();
}
function layout(node) {
  const depth = Math.min(node.depth, styles.length - 1);
  node.style = styles[depth];
  const title = node.title || " ";
  const desc = descText(node);
  node.labelW = textWidth(title, node.style.weight + " " + node.style.size + "px " + node.style.family);
  if (desc) {
    node.labelW = Math.max(node.labelW, textWidth(desc, "400 " + DESC_SIZE + "px " + sans));
    node.h = node.style.h + DESC_SIZE + DESC_GAP;
  } else node.h = node.style.h;
  node.hasChildren = !!(node.children && node.children.length);
  node.marker = node.hasChildren && !node.open ? node.children.length : 0;
  node.markerW = node.hasChildren
    ? 24 + (node.marker ? textWidth(String(node.marker), "400 13px " + sans) + 8 : 0)
    : 0;
  node.iconW = NODE_ICON_W;
  node.noteW = nodeHasNote(node) ? NOTE_ICON_W : 0;
  node.w = node.iconW + node.labelW + node.noteW + node.markerW;
  if (!node.open || !node.hasChildren) { node.subtreeH = node.h; return; }
  node.children.forEach(layout);
  const inner = node.children.reduce((s, c) => s + c.subtreeH, 0) + GAP_Y * (node.children.length - 1);
  node.subtreeH = Math.max(node.h, inner);
}
function place(node, x, top) {
  node.x = x;
  if (!node.open || !node.hasChildren) { node.y = top + (node.subtreeH - node.h) / 2; return; }
  const inner = node.children.reduce((s, c) => s + c.subtreeH, 0) + GAP_Y * (node.children.length - 1);
  let y = top + (node.subtreeH - inner) / 2;
  node.children.forEach((child) => { place(child, x + node.w + GAP_X, y); y += child.subtreeH + GAP_Y; });
  const first = node.children[0], last = node.children[node.children.length - 1];
  node.y = (first.y + first.h / 2 + last.y + last.h / 2) / 2 - node.h / 2;
}
let tx = 48, ty = 36, scale = 1;
function apply() { viewport.setAttribute("transform", "translate(" + tx + " " + ty + ") scale(" + scale + ")"); }
function draw() {
  viewport.replaceChildren();
  const links = document.createElementNS(NS, "g");
  const nodes = document.createElementNS(NS, "g");
  viewport.append(links, nodes);
  function visit(node) {
    if (node.open) node.children.forEach((child) => {
      const x1 = node.x + node.w, y1 = node.y + node.h / 2, x2 = child.x, y2 = child.y + child.h / 2;
      const bend = Math.max(20, (x2 - x1) * 0.46);
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", "M " + x1 + " " + y1 + " C " + (x1 + bend) + " " + y1 + ", " + (x2 - bend) + " " + y2 + ", " + x2 + " " + y2);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "#111");
      path.setAttribute("stroke-width", node.depth === 0 ? 1.6 : 1);
      links.appendChild(path);
      visit(child);
    });
    const group = document.createElementNS(NS, "g");
    group.style.cursor = node.hasChildren ? "pointer" : "default";
    const layoutHasSub = node.h > node.style.h;
    const contentH = layoutHasSub ? node.style.size + DESC_GAP + DESC_SIZE : node.style.size;
    const contentTop = node.y + (node.h - contentH) / 2;
    const titleY = contentTop + node.style.size / 2;
    const textX = node.x + node.iconW;
    if (noteNode === node) {
      const sel = document.createElementNS(NS, "rect");
      sel.setAttribute("x", node.x - 10);
      sel.setAttribute("y", node.y + 2);
      sel.setAttribute("width", Math.max(node.iconW + node.labelW + (node.noteW ? 16 : 0), 48) + 20);
      sel.setAttribute("height", node.h - 4);
      sel.setAttribute("rx", 4);
      sel.setAttribute("fill", "#f0f0f0");
      group.appendChild(sel);
    }
    const hit = document.createElementNS(NS, "rect");
    hit.setAttribute("x", node.x - 8); hit.setAttribute("y", node.y);
    hit.setAttribute("width", node.w + 16); hit.setAttribute("height", node.h);
    hit.setAttribute("fill", "transparent");
    group.appendChild(hit);
    const icon = document.createElementNS(NS, "text");
    icon.setAttribute("x", node.x + node.iconW / 2 - 1);
    icon.setAttribute("y", titleY);
    icon.setAttribute("text-anchor", "middle");
    icon.setAttribute("dominant-baseline", "central");
    if (iconText(node)) { icon.textContent = iconText(node); icon.setAttribute("font-size", Math.max(14, Math.min(18, node.style.size - 2))); }
    else { icon.textContent = "○"; icon.setAttribute("fill", "#bbb"); icon.setAttribute("font-family", sans); icon.setAttribute("font-size", 12); }
    group.appendChild(icon);
    const label = document.createElementNS(NS, "text");
    label.setAttribute("x", textX); label.setAttribute("y", titleY);
    label.setAttribute("dominant-baseline", "central");
    label.setAttribute("fill", node.style.fill);
    label.setAttribute("font-family", node.style.family);
    label.setAttribute("font-size", node.style.size);
    label.setAttribute("font-weight", node.style.weight);
    label.textContent = node.title;
    group.appendChild(label);
    if (descText(node)) {
      const sub = document.createElementNS(NS, "text");
      sub.setAttribute("x", textX);
      sub.setAttribute("y", contentTop + node.style.size + DESC_GAP + DESC_SIZE / 2);
      sub.setAttribute("dominant-baseline", "central");
      sub.setAttribute("fill", "#888");
      sub.setAttribute("font-family", sans);
      sub.setAttribute("font-size", DESC_SIZE);
      sub.textContent = descText(node);
      group.appendChild(sub);
    }
    if (node.noteW) {
      const nx = node.x + node.iconW + node.labelW + 11;
      const ny = node.y + node.h / 2;
      const noteIcon = document.createElementNS(NS, "g");
      noteIcon.style.cursor = "pointer";
      const noteHit = document.createElementNS(NS, "circle");
      noteHit.setAttribute("cx", nx); noteHit.setAttribute("cy", ny); noteHit.setAttribute("r", 10);
      noteHit.setAttribute("fill", "transparent");
      noteIcon.appendChild(noteHit);
      const paper = document.createElementNS(NS, "path");
      paper.setAttribute("d", "M " + (nx - 5) + " " + (ny - 6) + " h 7 l 3 3 v 9 h -10 z M " + (nx + 2) + " " + (ny - 6) + " v 3 h 3");
      paper.setAttribute("fill", noteNode === node ? "#eee" : "#fff");
      paper.setAttribute("stroke", "#666");
      paper.setAttribute("stroke-width", 1.2);
      paper.setAttribute("stroke-linejoin", "round");
      noteIcon.appendChild(paper);
      noteIcon.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
        event.preventDefault();
        openNote(node, event);
      });
      group.appendChild(noteIcon);
    }
    if (node.hasChildren) {
      const mx = node.x + node.iconW + node.labelW + (node.noteW || 0) + 16, my = node.y + node.h / 2;
      const mark = document.createElementNS(NS, "circle");
      mark.setAttribute("cx", mx); mark.setAttribute("cy", my); mark.setAttribute("r", 7);
      mark.setAttribute("fill", "#fff"); mark.setAttribute("stroke", "#111"); mark.setAttribute("stroke-width", 1.2);
      group.appendChild(mark);
      const hline = document.createElementNS(NS, "path");
      hline.setAttribute("d", "M " + (mx - 3.2) + " " + my + " H " + (mx + 3.2));
      hline.setAttribute("stroke", "#111"); hline.setAttribute("stroke-width", 1.2); hline.setAttribute("fill", "none");
      group.appendChild(hline);
      if (!node.open) {
        const vline = document.createElementNS(NS, "path");
        vline.setAttribute("d", "M " + mx + " " + (my - 3.2) + " V " + (my + 3.2));
        vline.setAttribute("stroke", "#111"); vline.setAttribute("stroke-width", 1.2); vline.setAttribute("fill", "none");
        group.appendChild(vline);
      }
      if (node.marker) {
        const count = document.createElementNS(NS, "text");
        count.setAttribute("x", mx + 14); count.setAttribute("y", my);
        count.setAttribute("dominant-baseline", "central");
        count.setAttribute("fill", "#888"); count.setAttribute("font-family", sans); count.setAttribute("font-size", 13);
        count.textContent = String(node.marker);
        group.appendChild(count);
      }
    }
    group.addEventListener("pointerdown", (event) => { event.stopPropagation(); armDrag(event, node); });
    nodes.appendChild(group);
  }
  visit(tree); apply();
}
function relayout(anchor) {
  const before = anchor ? anchor.y : 0;
  layout(tree); place(tree, 0, 0);
  if (anchor) ty += (before - anchor.y) * scale;
  draw();
}
let drag = null;
function armDrag(event, node) {
  hideNotePop();
  drag = { x: event.clientX, y: event.clientY, tx, ty, moved: false, node };
  svg.setPointerCapture(event.pointerId);
}
svg.addEventListener("pointerdown", (event) => armDrag(event, null));
svg.addEventListener("pointermove", (event) => {
  if (!drag) return;
  const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
  if (!drag.moved && Math.hypot(dx, dy) < 5) return;
  drag.moved = true; svg.classList.add("dragging");
  tx = drag.tx + dx; ty = drag.ty + dy; apply();
});
function endDrag() {
  if (drag && !drag.moved && drag.node && drag.node.hasChildren) {
    drag.node.open = !drag.node.open; relayout(drag.node);
  }
  drag = null; svg.classList.remove("dragging");
}
svg.addEventListener("pointerup", endDrag);
svg.addEventListener("pointercancel", () => { drag = null; svg.classList.remove("dragging"); });
svg.addEventListener("wheel", (event) => {
  event.preventDefault();
  hideNotePop();
  if (event.ctrlKey || event.metaKey) {
    const next = Math.min(2.4, Math.max(0.35, scale * (event.deltaY < 0 ? 1.08 : 0.92)));
    const rect = svg.getBoundingClientRect();
    const px = event.clientX - rect.left, py = event.clientY - rect.top;
    tx = px - ((px - tx) * next) / scale; ty = py - ((py - ty) * next) / scale; scale = next;
  } else { tx -= event.deltaX; ty -= event.deltaY; }
  apply();
}, { passive: false });
window.addEventListener("pointerdown", (event) => {
  if (notePop.classList.contains("show") && !notePop.contains(event.target)) hideNotePop();
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && notePop.classList.contains("show")) {
    event.preventDefault();
    hideNotePop();
    draw();
    return;
  }
  const mod = event.metaKey || event.ctrlKey;
  if (
    mod &&
    (event.key === "=" ||
      event.key === "+" ||
      event.key === "-" ||
      event.key === "0" ||
      event.code === "NumpadAdd" ||
      event.code === "NumpadSubtract" ||
      event.code === "Numpad0")
  ) {
    event.preventDefault();
    hideNotePop();
    if (event.key === "0" || event.code === "Numpad0") {
      frame();
      return;
    }
    const zoomIn =
      event.key === "=" || event.key === "+" || event.code === "NumpadAdd";
    const next = Math.min(2.4, Math.max(0.35, scale * (zoomIn ? 1.2 : 1 / 1.2)));
    const rect = svg.getBoundingClientRect();
    const px = window.innerWidth / 2 - rect.left;
    const py = window.innerHeight / 2 - rect.top;
    tx = px - ((px - tx) * next) / scale;
    ty = py - ((py - ty) * next) / scale;
    scale = next;
    apply();
  }
});
notePop.addEventListener("pointerdown", (event) => event.stopPropagation());
function bounds() {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  (function scan(node) {
    minX = Math.min(minX, node.x); minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.w); maxY = Math.max(maxY, node.y + node.h);
    if (node.open) node.children.forEach(scan);
  })(tree);
  return { minX, minY, w: maxX - minX, h: maxY - minY };
}
function frame() {
  layout(tree); place(tree, 0, 0);
  const box = bounds(), pad = 40;
  const fitW = (window.innerWidth - pad * 2) / Math.max(box.w, 1);
  const fitH = (window.innerHeight - pad * 2) / Math.max(box.h, 1);
  const fit = Math.min(fitW, fitH);
  scale = Math.min(1, fit >= 0.78 ? fit : fitW);
  tx = (window.innerWidth - box.w * scale) / 2 - box.minX * scale;
  const fittedH = box.h * scale;
  ty = fittedH < window.innerHeight - pad
    ? (window.innerHeight - fittedH) / 2 - box.minY * scale
    : window.innerHeight / 2 - (tree.y + tree.h / 2) * scale;
  draw();
}
prepare(tree); frame();
window.addEventListener("resize", () => { hideNotePop(); frame(); });
</script>
</body>
</html>
`;
}

function indentWidth(prefix) {
  let width = 0;
  for (const ch of prefix) width += ch === "\t" ? 2 : 1;
  return width;
}

/**
 * Legacy inline `title :: desc` (still accepted on import).
 * Canonical form is an indented paragraph under the list item.
 */
export function parseTitleSubtitle(raw) {
  const text = String(raw || "").trim();
  const idx = text.indexOf("::");
  if (idx === -1) return { title: text, desc: "" };
  const title = text.slice(0, idx).trim();
  const desc = text.slice(idx + 2).trim();
  if (!title) return { title: text, desc: "" };
  return { title, desc };
}

/** Pull a leading emoji (incl. ZWJ sequences) when followed by more title text. */
export function splitLeadingIcon(raw) {
  const text = String(raw || "").trim();
  const match = text.match(
    /^(\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji_Modifier_Base})(?:\uFE0F|\uFE0E)?)*)\s+/u,
  );
  if (!match) return { icon: "", title: text };
  const rest = text.slice(match[0].length).trim();
  if (!rest) return { icon: "", title: text };
  return { icon: match[1], title: rest };
}

/** List label is icon + title; subtitle is nested paragraph content. */
export function formatListLabel(node) {
  const title = node && node.title != null ? String(node.title) : "";
  const icon = node && node.icon ? String(node.icon).trim() : "";
  return icon ? `${icon} ${title}` : title;
}

function nodeFromTitleLine(raw) {
  const headed = splitLeadingIcon(raw);
  const parts = parseTitleSubtitle(headed.title);
  const node = { title: parts.title, children: [] };
  if (parts.desc) node.desc = parts.desc;
  if (headed.icon) node.icon = headed.icon;
  return node;
}

function appendHostField(host, field, piece) {
  host[field] = host[field] ? `${host[field]}\n${piece}` : piece;
}

export function parseMarkdown(markdown) {
  const lines = String(markdown).split(/\r?\n/);
  const root = { title: "Mindmap", desc: "", children: [] };
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
        const headed = splitLeadingIcon(title);
        root.title = headed.title;
        if (headed.icon) root.icon = headed.icon;
        continue;
      }
      if (level === 2 && !sawList && !root.desc && root.children.length === 0) {
        root.desc = title;
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
      appendHostField(stack[stack.length - 1].node, "note", quote[2]);
      continue;
    }

    const item = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (item) {
      sawList = true;
      const indent = indentWidth(item[1]);
      const node = nodeFromTitleLine(item[2]);
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
      stack[stack.length - 1].node.children.push(node);
      stack.push({ indent, node });
      continue;
    }

    // Indented paragraph under the current list item → subtitle (CommonMark-ish).
    const para = line.match(/^(\s+)(.+)$/);
    if (para && sawList) {
      const host = stack[stack.length - 1];
      if (host.indent >= 0 && indentWidth(para[1]) > host.indent) {
        appendHostField(host.node, "desc", para[2]);
        continue;
      }
    }
  }

  if (!root.children.length) throw new Error("没有解析到任何大纲节点");
  return root;
}

const OUTLINE_LIST_RE = /^\s*[-*+]\s+\S/;
const OUTLINE_HEADING_RE = /^#{1,6}\s+\S/;
const OUTLINE_INDENTED_RE = /^[\t ]+\S/;

/**
 * Detect clipboard text that should expand into a subtree instead of a flat string.
 * Multi-line Markdown lists / headings, plain indented outlines, or a single list item
 * (node copy of a leaf).
 */
export function looksLikeOutlinePaste(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+$/, ""))
    .filter((line) => line.trim());
  if (!lines.length) return false;
  if (lines.length === 1) return OUTLINE_LIST_RE.test(lines[0]);

  let list = 0;
  let heading = 0;
  let indented = 0;
  for (const line of lines) {
    if (OUTLINE_LIST_RE.test(line)) list += 1;
    else if (OUTLINE_HEADING_RE.test(line)) heading += 1;
    else if (OUTLINE_INDENTED_RE.test(line)) indented += 1;
  }

  if (list >= 2) return true;
  if (list >= 1 && lines.length >= 2) return true;
  if (heading >= 1 && (list >= 1 || indented >= 1 || heading >= 2)) return true;
  if (indented >= 1 && lines.length >= 2) return true;
  return false;
}

/**
 * Serialize a node (and its descendants) as a Markdown list fragment for clipboard copy.
 * Unlike toMarkdown(), the node itself is a list item — suitable for pasteOutline.
 */
export function subtreeToOutline(node) {
  if (!node) return "";
  const lines = [];
  function walk(item, depth) {
    const pad = "  ".repeat(depth);
    lines.push(`${pad}- ${formatListLabel(item)}`);
    const nested = `${pad}  `;
    if (item.desc) appendParagraphLines(lines, item.desc, nested);
    if (item.note) appendNoteLines(lines, item.note, nested);
    (item.children || []).forEach((child) => walk(child, depth + 1));
  }
  walk(node, 0);
  lines.push("");
  return lines.join("\n");
}

/** Turn plain indented lines into Markdown list items when no list/heading markers exist. */
function normalizePlainOutline(text) {
  const raw = String(text || "");
  const lines = raw.split(/\r?\n/);
  const hasMarkup = lines.some(
    (line) => OUTLINE_LIST_RE.test(line) || OUTLINE_HEADING_RE.test(line),
  );
  if (hasMarkup) return raw;
  return lines
    .map((line) => {
      if (!line.trim()) return line;
      const match = line.match(/^(\s*)(.*)$/);
      return match ? `${match[1]}- ${match[2]}` : `- ${line}`;
    })
    .join("\n");
}

/**
 * Parse pasted outline text into child nodes for the paste target.
 * Document `# title` becomes the paste parent context and is not returned.
 */
export function parseOutlinePaste(text) {
  const root = parseMarkdown(normalizePlainOutline(text));
  return root.children.map((child) => cloneData(child));
}

function appendNoteLines(lines, note, prefix) {
  String(note).split(/\n/).forEach((noteLine) => {
    lines.push(`${prefix}> ${noteLine}`);
  });
}

function appendParagraphLines(lines, text, prefix) {
  String(text).split(/\n/).forEach((line) => {
    lines.push(`${prefix}${line}`);
  });
}

export function toMarkdown(node) {
  const rootLabel = node.icon ? `${node.icon} ${node.title}` : node.title;
  const lines = [`# ${rootLabel}`];
  if (node.desc) lines.push(`## ${node.desc}`);
  if (node.note) {
    lines.push("");
    appendNoteLines(lines, node.note, "");
  }
  lines.push("");
  function walk(item, depth) {
    const pad = "  ".repeat(depth);
    lines.push(`${pad}- ${formatListLabel(item)}`);
    const nested = `${pad}  `;
    if (item.desc) appendParagraphLines(lines, item.desc, nested);
    if (item.note) appendNoteLines(lines, item.note, nested);
    item.children.forEach((child) => walk(child, depth + 1));
  }
  node.children.forEach((child) => walk(child, 0));
  lines.push("");
  return lines.join("\n");
}

export function cloneData(node) {
  const out = { title: node.title, children: (node.children || []).map(cloneData) };
  if (node.desc) out.desc = node.desc;
  if (node.note) out.note = node.note;
  if (node.icon) out.icon = node.icon;
  if (typeof node.open === "boolean") out.open = node.open;
  else if (node.open) out.open = true;
  return out;
}

export function createRecentIconsStore(storage = globalThis.localStorage, key = RECENT_ICONS_KEY, limit = 24) {
  return {
    load() {
      if (!storage) return [];
      try {
        const raw = storage.getItem(key);
        if (!raw) return [];
        const data = JSON.parse(raw);
        if (!Array.isArray(data)) return [];
        return data.filter((item) => typeof item === "string" && item).slice(0, limit);
      } catch {
        return [];
      }
    },
    push(icon) {
      const value = String(icon || "").trim();
      if (!value || !storage) return this.load();
      const next = [value, ...this.load().filter((item) => item !== value)].slice(0, limit);
      storage.setItem(key, JSON.stringify(next));
      return next;
    },
  };
}

export function pageTitleOf(node) {
  return node.desc ? `${node.title} · ${node.desc}` : node.title;
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
  const base = raw.replace(new RegExp(`\\.(?:${DOWNLOAD_NAME_EXTS})$`, "i"), "");
  const safe = base.replace(/[\\/:*?"<>|]+/g, "-").trim() || "mindmap";
  return safe + ext;
}

export function buildDownload(tree, formatId = "markdown", name) {
  const format = DOWNLOAD_FORMATS.find((item) => item.id === formatId);
  if (!format || !format.available) {
    throw new Error(format ? `${format.label} 即将支持` : "未知格式");
  }
  const filename = normalizeDownloadName(name || tree.title, format.ext);
  if (format.id === "markdown") {
    return { filename, mime: format.mime, content: toMarkdown(tree) };
  }
  if (format.id === "xmind") {
    return { filename, mime: format.mime, content: toXmindBytes(tree) };
  }
  if (format.id === "html") {
    return { filename, mime: format.mime, content: toInteractiveHtml(tree) };
  }
  if (format.id === "opml") {
    return { filename, mime: format.mime, content: toOpml(tree) };
  }
  if (format.id === "json") {
    return { filename, mime: format.mime, content: toJson(tree) };
  }
  throw new Error(`${format.label} 即将支持`);
}

function unescapeXml(text) {
  return String(text)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function xmlAttr(attrs, name) {
  const dq = attrs.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i"));
  if (dq) return unescapeXml(dq[1]);
  const sq = attrs.match(new RegExp(`\\b${name}\\s*=\\s*'([^']*)'`, "i"));
  if (sq) return unescapeXml(sq[1]);
  return "";
}

/** Split export-joined notes (`desc\\n\\nnote`) back into fields. */
function applyJoinedNotes(node, notes) {
  const text = String(notes || "").replace(/^\uFEFF/, "").trimEnd();
  if (!text.trim()) return;
  const parts = text.split(/\n\n/);
  if (parts.length >= 2) {
    node.desc = parts[0];
    node.note = parts.slice(1).join("\n\n");
  } else {
    node.note = text;
  }
}

function nodeFromTopicTitle(raw) {
  const headed = splitLeadingIcon(String(raw || "").trim() || "未命名");
  const node = { title: headed.title || "未命名", children: [] };
  if (headed.icon) node.icon = headed.icon;
  return node;
}

export function normalizeImportedTree(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("无效的导图 JSON");
  }
  const node = {
    title: data.title != null ? String(data.title) : "Mindmap",
    children: Array.isArray(data.children)
      ? data.children.map((child) => normalizeImportedTree(child))
      : [],
  };
  if (data.desc != null && String(data.desc)) node.desc = String(data.desc);
  if (data.note != null && String(data.note)) node.note = String(data.note);
  if (data.icon != null && String(data.icon).trim()) node.icon = String(data.icon).trim();
  if (typeof data.open === "boolean") node.open = data.open;
  return node;
}

/** Share payload lives in the URL hash: `#v1=<base64url(deflate-raw(json))>`. */
export const SHARE_HASH_PREFIX = "v1=";
/** First-party short-link API (public repo: vvenv/short). */
export const SHARE_API_ORIGIN = "https://s.wenfu.dev";
/** External shorteners usually reject very long destinations; above this, skip them. */
export const EXTERNAL_SHORTEN_MAX_LEN = 3500;

const SHARE_SHORTEN_PROVIDERS = [
  { id: "isgd", endpoint: "https://is.gd/create.php" },
  { id: "vgd", endpoint: "https://v.gd/create.php" },
];

const SHARE_ID_RE = /^[A-Za-z0-9_-]{4,32}$/;

function bytesToBase64Url(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(text) {
  const normalized = String(text || "").replace(/-/g, "+").replace(/_/g, "/");
  if (!normalized || /[^A-Za-z0-9+/=]/.test(normalized)) {
    throw new Error("无效的分享载荷");
  }
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const binary = atob(normalized + pad);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function deflateRawBytes(bytes) {
  if (typeof CompressionStream === "undefined") {
    throw new Error("当前环境不支持压缩");
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function inflateRawBytes(bytes) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("当前环境不支持解压");
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function encodeSharePayload(tree) {
  const json = JSON.stringify(cloneData(tree));
  const compressed = await deflateRawBytes(new TextEncoder().encode(json));
  return bytesToBase64Url(compressed);
}

export async function decodeSharePayload(payload) {
  const inflated = await inflateRawBytes(base64UrlToBytes(payload));
  let data;
  try {
    data = JSON.parse(new TextDecoder().decode(inflated));
  } catch {
    throw new Error("无效的分享载荷");
  }
  return normalizeImportedTree(data);
}

export async function buildShareHash(tree) {
  return `#${SHARE_HASH_PREFIX}${await encodeSharePayload(tree)}`;
}

/** Parse `#v1=...` (or raw `v1=...`). Returns null when absent or invalid. */
export async function parseShareHash(hash) {
  const raw = String(hash || "").replace(/^#/, "");
  if (!raw.startsWith(SHARE_HASH_PREFIX)) return null;
  const payload = raw.slice(SHARE_HASH_PREFIX.length);
  if (!payload) return null;
  try {
    return await decodeSharePayload(payload);
  } catch {
    return null;
  }
}

/** Build `https://host/#v1=...` long share URL. */
export async function buildShareLongUrl(tree, origin) {
  const base = String(origin || "").replace(/\/$/, "") || "";
  const hash = await buildShareHash(tree);
  return `${base}/${hash}`;
}

export function preferExternalShorten(urlLength) {
  return Number(urlLength) <= EXTERNAL_SHORTEN_MAX_LEN;
}

/** Read `?s=<id>` from a search string. */
export function parseShareIdFromSearch(search) {
  const params = new URLSearchParams(String(search || "").replace(/^\?/, ""));
  const id = params.get("s");
  return id && SHARE_ID_RE.test(id) ? id : null;
}

/**
 * Create a first-party short link via s.wenfu.dev.
 * @returns {{ shortUrl: string, provider: string, id: string }}
 */
export async function shortenWithBuiltin(
  payload,
  { apiOrigin = SHARE_API_ORIGIN, fetchImpl = globalThis.fetch } = {},
) {
  if (typeof fetchImpl !== "function") {
    throw new Error("当前环境无法请求短链服务");
  }
  const body = String(payload || "");
  if (!body) throw new Error("缺少分享载荷");
  const base = String(apiOrigin || SHARE_API_ORIGIN).replace(/\/$/, "");
  const response = await fetchImpl(`${base}/api`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload: body }),
  });
  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const err = await response.json();
      if (err && err.error) detail = err.error;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  const data = await response.json();
  if (!data || typeof data.url !== "string" || !data.url) {
    throw new Error("无短链返回");
  }
  return { shortUrl: data.url, provider: "swenfu", id: data.id || "" };
}

/** Fetch a stored share payload by short id. */
export async function fetchSharePayload(
  id,
  { apiOrigin = SHARE_API_ORIGIN, fetchImpl = globalThis.fetch } = {},
) {
  if (typeof fetchImpl !== "function") {
    throw new Error("当前环境无法请求短链服务");
  }
  if (!SHARE_ID_RE.test(String(id || ""))) {
    throw new Error("无效的短链 id");
  }
  const base = String(apiOrigin || SHARE_API_ORIGIN).replace(/\/$/, "");
  const response = await fetchImpl(`${base}/api/${encodeURIComponent(id)}`);
  if (response.status === 404) throw new Error("短链不存在或已失效");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (!data || typeof data.payload !== "string" || !data.payload) {
    throw new Error("无效的短链载荷");
  }
  return data.payload;
}

/**
 * Shorten via is.gd then v.gd (CORS-friendly, no API key).
 * @returns {{ shortUrl: string, provider: string }}
 */
export async function shortenWithExternal(longUrl, { fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("当前环境无法请求短链服务");
  }
  const target = String(longUrl || "");
  if (!target) throw new Error("缺少要缩短的链接");
  const errors = [];
  for (const provider of SHARE_SHORTEN_PROVIDERS) {
    try {
      const api = `${provider.endpoint}?format=json&url=${encodeURIComponent(target)}`;
      const response = await fetchImpl(api);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data && typeof data.shorturl === "string" && data.shorturl) {
        return { shortUrl: data.shorturl, provider: provider.id };
      }
      throw new Error((data && data.errormessage) || "无短链返回");
    } catch (error) {
      errors.push(`${provider.id}: ${error && error.message ? error.message : error}`);
    }
  }
  throw new Error(errors.join("; ") || "短链失败");
}

/**
 * Build long URL, then prefer first-party short link; fall back to external / long-only.
 * Always returns longUrl; shortUrl is null when all shorteners fail.
 */
export async function createShareLinks(
  tree,
  origin,
  { fetchImpl = globalThis.fetch, shareApiOrigin = SHARE_API_ORIGIN } = {},
) {
  const payload = await encodeSharePayload(tree);
  const longUrl = await buildShareLongUrl(tree, origin);
  try {
    const built = await shortenWithBuiltin(payload, {
      apiOrigin: shareApiOrigin,
      fetchImpl,
    });
    return {
      longUrl,
      shortUrl: built.shortUrl,
      provider: built.provider,
      shortened: true,
    };
  } catch {
    /* fall through */
  }
  if (preferExternalShorten(longUrl.length)) {
    try {
      const { shortUrl, provider } = await shortenWithExternal(longUrl, { fetchImpl });
      return { longUrl, shortUrl, provider, shortened: true };
    } catch {
      /* fall through */
    }
  }
  return { longUrl, shortUrl: null, provider: null, shortened: false };
}

export function parseJsonTree(text) {
  let data;
  try {
    data = JSON.parse(String(text));
  } catch {
    throw new Error("无效的 JSON");
  }
  return normalizeImportedTree(data);
}

function parseOpmlOutlines(fragment) {
  const re = /<outline\b([^>]*)>|<\/outline>/gi;
  const stack = [{ children: [] }];
  let match;
  while ((match = re.exec(fragment))) {
    const token = match[0];
    if (token.startsWith("</")) {
      if (stack.length < 2) continue;
      const node = stack.pop();
      stack[stack.length - 1].children.push(node);
      continue;
    }
    const attrs = match[1] || "";
    const selfClose = /\/\s*$/.test(attrs);
    const clean = attrs.replace(/\/\s*$/, "");
    const node = nodeFromTopicTitle(xmlAttr(clean, "text") || xmlAttr(clean, "title"));
    const note = xmlAttr(clean, "_note") || xmlAttr(clean, "note");
    if (note) applyJoinedNotes(node, note);
    if (selfClose) stack[stack.length - 1].children.push(node);
    else stack.push(node);
  }
  while (stack.length > 1) {
    const node = stack.pop();
    stack[stack.length - 1].children.push(node);
  }
  return stack[0].children;
}

export function parseOpml(text) {
  const src = String(text);
  if (!/<opml\b/i.test(src)) throw new Error("不是有效的 OPML");
  const body = src.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  if (!body) throw new Error("OPML 缺少 body");
  const roots = parseOpmlOutlines(body[1]);
  if (!roots.length) throw new Error("没有解析到任何大纲节点");
  if (roots.length === 1) return roots[0];
  const headTitle = src.match(/<head\b[^>]*>[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = headTitle ? unescapeXml(headTitle[1]).trim() : "Mindmap";
  return { title: title || "Mindmap", children: roots };
}

function extractJsonObject(source, marker) {
  const idx = String(source).indexOf(marker);
  if (idx < 0) return null;
  let i = idx + marker.length;
  while (i < source.length && /\s/.test(source[i])) i += 1;
  if (source[i] !== "{" && source[i] !== "[") return null;
  let depth = 0;
  let inStr = false;
  let escape = false;
  for (let j = i; j < source.length; j += 1) {
    const ch = source[j];
    if (inStr) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{" || ch === "[") depth += 1;
    else if (ch === "}" || ch === "]") {
      depth -= 1;
      if (depth === 0) return source.slice(i, j + 1);
    }
  }
  return null;
}

export function parseInteractiveHtml(html) {
  const raw =
    extractJsonObject(html, "const tree =") ||
    extractJsonObject(html, "const tree=") ||
    extractJsonObject(html, "var tree =") ||
    extractJsonObject(html, "let tree =");
  if (!raw) throw new Error("HTML 中未找到导图数据");
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("HTML 导图数据无效");
  }
  return normalizeImportedTree(data);
}

function fromXmindTopic(topic) {
  if (!topic || typeof topic !== "object") throw new Error("无效的 XMind 主题");
  const node = nodeFromTopicTitle(topic.title);
  const plain = topic.notes && topic.notes.plain;
  const notes =
    plain && typeof plain === "object" && plain.content != null
      ? plain.content
      : typeof plain === "string"
        ? plain
        : "";
  if (notes) applyJoinedNotes(node, notes);
  const attached =
    (topic.children && (topic.children.attached || topic.children.detached)) || [];
  if (Array.isArray(attached)) node.children = attached.map(fromXmindTopic);
  return node;
}

function parseXmindContentJson(text) {
  let sheets;
  try {
    sheets = JSON.parse(String(text));
  } catch {
    throw new Error("无效的 XMind content.json");
  }
  const sheet = Array.isArray(sheets) ? sheets[0] : sheets;
  if (!sheet || !sheet.rootTopic) throw new Error("XMind 缺少根主题");
  return fromXmindTopic(sheet.rootTopic);
}

function parseXmindContentXml(text) {
  const src = String(text);
  const titleRe = /<title[^>]*>([\s\S]*?)<\/title>/i;
  const rootMatch = src.match(/<topic\b[^>]*>/i);
  if (!rootMatch) throw new Error("XMind 缺少根主题");

  function parseTopics(fragment) {
    const re = /<topic\b([^>]*)>|<\/topic>/gi;
    const stack = [{ children: [] }];
    let match;
    while ((match = re.exec(fragment))) {
      const token = match[0];
      if (token.startsWith("</")) {
        if (stack.length < 2) continue;
        const node = stack.pop();
        stack[stack.length - 1].children.push(node);
        continue;
      }
      const attrs = match[1] || "";
      const selfClose = /\/\s*$/.test(attrs);
      const start = match.index + token.length;
      let title = "未命名";
      if (!selfClose) {
        const rest = fragment.slice(start);
        const titleMatch = rest.match(titleRe);
        if (titleMatch && rest.slice(0, titleMatch.index).indexOf("<topic") === -1) {
          title = unescapeXml(titleMatch[1]).trim() || "未命名";
        }
      }
      const node = nodeFromTopicTitle(title);
      if (selfClose) stack[stack.length - 1].children.push(node);
      else stack.push(node);
    }
    while (stack.length > 1) {
      const node = stack.pop();
      stack[stack.length - 1].children.push(node);
    }
    return stack[0].children;
  }

  const sheetBody = src.match(/<sheet\b[^>]*>([\s\S]*?)<\/sheet>/i);
  const scope = sheetBody ? sheetBody[1] : src;
  const topics = parseTopics(scope);
  if (!topics.length) throw new Error("没有解析到任何大纲节点");
  return topics[0];
}

export async function parseXmind(buffer) {
  const entries = await unzipEntries(buffer);
  const decoder = new TextDecoder();
  const byName = new Map(entries.map((entry) => [entry.name.replace(/^\.\//, ""), entry]));
  const json =
    byName.get("content.json") ||
    entries.find((entry) => /(?:^|\/)content\.json$/i.test(entry.name));
  if (json) return parseXmindContentJson(decoder.decode(json.data));
  const xml =
    byName.get("content.xml") ||
    entries.find((entry) => /(?:^|\/)content\.xml$/i.test(entry.name));
  if (xml) return parseXmindContentXml(decoder.decode(xml.data));
  throw new Error("XMind 中未找到 content.json / content.xml");
}

/**
 * Guess import format from filename, MIME, and an optional text sample.
 * Binary `.xmind` should be detected by name/MIME before reading as text.
 */
export function detectImportFormat(name = "", mime = "", sample = "") {
  const lower = String(name || "").toLowerCase();
  if (/\.xmind$/i.test(lower)) return "xmind";
  if (/\.opml$/i.test(lower)) return "opml";
  if (/\.json$/i.test(lower)) return "json";
  if (/\.html?$/i.test(lower)) return "html";
  if (/\.(md|markdown|txt)$/i.test(lower)) return "markdown";
  const type = String(mime || "").toLowerCase();
  if (type.includes("xmind")) return "xmind";
  if (type.includes("json")) return "json";
  if (type.includes("html")) return "html";
  if (type.includes("opml") || type === "text/xml" || type === "application/xml") {
    if (/<opml\b/i.test(sample) || !sample) return "opml";
  }
  const head = String(sample || "").slice(0, 4000).trim();
  if (/^PK\x03\x04/.test(head)) return "xmind";
  if (/<opml\b/i.test(head)) return "opml";
  if (/<!DOCTYPE\s+html|<html\b/i.test(head)) return "html";
  if (/^[\[{]/.test(head)) {
    try {
      const data = JSON.parse(sample);
      if (data && typeof data === "object" && ("title" in data || "children" in data)) {
        return "json";
      }
    } catch {
      /* fall through */
    }
  }
  return "markdown";
}

export function isImportableFile(file) {
  if (!file) return false;
  const name = file.name || "";
  if (IMPORT_NAME_RE.test(name)) return true;
  const type = file.type || "";
  if (type && IMPORT_MIME_RE.test(type)) return true;
  if (type && /^text\//i.test(type)) return true;
  return false;
}

export function parseImportText(text, format = "markdown") {
  if (format === "json") return parseJsonTree(text);
  if (format === "opml") return parseOpml(text);
  if (format === "html") return parseInteractiveHtml(text);
  if (format === "markdown") return parseMarkdown(text);
  throw new Error("未知导入格式");
}

/** Parse a File/Blob (or preloaded buffer/text) into a mindmap tree. */
export async function parseImportFile(file, options = {}) {
  const name = options.name || (file && file.name) || "";
  const type = options.type || (file && file.type) || "";
  const formatHint = options.format || detectImportFormat(name, type, "");

  if (formatHint === "xmind") {
    let buffer;
    if (file instanceof ArrayBuffer) buffer = file;
    else if (file instanceof Uint8Array) buffer = file;
    else if (file && typeof file.arrayBuffer === "function") buffer = await file.arrayBuffer();
    else throw new Error("无法读取 XMind 文件");
    return { tree: await parseXmind(buffer), format: "xmind" };
  }

  let text;
  if (typeof file === "string") text = file;
  else if (file instanceof ArrayBuffer) text = new TextDecoder().decode(file);
  else if (file instanceof Uint8Array) text = new TextDecoder().decode(file);
  else if (file && typeof file.text === "function") text = await file.text();
  else throw new Error("无法读取导入文件");

  const format = options.format || detectImportFormat(name, type, text);
  if (format === "xmind") {
    const encoded = new TextEncoder().encode(text);
    return { tree: await parseXmind(encoded.buffer), format: "xmind" };
  }
  return { tree: parseImportText(text, format), format };
}

export function createLocalStore(storage = globalThis.localStorage, key = STORAGE_KEY) {
  return {
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
  };
}
