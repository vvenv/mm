/** Pure helpers for Markdown Mindmap — shared by the page and tests. */

export const STORAGE_KEY = "mm.wenfu.dev/v1";
export const RECENT_ICONS_KEY = "mm.wenfu.dev/icons/recent";
export const MODE_KEY = "mm.wenfu.dev/mode";
export const DOUBLE_TAP_MS = 350;

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

/** Curated emoji sets for the icon picker (tabs). */
export const EMOJI_CATEGORIES = [
  {
    id: "smileys",
    label: "表情",
    emojis: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","🙄","😏","😣","😥","😮","😯","😪","😫","🥱","😴","😌","😛","😓","😕","🙃","🫠","😷","🤒","🤕","🤢","🤮","🥵","🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","🧐","😕","😟","🙁","☹️","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫"],
  },
  {
    id: "people",
    label: "人物",
    emojis: ["👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🤝","🙏","✍️","💅","🤳","💪","🦾","🦵","🦶","👂","👃","🧠","👀","👁️","👅","👄","👶","🧒","👦","👧","🧑","👨","👩","🧔","👴","👵","🙍","🙎","🙅","🙆","💁","🙋","🧏","🙇","🤦","🤷","👨‍💻","👩‍💻","🧑‍💻","👨‍🔬","👩‍🔬","👨‍🏫","👩‍🏫","👮","🕵️","💂","🥷","👷","🤴","👸","👳","👲","🧕","🤵","👰","🤰","🤱","👼","🎅","🤶","🦸","🦹","🧙","🧚","🧛","🧜","🧝","🧞","🧟"],
  },
  {
    id: "nature",
    label: "自然",
    emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐻‍❄️","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐒","🐔","🐧","🐦","🐤","🐣","🐥","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🪱","🐛","🦋","🐌","🐞","🐜","🪰","🪲","🪳","🦟","🦗","🕷️","🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🦍","🦧","🦣","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🦬","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🦙","🐐","🦌","🐕","🐩","🦮","🐕‍🦺","🐈","🐈‍⬛","🪶","🐓","🦃","🦤","🦚","🦜","🦢","🦩","🕊️","🐇","🦝","🦨","🦡","🦫","🦦","🦥","🐁","🐀","🐿️","🦔","🌱","🌲","🌳","🌴","🌵","🌶️","🌾","🌿","☘️","🍀","🍁","🍂","🍃","🌺","🌻","🌹","🥀","🌷","🌼","🌸","💐","🍄"],
  },
  {
    id: "food",
    label: "食物",
    emojis: ["🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶️","🫑","🌽","🥕","🫒","🧄","🧅","🥔","🍠","🥐","🥯","🍞","🥖","🥨","🧀","🥚","🍳","🧈","🥞","🧇","🥓","🥩","🍗","🍖","🦴","🌭","🍔","🍟","🍕","🫓","🥪","🥙","🧆","🌮","🌯","🫔","🥗","🥘","🫕","🍝","🍜","🍲","🍛","🍣","🍱","🥟","🦪","🍤","🍙","🍚","🍘","🍥","🥠","🥮","🍢","🍡","🍧","🍨","🍦","🥧","🧁","🍰","🎂","🍮","🍭","🍬","🍫","🍿","🍩","🍪","🌰","🥜","🍯","🥛","🍼","🫖","☕","🍵","🧃","🥤","🧋","🍶","🍺","🍻","🥂","🍷","🥃","🍸","🍹","🧉","🍾","🧊"],
  },
  {
    id: "activity",
    label: "活动",
    emojis: ["⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🪀","🏓","🏸","🏒","🏑","🥍","🏏","🪃","🥅","⛳","🪁","🛝","🏹","🎣","🤿","🥊","🥋","🎽","🛹","🛼","🛷","⛸️","🥌","🎿","⛷️","🏂","🪂","🏋️","🤼","🤸","⛹️","🤺","🤾","🏌️","🏇","🧘","🏄","🏊","🤽","🚣","🧗","🚴","🚵","🎪","🎭","🩰","🎨","🎬","🎤","🎧","🎼","🎹","🥁","🪘","🎷","🎺","🪗","🎸","🪕","🎻","🎲","♟️","🎯","🎳","🎮","🎰","🧩"],
  },
  {
    id: "travel",
    label: "旅行",
    emojis: ["🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🦯","🦽","🦼","🛴","🚲","🛵","🏍️","🛺","🚨","🚔","🚍","🚘","🚖","🚡","🚠","🚟","🚃","🚋","🚞","🚝","🚄","🚅","🚈","🚂","🚆","🚇","🚊","🚉","✈️","🛫","🛬","🛩️","💺","🛰️","🚀","🛸","🚁","🛶","⛵","🚤","🛥️","🛳️","⛴️","🚢","⚓","🪝","⛽","🚧","🚦","🚥","🚏","🗺️","🗿","🗽","🗼","🏰","🏯","🏟️","🎡","🎢","🎠","⛲","⛱️","🏖️","🏝️","🏜️","🌋","⛰️","🏔️","🗻","🏕️","⛺","🏠","🏡","🏢","🏣","🏤","🏥","🏦","🏨","🏩","🏪","🏫","🏬","🏭","💒","⛪","🕌","🛕","🕍","⛩️","🕋","🌁","🌃","🏙️","🌄","🌅","🌆","🌇","🌉","♨️"],
  },
  {
    id: "objects",
    label: "物品",
    emojis: ["⌚","📱","📲","💻","⌨️","🖥️","🖨️","🖱️","🖲️","🕹️","🗜️","💽","💾","💿","📀","📼","📷","📸","📹","🎥","📽️","🎞️","📞","☎️","📟","📠","📺","📻","🎙️","🎚️","🎛️","🧭","⏱️","⏲️","⏰","🕰️","⌛","⏳","📡","🔋","🔌","💡","🔦","🕯️","🪔","🧯","🛢️","💸","💵","💴","💶","💷","🪙","💰","💳","💎","⚖️","🪜","🧰","🪛","🔧","🔨","⚒️","🛠️","⛏️","🪚","🔩","⚙️","🪤","🧱","⛓️","🧲","🔫","💣","🧨","🪓","🔪","🗡️","⚔️","🛡️","🚬","⚰️","🪦","⚱️","🏺","🔮","📿","🧿","💈","⚗️","🔭","🔬","🕳️","🩹","🩺","💊","💉","🩸","🧬","🦠","🧫","🧪","🌡️","🧹","🪠","🧺","🧻","🚽","🚰","🚿","🛁","🛀","🧼","🪥","🪒","🧽","🪣","🧴","🛎️","🔑","🗝️","🚪","🪑","🛋️","🛏️","🛌","🧸","🖼️","🛍️","🛒","🎁","🎈","🎏","🎀","🎊","🎉","🎎","🏮","🎐","🧧","✉️","📩","📨","📧","💌","📥","📤","📦","🏷️","🪧","📪","📫","📬","📭","📮","📯","📜","📃","📄","📑","🧾","📊","📈","📉","🗒️","🗓️","📆","📅","🗑️","📇","🗃️","🗳️","🗄️","📋","📁","📂","🗂️","📰","📓","📔","📒","📕","📗","📘","📙","📚","📖","🔖","🧷","🔗","📎","🖇️","📐","📏","🧮","📌","📍","✂️","🖊️","🖋️","✒️","🖌️","🖍️","📝","✏️","🔍","🔎","🔏","🔐","🔒","🔓"],
  },
  {
    id: "symbols",
    label: "符号",
    emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","☮️","✝️","☪️","🕉️","☸️","✡️","🔯","🕎","☯️","☦️","🛐","⛎","♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓","🆔","⚛️","🉑","☢️","☣️","📴","📳","🈶","🈚","🈸","🈺","🈷️","✴️","🆚","💮","🉐","㊙️","㊗️","🈴","🈵","🈹","🈲","🅰️","🅱️","🆎","🆑","🅾️","🆘","❌","⭕","🛑","⛔","📛","🚫","💯","💢","♨️","🚷","🚯","🚳","🚱","🔞","📵","🚭","❗","❕","❓","❔","‼️","⁉️","🔅","🔆","〽️","⚠️","🚸","🔱","⚜️","🔰","♻️","✅","🈯","💹","❇️","✳️","❎","🌐","💠","Ⓜ️","🌀","💤","🏧","🚾","♿","🅿️","🛗","🛂","🛃","🛄","🛅","♂️","♀️","⚧️","✖️","➕","➖","➗","♾️","‼️","⁉️","❓","❔","❕","❗","〰️","💱","💲","⚕️","♻️","⚜️","🔰","🔱","📛","⭕","✅","☑️","✔️","❌","❎","➰","➿","〽️","✳️","✴️","❇️","©️","®️","™️","#️⃣","*️⃣","0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟","🔠","🔡","🔢","🔣","🔤","🅰️","🆎","🅱️","🆑","🆒","🆓","ℹ️","🆔","Ⓜ️","🆕","🆖","🅾️","🆗","🅿️","🆘","🆙","🆚","🈁","🈂️","🔴","🟠","🟡","🟢","🔵","🟣","🟤","⚫","⚪","🟥","🟧","🟨","🟩","🟦","🟪","🟫","⬛","⬜","◼️","◻️","◾","◽","▪️","▫️","🔶","🔷","🔸","🔹","🔺","🔻","💠","🔘","🔳","🔲","🏁","🚩","🎌","🏴","🏳️","🏳️‍🌈","🏳️‍⚧️","🏴‍☠️"],
  },
];

