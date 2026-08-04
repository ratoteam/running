const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf8');

const target = `  pageTitle?: string;
  pageTitleSize?: 'pequeno' | 'medio' | 'grande';`;
const replace = `  pageTitle?: string;
  pageTitleColor?: string;
  pageSubtitle?: string;
  pageSubtitleColor?: string;
  pageTitleSize?: 'pequeno' | 'medio' | 'grande';`;

content = content.replace(target, replace);
fs.writeFileSync('src/types.ts', content);
