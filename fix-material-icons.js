const fs = require('fs');
const files = [
  'C:/Users/Atmint/cademy/apps/web/app/tools/materi/view.tsx',
  'C:/Users/Atmint/cademy/apps/web/app/tools/flowchart-skripsi/view.tsx'
];
for (const f of files) {
  let t = fs.readFileSync(f, 'utf8');
  const r1 = /icon="<span className="material-symbols-outlined">(.+?)<\/span>"/g;
  const r2 = /showToast\(prog\.done \? "Tanda selesai dibatalkan\." : "(.+?)<\/span>"\);/g;
  t = t.replace(r1, 'icon="$1"');
  t = t.replace(r2, 'showToast(prog.done ? "Tanda selesai dibatalkan." : "$1");');
  t = t.replace(/\{prog\.done \? "(.+?)<span className="material-symbols-outlined">(.+?)<\/span>" : "Tandai Modul Selesai"\}/g, '{prog.done ? "$1" : "Tandai Modul Selesai"}');
  t = t.replace(/\{prog\.done \? "<span className="material-symbols-outlined">(.+?)<\/span>" : "○"\}/g, '{prog.done ? <span className="material-symbols-outlined">$1</span> : "○"}');
  fs.writeFileSync(f, t);
  console.log('fixed', f);
}