const CATEGORY_ALIAS = {
  smileys: "表情 脸 情绪 face smile emotion",
  people: "人物 人 手 people hand person",
  nature: "自然 动物 植物 animal nature plant",
  food: "食物 吃 水果 food fruit",
  activity: "活动 运动 游戏 sport game activity",
  travel: "旅行 交通 地点 travel place car",
  objects: "物品 东西 object tool",
  symbols: "符号 心 标记 symbol heart",
};

/** Search text for common icons. Unlisted icons still match their category name. */
const EMOJI_KEYWORDS = {
  "😀": "笑 微笑 开心 smile happy",
  "😂": "笑哭 laugh",
  "😍": "爱心眼 喜欢 love",
  "🤔": "思考 think",
  "😎": "酷 cool",
  "😭": "哭 cry",
  "👍": "赞 好 ok",
  "👎": "踩 不好",
  "👏": "鼓掌 clap",
  "🙏": "谢谢 拜托 pray",
  "💪": "加油 力量 muscle",
  "👀": "看 eyes",
  "🧠": "大脑 思考 brain",
  "👨‍💻": "程序员 开发 developer",
  "👩‍💻": "程序员 开发 developer",
  "🧑‍💻": "程序员 开发 developer",
  "🐶": "狗 dog",
  "🐱": "猫 cat",
  "🐼": "熊猫 panda",
  "🦊": "狐狸 fox",
  "🦁": "狮子 lion",
  "🐸": "青蛙 frog",
  "🐵": "猴子 monkey",
  "🦄": "独角兽 unicorn",
  "🐝": "蜜蜂 bee",
  "🦋": "蝴蝶 butterfly",
  "🐢": "乌龟 turtle",
  "🐍": "蛇 snake",
  "🐙": "章鱼 octopus",
  "🐠": "鱼 fish",
  "🐬": "海豚 dolphin",
  "🐳": "鲸 whale",
  "🌸": "花 樱花 flower",
  "🌹": "玫瑰 rose",
  "🌻": "向日葵 sunflower",
  "🍀": "四叶草 clover luck",
  "🌲": "树 tree",
  "🌴": "棕榈 palm",
  "🍎": "苹果 apple",
  "🍏": "青苹果 apple",
  "🍌": "香蕉 banana",
  "🍇": "葡萄 grape",
  "🍓": "草莓 strawberry",
  "🍉": "西瓜 watermelon",
  "🍑": "桃 peach",
  "🍒": "樱桃 cherry",
  "🥑": "牛油果 avocado",
  "🥦": "西兰花 broccoli",
  "🌽": "玉米 corn",
  "🥕": "胡萝卜 carrot",
  "🍞": "面包 bread",
  "🧀": "奶酪 cheese",
  "🥚": "蛋 egg",
  "🍳": "煎蛋 egg",
  "🍔": "汉堡 burger",
  "🍟": "薯条 fries",
  "🍕": "披萨 pizza",
  "🌮": "塔可 taco",
  "🍜": "面条 noodle",
  "🍣": "寿司 sushi",
  "🍱": "便当 bento",
  "🥟": "饺子 dumpling",
  "🍚": "米饭 rice",
  "🍦": "冰淇淋 ice cream",
  "🍰": "蛋糕 cake",
  "🎂": "生日 蛋糕 birthday cake",
  "☕": "咖啡 coffee",
  "🍵": "茶 tea",
  "🍺": "啤酒 beer",
  "🍷": "红酒 wine",
  "⚽": "足球 football soccer",
  "🏀": "篮球 basketball",
  "🎾": "网球 tennis",
  "🏓": "乒乓 pingpong",
  "🎯": "目标 target",
  "🎮": "游戏 game",
  "🎨": "画 艺术 art",
  "🎬": "电影 movie",
  "🎤": "麦克风 mic",
  "🎧": "耳机 headphone",
  "🎸": "吉他 guitar",
  "🎲": "骰子 dice",
  "🧩": "拼图 puzzle",
  "🚗": "汽车 车 car",
  "🚕": "出租车 taxi",
  "🚌": "公交 bus",
  "🚑": "救护车 ambulance",
  "🚒": "消防车 fire",
  "🚲": "自行车 bike",
  "✈️": "飞机 plane flight",
  "🚀": "火箭 rocket",
  "🛸": "飞碟 ufo",
  "🚁": "直升机 helicopter",
  "⛵": "帆船 sail",
  "🚢": "船 ship",
  "🗺️": "地图 map",
  "🏠": "家 房子 home house",
  "🏢": "公司 办公楼 office",
  "🏥": "医院 hospital",
  "🏫": "学校 school",
  "⛰️": "山 mountain",
  "🌋": "火山 volcano",
  "🏖️": "海滩 beach",
  "⌚": "手表 watch",
  "📱": "手机 phone mobile",
  "💻": "电脑 笔记本 computer laptop",
  "⌨️": "键盘 keyboard",
  "🖥️": "显示器 电脑 desktop",
  "🖨️": "打印机 printer",
  "🖱️": "鼠标 mouse",
  "📷": "相机 camera",
  "📺": "电视 tv",
  "💡": "灯泡 想法 idea light",
  "🔋": "电池 battery",
  "🔑": "钥匙 key",
  "🔒": "锁 lock",
  "🔓": "解锁 unlock",
  "📦": "包裹 盒子 box package",
  "📁": "文件夹 folder",
  "📂": "文件夹 folder",
  "📝": "笔记 备忘 note memo",
  "✏️": "铅笔 pencil",
  "📌": "图钉 pin",
  "📎": "回形针 clip",
  "📚": "书 book",
  "📖": "书 book",
  "🔍": "搜索 search",
  "💰": "钱 money",
  "💳": "信用卡 card",
  "💎": "钻石 diamond",
  "🔧": "扳手 工具 wrench tool",
  "🔨": "锤子 hammer",
  "⚙️": "齿轮 gear settings",
  "💊": "药 pill",
  "🧪": "实验 test",
  "🎁": "礼物 gift",
  "✉️": "邮件 信 mail email",
  "📅": "日历 calendar",
  "❤️": "爱心 红心 heart love",
  "💔": "心碎 heartbreak",
  "⭐": "星星 star",
  "✅": "完成 勾 check done",
  "❌": "错误 叉 error",
  "⚠️": "警告 warning",
  "❓": "问题 question",
  "❗": "注意 感叹",
  "💯": "一百分 满分",
  "🔥": "火 fire hot",
  "✨": "闪光 sparkle",
  "⭐️": "星星 star",
};

