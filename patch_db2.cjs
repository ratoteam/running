const fs = require('fs');
let content = fs.readFileSync('src/lib/db.ts', 'utf8');

const target = `  pageSubtitleColor: "#525252",
  pageTitleSize: "grande",`;
const replace = `  pageSubtitleColor: "#525252",
  pageTitleSize: "grande",
  pageSubtitleSize: "medio",
  pageTitleBold: true,
  pageTitleItalic: false,
  pageSubtitleBold: false,
  pageSubtitleItalic: false,`;

content = content.replace(target, replace);
fs.writeFileSync('src/lib/db.ts', content);
