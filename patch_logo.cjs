const fs = require('fs');
let content = fs.readFileSync('src/components/Logo.tsx', 'utf8');

const target = `      {config.pageTitle && (
        <h1 className={\`font-extrabold tracking-tight text-center text-neutral-900 \${titleSizeClass}\`}>
          {config.pageTitle}
        </h1>
      )}`;
      
const replace = `      {(config.pageTitle || config.pageSubtitle) && (
        <div className="flex flex-col items-center justify-center gap-2">
          {config.pageTitle && (
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
          )}
        </div>
      )}`;

content = content.replace(target, replace);
fs.writeFileSync('src/components/Logo.tsx', content);
