const fs = require('fs');
const path = require('path');
const files = [
  'C:/Users/Atmint/cademy/apps/web/app/tools/materi/view.tsx',
  'C:/Users/Atmint/cademy/apps/web/app/tools/flowchart-skripsi/view.tsx'
];
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const before = content.length;
  // Fix icon prop corruption
  content = content.replace(/icon="<span className="material-symbols-outlined">(.+?)<\/span>"/g, 'icon="$1"');
  // Fix string literals inside JSX that embed spans
  content = content.replace(/("|`)<span className="material-symbols-outlined">(.+?)<\/span>("`)/g, '$2');
  // Harder case: {"<span...>...</span>"} with braces
  content = content.replace(/\{"<span className="material-symbols-outlined">(.+?)<\/span>"\}/g, '{ <span className="material-symbols-outlined">$1</span> }');
  fs.writeFileSync(file, content, 'utf8');
  console.log(file, 'updated', before, '->', content.length);
}
console.log('done');
