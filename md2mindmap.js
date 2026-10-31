#!/usr/bin/env node
/**
 * 把讲稿导出成思维导图。
 *
 * 中心是标题，往右展开：部分 → 小节 → 每页主标题 → 关键句。
 * 口播不进导图。
 *
 *   node md2mindmap.js
 *   node md2mindmap.js 打不过就加入.md
 */

const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { parse } = require("./md2slides");

function buildTree(slides) {
  const root = { title: "打不过就加入", children: [] };
  let chapter = null;
  let subsection = null;
  for (const slide of slides) {
    if (!chapter || chapter.title !== slide.chapter) {
      chapter = { title: slide.chapter, children: [] };
      root.children.push(chapter);
      subsection = null;
    }
    const subTitle = slide.subsection || "未分组";
    if (!subsection || subsection.title !== subTitle) {
      subsection = { title: subTitle, children: [] };
      chapter.children.push(subsection);
    }
    subsection.children.push({
      title: `${slide.number}. ${slide.title}`,
      children: slide.points.map((title) => ({ title, children: [] })),
    });
  }
  return root;
}

function writeXmind(tree, outPath) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mindmap-"));
  let seq = 0;
  const id = () => `t${++seq}`;
  function topic(node, isRoot) {
    const item = { id: id(), class: "topic", title: node.title };
    if (isRoot) item.structureClass = "org.xmind.ui.logic.right";
    if (node.children.length) {
      item.children = { attached: node.children.map((child) => topic(child, false)) };
    }
    return item;
  }
  const sheet = {
    id: id(),
    class: "sheet",
    title: tree.title,
    rootTopic: topic(tree, true),
  };
  fs.writeFileSync(path.join(dir, "content.json"), JSON.stringify([sheet]));
  fs.writeFileSync(
    path.join(dir, "metadata.json"),
    JSON.stringify({
      dataStructureVersion: "2",
      layoutEngineVersion: "3",
      creator: { name: "md2mindmap", version: "1.0.0" },
    }),
  );
  fs.writeFileSync(
    path.join(dir, "manifest.json"),
    JSON.stringify({ "file-entries": { "content.json": {}, "metadata.json": {} } }),
  );
  fs.rmSync(outPath, { force: true });
  execFileSync("zip", ["-X", "-j", outPath, "content.json", "metadata.json", "manifest.json"], { cwd: dir });
  fs.rmSync(dir, { recursive: true, force: true });
}

