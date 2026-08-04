const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf8');

const target = `  pageSubtitleColor?: string;
  pageTitleSize?: 'pequeno' | 'medio' | 'grande';`;
const replace = `  pageSubtitleColor?: string;
  pageTitleSize?: 'pequeno' | 'medio' | 'grande';
  pageSubtitleSize?: 'pequeno' | 'medio' | 'grande';
  pageTitleBold?: boolean;
  pageTitleItalic?: boolean;
  pageSubtitleBold?: boolean;
  pageSubtitleItalic?: boolean;`;

content = content.replace(target, replace);
fs.writeFileSync('src/types.ts', content);
