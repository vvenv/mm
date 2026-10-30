#!/usr/bin/env node
/**
 * 把讲稿 Markdown 直接做成 Keynote。
 *
 * 屏上是副标题和主标题（主标题里的 ｜ 换成换行）。口播写进演讲者备注。
 * 通过 Keynote 自己的脚本接口建文档，不经过 PowerPoint。
 *
 *   node md2slides.js
 *   node md2slides.js 打不过就加入.md 打不过就加入.key
 */

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const SLIDE_W = 1920;
const SLIDE_H = 1080;
const TEXT_W = 1680;
const TITLE_FONT = "STSongti-SC-Bold";
const BODY_FONT = "PingFangSC-Regular";

const INK = "000000";

function cleanMarker(text) {
  return text.replace(/\s*·\s*[🆕✏️]\s*$/u, "").replace(/[🆕✏️]/gu, "").trim();
}

function sameText(a, b) {
  return String(a || "").replace(/\s+/g, "") === String(b || "").replace(/\s+/g, "");
}

function parse(markdown) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => /^## [^#]/.test(line) && line.includes("我的 AI 经验"));
  if (start < 0) throw new Error("找不到正文起始的「## 一、我的 AI 经验」");

  let chapter = "";
  let subsection = "";
  const slides = [];
  let current = null;

  function flush() {
    if (!current) return;
    slides.push(finish(current));
    current = null;
  }

  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    if (/^## (附录|下一步|图例)/.test(line)) {
      flush();
      break;
    }

    const slideHead = line.match(/^####\s+(\d+)\.\s+(.+)$/);
    if (slideHead) {
      flush();
      current = {
        number: Number(slideHead[1]),
        heading: cleanMarker(slideHead[2]),
        chapter,
        subsection,
        kicker: "",
        title: "",
        notes: [],
        inNotes: false,
      };
      continue;
    }

    const sub = line.match(/^###\s+(.+)$/);
    if (sub) {
      flush();
      subsection = sub[1].trim();
      continue;
    }

    const ch = line.match(/^##\s+(.+)$/);
    if (ch) {
      flush();
      chapter = ch[1].trim();
      subsection = "";
      continue;
    }

    if (!current) continue;
    if (/^---\s*$/.test(line)) {
      current.inNotes = false;
      continue;
    }

    const kicker = line.match(/^-\s+\*\*副标题\*\*:\s*(.+)$/);
    if (kicker) {
      current.kicker = kicker[1].trim();
      continue;
    }
    const title = line.match(/^-\s+\*\*主标题\*\*:\s*(.+)$/);
    if (title) {
      current.title = title[1].trim();
      continue;
    }
    if (/^\*\*口播\*\*\s*$/.test(line)) {
      current.inNotes = true;
      continue;
    }
    if (current.inNotes) {
      const stage = line.match(/^#{5,6}\s+(.+)$/);
      current.notes.push(stage ? stage[1].trim() : line);
    }
  }
  flush();

  if (!slides.length) throw new Error("没有解析到任何一页（#### N. 标题）");
  return slides;
}

function finish(raw) {
  const main = (raw.title || raw.heading).trim();
  const lines = main.split(/\s*[|｜]\s*/).map((part) => part.trim()).filter(Boolean);
  let kicker = raw.kicker.trim();
  if (!raw.title && sameText(kicker, raw.heading)) kicker = "";
  if (sameText(kicker, main)) kicker = "";

  const where = [raw.chapter, raw.subsection].filter(Boolean).join(" · ");
  const body = raw.notes.join("\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const notes = [where, body].filter(Boolean).join("\n\n");

  return {
    number: raw.number,
    chapter: raw.chapter || "演讲",
    kicker,
    lines,
    notes,
  };
}

function emUnits(text) {
  let n = 0;
  for (const ch of text) n += ch.charCodeAt(0) <= 0xff ? 0.56 : 1;
  return Math.max(n, 1);
}

function titleSize(lines) {
  const widest = Math.max(...lines.map(emUnits));
  let size = Math.floor((TEXT_W * 0.92) / widest);
  const cap = lines.length >= 5 ? 72 : lines.length >= 4 ? 84 : lines.length >= 3 ? 100 : lines.length === 2 ? 120 : 156;
  size = Math.min(size, cap);
  while (size > 56) {
    const block = lines.length * size * 1.32 + 140;
    if (block <= 920) break;
    size -= 2;
  }
  return size;
}

function measureWidths(items) {
  const swiftPath = "/tmp/md2slides-measure.swift";
  const jsonPath = "/tmp/md2slides-measure.json";
  fs.writeFileSync(swiftPath, `import AppKit
import Foundation
struct Item: Decodable { let text: String; let font: String; let size: Double }
let raw = try String(contentsOfFile: CommandLine.arguments[1], encoding: .utf8)
let items = try JSONDecoder().decode([Item].self, from: Data(raw.utf8))
var widths: [Double] = []
for item in items {
  guard let font = NSFont(name: item.font, size: CGFloat(item.size)) else {
    fputs("missing font \\(item.font)\\n", stderr)
    exit(1)
  }
  widths.append(Double(NSAttributedString(string: item.text, attributes: [.font: font]).size().width))
}
FileHandle.standardOutput.write(try JSONSerialization.data(withJSONObject: widths))
`);
  fs.writeFileSync(jsonPath, JSON.stringify(items));
  const out = execFileSync("swift", [swiftPath, jsonPath], { encoding: "utf8", maxBuffer: 10_000_000 });
  return JSON.parse(out);
}

function asColor(hex) {
  const n = Number.parseInt(hex, 16);
  const scale = 65535 / 255;
  return `{${Math.round(((n >> 16) & 255) * scale)}, ${Math.round(((n >> 8) & 255) * scale)}, ${Math.round((n & 255) * scale)}}`;
}

function asString(value) {
  const parts = String(value ?? "").split(/\r?\n/);
  if (!parts.length) return '""';
  return parts
    .map((line) => `"${line.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`)
    .join(" & return & ");
}

function layoutSlides(slides) {
  const pending = [];
  const laid = slides.map((slide) => {
    const size = titleSize(slide.lines);
    const lineH = Math.round(size * 1.28);
    const kickerSize = 34;
    const kickerH = slide.kicker ? 52 : 0;
    const gap = slide.kicker ? 36 : 0;
    const numberSize = 22;
    const block = kickerH + gap + slide.lines.length * lineH;
    let y = Math.round((SLIDE_H - block) / 2);
    const boxes = [];
    const add = (text, font, boxSize, color, yPos, h) => {
      const index = pending.length;
      pending.push({ text, font, size: boxSize });
      boxes.push({ index, text, font, size: boxSize, color, y: yPos, h });
    };
    if (slide.kicker) {
      add(slide.kicker, BODY_FONT, kickerSize, INK, y, kickerH);
      y += kickerH + gap;
    }
    for (const line of slide.lines) {
      add(line, TITLE_FONT, size, INK, y, lineH);
      y += lineH;
    }
    add(String(slide.number), BODY_FONT, numberSize, INK, 1020, 36);
    return { ...slide, boxes };
  });
  const widths = measureWidths(pending.map(({ text, font, size }) => ({ text, font, size })));
  for (const slide of laid) {
    for (const box of slide.boxes) {
      const measured = Math.ceil(widths[box.index] + 8);
      box.w = Math.max(measured, 24);
      box.x = box.y > 1000 ? SLIDE_W - 56 - box.w : Math.round((SLIDE_W - box.w) / 2);
    }
  }
  return laid;
}

function appleScript(slides, keyPath, docName) {
  const commands = slides.map((slide, index) => {
    const boxes = slide.boxes.map((box) => `    set theBox to make new text item with properties {object text:${asString(box.text)}, position:{${box.x}, ${box.y}}, width:${box.w}, height:${box.h}}
    set font of object text of theBox to "${box.font}"
    set size of object text of theBox to ${box.size}
    set color of every character of object text of theBox to ${asColor(box.color)}`).join("\n");
    return `  if ${index + 1} is 1 then
    set thisSlide to slide 1 of theDoc
  else
    set thisSlide to make new slide at end of slides of theDoc with properties {base layout:slide layout "Blank" of theDoc}
  end if
  tell thisSlide
    set base layout to slide layout "Blank" of theDoc
    try
      set title showing to false
      set body showing to false
    end try
${boxes}
  end tell
  set presenter notes of thisSlide to ${asString(slide.notes)}`;
  }).join("\n");

  return `tell application id "com.apple.Keynote"
  if exists document ${asString(docName)} then close document ${asString(docName)} saving no
  set theDoc to make new document with properties {document theme:theme "Basic White", width:${SLIDE_W}, height:${SLIDE_H}}
  set slide numbers showing of theDoc to false
  try
${commands}
    save theDoc in POSIX file ${asString(keyPath)}
    close theDoc saving no
  on error errMsg number errNum
    try
      close theDoc saving no
    end try
    error errMsg number errNum
  end try
end tell
`;
}

function buildKeynote(slides, keyPath) {
  const laid = layoutSlides(slides);
  const docName = path.basename(keyPath, ".key");
  const scriptPath = "/tmp/md2slides-build.applescript";
  fs.writeFileSync(scriptPath, appleScript(laid, keyPath, docName));
  execFileSync("osascript", [scriptPath], { stdio: "inherit", timeout: 180000 });
}

function main() {
  const input = path.resolve(process.argv[2] || path.join(__dirname, "打不过就加入.md"));
  const output = path.resolve(process.argv[3] || input.replace(/\.md$/i, ".key"));
  if (!output.toLowerCase().endsWith(".key")) throw new Error("输出文件需要是 .key");
  const slides = parse(fs.readFileSync(input, "utf8"));
  slides.forEach((slide, index) => {
    if (slide.number !== index + 1) throw new Error(`页码不连续：第 ${index + 1} 位是 ${slide.number}`);
  });
  fs.rmSync(output, { force: true });
  buildKeynote(slides, output);
  console.log(`${slides.length} slides → ${output}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message || error);
    process.exit(1);
  }
}

module.exports = { parse };