function writeHtml(tree, outPath) {
  const data = JSON.stringify(tree).replace(/</g, "\\u003c");
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>打不过就加入 · 思维导图</title>
<style>
  html, body { margin: 0; height: 100%; background: #fff; color: #111; overflow: hidden; }
  svg { width: 100%; height: 100%; display: block; touch-action: none; cursor: grab; }
  svg.dragging { cursor: grabbing; }
  .hint {
    position: fixed; top: 14px; right: 18px; margin: 0;
    font: 13px/1.4 "PingFang SC", "Hiragino Sans GB", sans-serif;
    color: #999; pointer-events: none;
  }
</style>
</head>
<body>
<svg id="map" role="img" aria-label="打不过就加入思维导图"></svg>
<p class="hint">点击展开 · 拖拽移动 · 按住 ⌘ 滚轮缩放</p>
<script>
const tree = ${data};
const NS = "http://www.w3.org/2000/svg";
const svg = document.getElementById("map");
const viewport = document.createElementNS(NS, "g");
svg.appendChild(viewport);

const GAP_X = 56;
const GAP_Y = 18;
const song = '"Songti SC", "STSongti-SC-Regular", "Noto Serif SC", serif';
const sans = '"PingFang SC", "Hiragino Sans GB", sans-serif';
const styles = [
  { size: 30, weight: 700, family: song, fill: "#111", h: 46 },
  { size: 22, weight: 700, family: song, fill: "#111", h: 38 },
  { size: 17, weight: 600, family: song, fill: "#111", h: 34 },
  { size: 15, weight: 500, family: sans, fill: "#111", h: 30 },
  { size: 14, weight: 400, family: sans, fill: "#333", h: 28 },
];

function walk(node, depth, visit) {
  visit(node, depth);
  node.children.forEach((child) => walk(child, depth + 1, visit));
}
walk(tree, 0, (node, depth) => {
  node.depth = depth;
  node.open = depth < 3;
});

const measureCanvas = document.createElement("canvas").getContext("2d");
function textWidth(text, font) {
  measureCanvas.font = font;
  return Math.ceil(measureCanvas.measureText(text).width);
}

function layout(node) {
  const depth = Math.min(node.depth, styles.length - 1);
  node.style = styles[depth];
  node.h = node.style.h;
  node.labelW = textWidth(node.title, node.style.weight + " " + node.style.size + "px " + node.style.family);
  node.hasChildren = node.children.length > 0;
  node.marker = node.hasChildren && !node.open ? node.children.length : 0;
  node.markerW = node.hasChildren ? 24 + (node.marker ? textWidth(String(node.marker), "400 13px " + sans) + 8 : 0) : 0;
  node.w = node.labelW + node.markerW;
  if (!node.open || !node.hasChildren) {
    node.subtreeH = node.h;
    return;
  }
  node.children.forEach(layout);
  const inner = node.children.reduce((sum, child) => sum + child.subtreeH, 0) + GAP_Y * (node.children.length - 1);
  node.subtreeH = Math.max(node.h, inner);
}

function place(node, x, top) {
  node.x = x;
  if (!node.open || !node.hasChildren) {
    node.y = top + (node.subtreeH - node.h) / 2;
    return;
  }
  const inner = node.children.reduce((sum, child) => sum + child.subtreeH, 0) + GAP_Y * (node.children.length - 1);
  let y = top + (node.subtreeH - inner) / 2;
  node.children.forEach((child) => {
    place(child, x + node.w + GAP_X, y);
    y += child.subtreeH + GAP_Y;
  });
  const first = node.children[0];
  const last = node.children[node.children.length - 1];
  const mid = (first.y + first.h / 2 + last.y + last.h / 2) / 2;
  node.y = mid - node.h / 2;
}

let tx = 48;
let ty = 36;
let scale = 1;

function draw() {
  viewport.replaceChildren();
  const links = document.createElementNS(NS, "g");
  const nodes = document.createElementNS(NS, "g");
  viewport.append(links, nodes);
  function visit(node) {
    if (node.open) {
      node.children.forEach((child) => {
        const x1 = node.x + node.w;
        const y1 = node.y + node.h / 2;
        const x2 = child.x;
        const y2 = child.y + child.h / 2;
        const bend = Math.max(20, (x2 - x1) * 0.46);
        const path = document.createElementNS(NS, "path");
        path.setAttribute("d", "M " + x1 + " " + y1 + " C " + (x1 + bend) + " " + y1 + ", " + (x2 - bend) + " " + y2 + ", " + x2 + " " + y2);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "#111");
        path.setAttribute("stroke-width", node.depth === 0 ? 1.6 : 1);
        links.appendChild(path);
        visit(child);
      });
    }
    const group = document.createElementNS(NS, "g");
    group.setAttribute("data-id", node.title + "@" + node.depth + "@" + node.x);
    group.style.cursor = node.hasChildren ? "pointer" : "default";
    const hit = document.createElementNS(NS, "rect");
    hit.setAttribute("x", node.x - 8);
    hit.setAttribute("y", node.y);
    hit.setAttribute("width", node.w + 16);
    hit.setAttribute("height", node.h);
    hit.setAttribute("fill", "transparent");
    group.appendChild(hit);
    const label = document.createElementNS(NS, "text");
    label.setAttribute("x", node.x);
    label.setAttribute("y", node.y + node.h / 2);
    label.setAttribute("dominant-baseline", "central");
    label.setAttribute("fill", node.style.fill);
    label.setAttribute("font-family", node.style.family);
    label.setAttribute("font-size", node.style.size);
    label.setAttribute("font-weight", node.style.weight);
    label.textContent = node.title;
    group.appendChild(label);
    if (node.hasChildren) {
      const mx = node.x + node.labelW + 16;
      const my = node.y + node.h / 2;
      const mark = document.createElementNS(NS, "circle");
      mark.setAttribute("cx", mx);
      mark.setAttribute("cy", my);
      mark.setAttribute("r", 7);
      mark.setAttribute("fill", "#fff");
      mark.setAttribute("stroke", "#111");
      mark.setAttribute("stroke-width", 1.2);
      group.appendChild(mark);
      const hline = document.createElementNS(NS, "path");
      hline.setAttribute("d", "M " + (mx - 3.2) + " " + my + " H " + (mx + 3.2));
      hline.setAttribute("stroke", "#111");
      hline.setAttribute("stroke-width", 1.2);
      hline.setAttribute("fill", "none");
      group.appendChild(hline);
      if (!node.open) {
        const vline = document.createElementNS(NS, "path");
        vline.setAttribute("d", "M " + mx + " " + (my - 3.2) + " V " + (my + 3.2));
        vline.setAttribute("stroke", "#111");
        vline.setAttribute("stroke-width", 1.2);
        vline.setAttribute("fill", "none");
        group.appendChild(vline);
      }
      if (node.marker) {
        const count = document.createElementNS(NS, "text");
        count.setAttribute("x", mx + 14);
        count.setAttribute("y", my);
        count.setAttribute("dominant-baseline", "central");
        count.setAttribute("fill", "#888");
        count.setAttribute("font-family", sans);
        count.setAttribute("font-size", 13);
        count.setAttribute("font-weight", 400);
        count.textContent = String(node.marker);
        group.appendChild(count);
      }
    }
    group.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      armDrag(event, node);
    });
    nodes.appendChild(group);
  }
  visit(tree);
  apply();
}

