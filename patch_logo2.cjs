const fs = require('fs');
let content = fs.readFileSync('src/components/Logo.tsx', 'utf8');

const target = `  const titleSizeClass = titleSizeMap[config.pageTitleSize || 'grande'] || titleSizeMap['grande'];`;
const replace = `  const titleSizeClass = titleSizeMap[config.pageTitleSize || 'grande'] || titleSizeMap['grande'];
  const subtitleSizeMap = {
    pequeno: 'text-sm sm:text-base md:text-lg',
    medio: 'text-lg sm:text-xl md:text-2xl',
    grande: 'text-xl sm:text-2xl md:text-3xl',
  };
  const subtitleSizeClass = subtitleSizeMap[config.pageSubtitleSize || 'medio'] || subtitleSizeMap['medio'];`;

content = content.replace(target, replace);

const target2 = `          {config.pageTitle && (
            <h1 
              className={\`font-extrabold tracking-tight text-center \${titleSizeClass}\`}
              style={{ color: config.pageTitleColor || '#171717' }}
            >
              {config.pageTitle}
            </h1>
          )}
          {config.pageSubtitle && (
            <p 
              className="text-lg sm:text-xl md:text-2xl font-medium text-center max-w-2xl"
              style={{ color: config.pageSubtitleColor || '#525252' }}
            >
              {config.pageSubtitle}
            </p>
          )}`;

const replace2 = `          {config.pageTitle && (
            <h1 
              className={\`tracking-tight text-center \${titleSizeClass} \${config.pageTitleBold !== false ? 'font-extrabold' : 'font-normal'} \${config.pageTitleItalic ? 'italic' : ''}\`}
              style={{ color: config.pageTitleColor || '#171717' }}
            >
              {config.pageTitle}
            </h1>
          )}
          {config.pageSubtitle && (
            <p 
              className={\`text-center max-w-2xl \${subtitleSizeClass} \${config.pageSubtitleBold ? 'font-bold' : 'font-medium'} \${config.pageSubtitleItalic ? 'italic' : ''}\`}
              style={{ color: config.pageSubtitleColor || '#525252' }}
            >
              {config.pageSubtitle}
            </p>
          )}`;

content = content.replace(target2, replace2);
fs.writeFileSync('src/components/Logo.tsx', content);
