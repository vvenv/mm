/** Pure helpers for Markdown Mindmap — shared by the page and tests. */

export const STORAGE_KEY = "mm.wenfu.dev/v1";
export const RECENT_ICONS_KEY = "mm.wenfu.dev/icons/recent";
export const MODE_KEY = "mm.wenfu.dev/mode";
export const FONT_KEY = "mm.wenfu.dev/font";
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

/** Level styles for layout/draw. Depth 0–2 use title stack; deeper levels use body stack. */
export function buildLevelStyles(fontId) {
  const { title, body } = fontStacksFor(fontId);
  return [
    { size: 30, weight: 700, family: title, fill: "#111", h: 46 },
    { size: 22, weight: 700, family: title, fill: "#111", h: 38 },
    { size: 17, weight: 600, family: title, fill: "#111", h: 34 },
    { size: 15, weight: 500, family: body, fill: "#111", h: 30 },
    { size: 14, weight: 400, family: body, fill: "#333", h: 28 },
  ];
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
  "❤️": "爱心 红心 心 heart love red",
  "🧡": "爱心 橙心 心 heart orange",
  "💛": "爱心 黄心 心 heart yellow",
  "💚": "爱心 绿心 心 heart green",
  "💙": "爱心 蓝心 心 heart blue",
  "💜": "爱心 紫心 心 heart purple",
  "🖤": "爱心 黑心 心 heart black",
  "🤍": "爱心 白心 心 heart white",
  "🤎": "爱心 棕心 心 heart brown",
  "💔": "心碎 心 heartbreak broken heart",
  "❣️": "爱心 心 heart exclamation",
  "💕": "爱心 两颗心 心 hearts love",
  "💞": "爱心 旋转心 心 revolving hearts love",
  "💓": "爱心 心跳 心 beating heart love",
  "💗": "爱心 成长心 心 growing heart love",
  "💖": "爱心 闪亮心 心 sparkling heart love",
  "💘": "爱心 丘比特 心 cupid heart love arrow",
  "💝": "爱心 礼物心 心 gift heart love",
  "💟": "爱心 心 heart decoration love",
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
  { id: "xmind", label: "XMind", ext: ".xmind", mime: "application/vnd.xmind.workbook", available: false },
  { id: "html", label: "交互 HTML", ext: ".html", mime: "text/html;charset=utf-8", available: false },
];

export function indentWidth(prefix) {
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
 * A click on a node field begins editing. Title and desc are separate targets.
 * Kept so the app does not rely on native `dblclick` (SVG redraw replaces the
 * DOM target after selection).
 */
export function recognizeNodeTap(prev, node, now = Date.now(), threshold = DOUBLE_TAP_MS, field = "title") {
  const target = field === "desc" ? "desc" : "title";
  return { action: "edit", field: target, next: { node: null, field: null, time: 0 } };
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
