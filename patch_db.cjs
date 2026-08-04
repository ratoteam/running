const fs = require('fs');
let content = fs.readFileSync('src/lib/db.ts', 'utf8');

const target = `  pageTitle: "Meu Evento",
  pageTitleSize: "grande",`;
const replace = `  pageTitle: "Meu Evento",
  pageTitleColor: "#171717",
  pageSubtitle: "",
  pageSubtitleColor: "#525252",
  pageTitleSize: "grande",`;

content = content.replace(target, replace);
fs.writeFileSync('src/lib/db.ts', content);
