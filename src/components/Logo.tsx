import { AppConfig } from '../types';
import { DEFAULT_CONFIG } from '../lib/db';

export function Logo({ config = DEFAULT_CONFIG }: { config?: AppConfig }) {
  const titleSizeMap = {
    pequeno: 'text-3xl sm:text-4xl',
    medio: 'text-5xl sm:text-6xl',
    grande: 'text-7xl sm:text-8xl',
  };

  const titleSizeClass = titleSizeMap[config.pageTitleSize || 'grande'] || titleSizeMap['grande'];
  const subtitleSizeMap = {
    pequeno: 'text-sm sm:text-base md:text-lg',
    medio: 'text-lg sm:text-xl md:text-2xl',
    grande: 'text-xl sm:text-2xl md:text-3xl',
  };
  const subtitleSizeClass = subtitleSizeMap[config.pageSubtitleSize || 'medio'] || subtitleSizeMap['medio'];

  return (
    <div className="flex flex-col items-center justify-center w-full overflow-hidden bg-transparent py-6 sm:py-10 relative gap-6">
      {config.headerBannerUrl && (
        <div className="w-full max-w-4xl mx-auto rounded-xl overflow-hidden shadow-sm">
          <img 
            src={config.headerBannerUrl} 
            alt="Banner do Evento" 
            className="w-full h-auto object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none' }} 
          />
        </div>
      )}
      {(config.pageTitle || config.pageSubtitle) && (
        <div className="flex flex-col items-center justify-center gap-2">
          {config.pageTitle && (
            <h1 
              className={`tracking-tight text-center ${titleSizeClass} ${config.pageTitleBold !== false ? 'font-extrabold' : 'font-normal'} ${config.pageTitleItalic ? 'italic' : ''}`}
              style={{ color: config.pageTitleColor || '#171717' }}
            >
              {config.pageTitle}
            </h1>
          )}
          {config.pageSubtitle && (
            <p 
              className={`text-center max-w-2xl ${subtitleSizeClass} ${config.pageSubtitleBold ? 'font-bold' : 'font-medium'} ${config.pageSubtitleItalic ? 'italic' : ''}`}
              style={{ color: config.pageSubtitleColor || '#525252' }}
            >
              {config.pageSubtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