export function searchEmojis(query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [];
  const cjk = /[\u3400-\u9fff]/.test(q);
  const hit = (text) => {
    const value = String(text || "").toLowerCase();
    if (!value) return false;
    if (cjk) return value.includes(q);
    return value.split(/[\s,]+/).some((word) => word.startsWith(q));
  };
  const hits = [];
  const seen = new Set();
  for (const cat of EMOJI_CATEGORIES) {
    const catHit = hit(`${cat.label} ${CATEGORY_ALIAS[cat.id] || ""}`);
    for (const emoji of cat.emojis) {
      if (seen.has(emoji)) continue;
      if (catHit || emoji.includes(q) || hit(EMOJI_KEYWORDS[emoji])) {
        seen.add(emoji);
        hits.push(emoji);
      }
    }
  }
  return hits;
}

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

export function formatListLabel(node) {
  const title = node && node.title != null ? String(node.title) : "";
  const subtitle = node && node.subtitle ? String(node.subtitle).trim() : "";
  const body = subtitle ? `${title} :: ${subtitle}` : title;
  const icon = node && node.icon ? String(node.icon).trim() : "";
  return icon ? `${icon} ${body}` : body;
}

function nodeFromTitleLine(raw) {
  const headed = splitLeadingIcon(raw);
  const parts = parseTitleSubtitle(headed.title);
  const node = { title: parts.title, children: [] };
  if (parts.subtitle) node.subtitle = parts.subtitle;
  if (headed.icon) node.icon = headed.icon;
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
        const headed = splitLeadingIcon(title);
        root.title = headed.title;
        if (headed.icon) root.icon = headed.icon;
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
  const rootLabel = node.icon ? `${node.icon} ${node.title}` : node.title;
  const lines = [`# ${rootLabel}`];
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
  if (node.icon) out.icon = node.icon;
  if (typeof node.open === "boolean") out.open = node.open;
  else if (node.open) out.open = true;
  return out;
}

export function createRecentIconsStore(storage = globalThis.localStorage, key = RECENT_ICONS_KEY, limit = 24) {
  return {
    key,
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
 * First click selects; a second click on the same node and field within the
 * threshold edits. Title and subtitle are separate targets.
 * Needed because selecting redraws SVG and destroys the DOM target, so native
 * `dblclick` never fires.
 */
export function recognizeNodeTap(prev, node, now = Date.now(), threshold = DOUBLE_TAP_MS, field = "title") {
  const target = field === "subtitle" ? "subtitle" : "title";
  const prevField = prev && prev.field === "subtitle" ? "subtitle" : "title";
  if (prev && prev.node === node && prevField === target && now - prev.time <= threshold) {
    return { action: "edit", field: target, next: { node: null, field: null, time: 0 } };
  }
  return { action: "select", field: target, next: { node, field: target, time: now } };
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
