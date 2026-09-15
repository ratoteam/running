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

  const getObjectPosition = () => {
    switch(config.topBannerPosition) {
      case 'left': return 'left center';
      case 'right': return 'right center';
      case 'center': default: return 'center center';
    }
  };

  const scale = config.topBannerScale ? config.topBannerScale / 100 : 1;

  return (
    <div className="flex flex-col w-full overflow-hidden bg-transparent mb-8 relative gap-6">
      {config.topBannerEnabled && config.topBannerUrl && (
        <div className="w-full h-48 md:h-64 lg:h-72 relative shrink-0">
          <img 
            src={config.topBannerUrl} 
            alt="Banner do Evento" 
            className={`w-full h-full transition-transform duration-300 ${config.topBannerFit === 'contain' ? 'object-contain bg-transparent' : 'object-cover'}`}
            style={{ 
              objectPosition: getObjectPosition(),
              transform: `scale(${scale})`
            }}
            onError={(e) => { e.currentTarget.style.display = 'none' }} 
          />
        </div>
      )}

      {config.showHeader !== false && (config.pageTitle || config.pageSubtitle) && (
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
