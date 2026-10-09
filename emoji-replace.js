const fs = require("fs");

const files = [
  "C:/Users/Atmint/cademy/apps/web/app/tools/materi/view.tsx",
  "C:/Users/Atmint/cademy/apps/web/app/tools/flowchart-skripsi/view.tsx",
];

const emojiMap = {
  "\u{1F3AC}": "smart_display",   // 🎬
  "\u{1F512}": "lock",           // 🔒
  "\u{2B50}":  "star",           // ⭐
  "\u{1F4D6}": "menu_book",      // 📖
  "\u{1F4AC}": "chat_bubble",     // 💬
  "\u{1F4A1}": "lightbulb",       // 💡
  "\u{26A1}":  "bolt",            // ⚡
  "\u{25B6}":  "play_arrow",      // ▶
  "\u{1F4DD}": "edit_note",       // 📝
  "\u{1F4E6}": "inventory_2",     // 📦
  "\u{2714}":  "check_circle",    // ✔
  "\u{2713}":  "check",           // ✓
  "\u{1F389}": "celebration",     // 🎉
  "\u{1F5C4}": "storage",         // 🗄️
  "\u{1F4CA}": "bar_chart",       // 📊
  "\u{1F916}": "smart_toy",       // 🤖
  "\u{1F5D3}": "calendar_month",  // 🗓️
  "\u{1F5FA}": "map",             // 🗺
  "\u{1F3F4}": "flag",            // 🚩
  "\u{1F4C5}": "event",           // 📅
  "\u{267F}":  "accessible",      // ♿
  "\u{1F393}": "school",          // 🎓
  "\u{26A0}":  "warning",         // ⚠
  "\u{2715}":  "close",           // ✕
};

for (const f of files) {
  let t = fs.readFileSync(f, "utf8");
  let n = 0;
  for (const [emoji, icon] of Object.entries(emojiMap)) {
    if (t.includes(emoji)) {
      t = t.split(emoji).join(
        `<span className="material-symbols-outlined">${icon}</span>`
      );
      n++;
    }
  }
  fs.writeFileSync(f, t);
  console.log(f, "->", n, "replacements");
}