function apply() {
  viewport.setAttribute("transform", "translate(" + tx + " " + ty + ") scale(" + scale + ")");
}

function relayout(anchor) {
  const before = anchor ? anchor.y : 0;
  layout(tree);
  place(tree, 0, 0);
  if (anchor) ty += (before - anchor.y) * scale;
  draw();
}

let drag = null;
function armDrag(event, node) {
  drag = { x: event.clientX, y: event.clientY, tx, ty, moved: false, node };
  svg.setPointerCapture(event.pointerId);
}
svg.addEventListener("pointerdown", (event) => armDrag(event, null));
svg.addEventListener("pointermove", (event) => {
  if (!drag) return;
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  if (!drag.moved && Math.hypot(dx, dy) < 5) return;
  drag.moved = true;
  svg.classList.add("dragging");
  tx = drag.tx + dx;
  ty = drag.ty + dy;
  apply();
});
function endDrag() {
  if (drag && !drag.moved && drag.node && drag.node.hasChildren) {
    drag.node.open = !drag.node.open;
    relayout(drag.node);
  }
  drag = null;
  svg.classList.remove("dragging");
}
svg.addEventListener("pointerup", endDrag);
svg.addEventListener("pointercancel", () => { drag = null; svg.classList.remove("dragging"); });
svg.addEventListener("wheel", (event) => {
  event.preventDefault();
  if (event.ctrlKey || event.metaKey) {
    const next = Math.min(2.4, Math.max(0.35, scale * (event.deltaY < 0 ? 1.08 : 0.92)));
    const rect = svg.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    tx = px - ((px - tx) * next) / scale;
    ty = py - ((py - ty) * next) / scale;
    scale = next;
  } else {
    tx -= event.deltaX;
    ty -= event.deltaY;
  }
  apply();
}, { passive: false });

function bounds() {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  (function scan(node) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.w);
    maxY = Math.max(maxY, node.y + node.h);
    if (node.open) node.children.forEach(scan);
  })(tree);
  return { minX, minY, w: maxX - minX, h: maxY - minY };
}
function frame(anchor) {
  layout(tree);
  place(tree, 0, 0);
  const box = bounds();
  const pad = 40;
  if (!anchor) {
    const fitW = (window.innerWidth - pad * 2) / box.w;
    const fitH = (window.innerHeight - pad * 2) / box.h;
    const fit = Math.min(fitW, fitH);
    scale = Math.min(1, fit >= 0.78 ? fit : fitW);
    tx = (window.innerWidth - box.w * scale) / 2 - box.minX * scale;
    const fittedH = box.h * scale;
    ty = fittedH < window.innerHeight - pad
      ? (window.innerHeight - fittedH) / 2 - box.minY * scale
      : window.innerHeight / 2 - (tree.y + tree.h / 2) * scale;
  }
  draw();
}
frame(null);
window.addEventListener("resize", () => frame(null));
</script>
</body>
</html>
`;
  fs.writeFileSync(outPath, html);
}

function main() {
  const input = path.resolve(process.argv[2] || path.join(__dirname, "打不过就加入.md"));
  const base = input.replace(/\.md$/i, "");
  const slides = parse(fs.readFileSync(input, "utf8"));
  const tree = buildTree(slides);
  const xmind = `${base}.xmind`;
  const html = `${base}-思维导图.html`;
  writeXmind(tree, xmind);
  writeHtml(tree, html);
  const leaves = slides.reduce((sum, slide) => sum + slide.points.length, 0);
  console.log(`${slides.length} pages, ${leaves} key lines`);
  console.log(xmind);
  console.log(html);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message || error);
    process.exit(1);
  }
}
