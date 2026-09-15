import React, { useRef, useState } from 'react';
import { ResultItem, AppConfig } from '../types';
import { parseGender, getAge, getAgeCategory } from '../lib/utils';
import { Trophy, Medal, Award, Download, Printer, X, CheckCircle2, Flame, Timer, Zap, User, Tag, Calendar } from 'lucide-react';
import html2canvas from 'html2canvas';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ResultItem | null;
  position: number | string;
  genderPosition?: number | string;
  config: AppConfig | null;
}

const parseCssColorToRgb = (colorStr: string, isBackground = false): string => {
  if (!colorStr || colorStr === 'transparent' || colorStr === 'rgba(0, 0, 0, 0)') {
    return isBackground ? 'transparent' : '#171717';
  }
  if (!colorStr.includes('oklab') && !colorStr.includes('oklch')) {
    return colorStr;
  }
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#171717';
      ctx.fillStyle = colorStr;
      const res = ctx.fillStyle;
      if (res && !res.includes('oklab') && !res.includes('oklch')) {
        return res;
      }
    }
  } catch (e) {
    // fallback
  }
  const fallbackHex = isBackground ? 'rgb(255, 255, 255)' : 'rgb(23, 23, 23)';
  const cleaned = colorStr
    .replace(/oklab\([^)]+\)/gi, fallbackHex)
    .replace(/oklch\([^)]+\)/gi, fallbackHex);

  if (!cleaned.includes('oklab') && !cleaned.includes('oklch')) {
    return cleaned;
  }

  return isBackground ? '#ffffff' : '#171717';
};

const imageToDataUri = (url: string): Promise<string> => {
  return new Promise((resolve) => {
    if (!url) {
      resolve('');
      return;
    }
    if (url.startsWith('data:')) {
      resolve(url);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 300;
        canvas.height = img.naturalHeight || img.height || 150;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUri = canvas.toDataURL('image/png');
          resolve(dataUri);
          return;
        }
      } catch (e) {
        console.warn('Could not convert image to data URI:', e);
      }
      resolve(url);
    };
    img.onerror = () => {
      const fallbackImg = new Image();
      fallbackImg.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = fallbackImg.naturalWidth || fallbackImg.width || 300;
          canvas.height = fallbackImg.naturalHeight || fallbackImg.height || 150;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(fallbackImg, 0, 0);
            resolve(canvas.toDataURL('image/png'));
            return;
          }
        } catch (err) {
          // ignore
        }
        resolve(url);
      };
      fallbackImg.onerror = () => resolve(url);
      fallbackImg.src = url;
    };
    img.src = url;
  });
};

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  item,
  position,
  genderPosition,
  config
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !item) return null;

  const eventName = config?.eventName || config?.pageTitle || 'Circuito de Corrida de Rua';
  const eventSubtitle = config?.eventSubtitle || config?.pageSubtitle || 'Certificado Oficial de Participação e Desempenho';
  const eventDate = config?.eventDate || '06 de Setembro de 2026';
  
  const itemGen = parseGender(item.genero);
  const itemAge = getAge(item.dataNascimento);
  const itemCat = getAgeCategory(itemAge);

  const rawRank = (genderPosition && genderPosition !== '-') ? genderPosition : (item.cgcp || position);
  const rankNumStr = String(rawRank).replace(/\D/g, '');
  const displayRankNum = rankNumStr ? `${rankNumStr}º` : (rawRank && rawRank !== '-' ? `${rawRank}º` : '');

  const formattedPos = typeof position === 'number' 
    ? (position === 1 ? '1º Lugar 🏆' : position === 2 ? '2º Lugar 🥈' : position === 3 ? '3º Lugar 🥉' : `${position}º Colocado`)
    : position !== '-' ? `${position}º Colocado` : 'Concluinte';

  const handleDownloadImage = async () => {
    if (!certRef.current) return;
    setIsGenerating(true);
    try {
      // Convert all images inside the certificate to Base64 data URIs
      const imgElements = Array.from(certRef.current.querySelectorAll('img')) as HTMLImageElement[];
      const originalSrcs = new Map<HTMLImageElement, string>();

      await Promise.all(
        imgElements.map(async (img) => {
          const currentSrc = img.getAttribute('src') || img.src;
          if (currentSrc) {
            originalSrcs.set(img, currentSrc);
            const dataUri = await imageToDataUri(currentSrc);
            if (dataUri) {
              img.src = dataUri;
            }
          }
        })
      );

      const canvas = await html2canvas(certRef.current, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const area = clonedDoc.getElementById('certificate-print-area');
          if (area) {
            // Force container to exact landscape aspect ratio for full crisp image fit
            area.style.width = '1120px';
            area.style.height = '790px';
            area.style.maxWidth = 'none';
            area.style.boxSizing = 'border-box';
            area.style.padding = '32px 48px';
            area.style.display = 'flex';
            area.style.flexDirection = 'column';
            area.style.justifyContent = 'space-between';

            // Isolate certificate element in cloned document body
            clonedDoc.body.innerHTML = '';
            clonedDoc.body.appendChild(area);

            // Sanitize all style tags
            clonedDoc.querySelectorAll('style, link').forEach((node) => {
              if (node.textContent && (node.textContent.includes('oklab') || node.textContent.includes('oklch'))) {
                node.textContent = node.textContent
                  .replace(/oklab\([^)]+\)/gi, 'rgb(30, 30, 30)')
                  .replace(/oklch\([^)]+\)/gi, 'rgb(30, 30, 30)');
              }
            });

            // Convert computed colors of all elements to inline explicit RGB styles
            const elements = [area, ...Array.from(area.querySelectorAll('*'))] as HTMLElement[];
            elements.forEach((el) => {
              try {
                const computed = window.getComputedStyle(el);
                el.style.color = parseCssColorToRgb(computed.color, false);
                el.style.backgroundColor = parseCssColorToRgb(computed.backgroundColor, true);
                el.style.borderColor = parseCssColorToRgb(computed.borderColor, false);
                el.style.boxShadow = 'none';
                el.style.textShadow = 'none';
                el.style.outlineColor = 'transparent';
              } catch (e) {
                // ignore
              }

              const inlineStyle = el.getAttribute('style');
              if (inlineStyle && (inlineStyle.includes('oklab') || inlineStyle.includes('oklch'))) {
                const cleanedStyle = inlineStyle
                  .replace(/oklab\([^)]+\)/gi, 'rgb(30, 30, 30)')
                  .replace(/oklch\([^)]+\)/gi, 'rgb(30, 30, 30)');
                el.setAttribute('style', cleanedStyle);
              }
            });

            area.style.backgroundImage = 'none';
            area.style.backgroundColor = '#fffbeb';
            area.style.border = '6px solid #f59e0b';
            area.style.borderRadius = '16px';
          }
        }
      });

      // Restore original image srcs in DOM
      originalSrcs.forEach((src, img) => {
        img.src = src;
      });

      const imgData = canvas.toDataURL('image/png');
      const safeName = item.participante.replace(/[^a-zA-Z0-9]/g, '_');

      // Trigger direct browser download for the PNG image
      const link = document.createElement('a');
      link.download = `Certificado_${safeName}_${item.numero}.png`;
      link.href = imgData;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erro ao gerar imagem do certificado:', error);
      alert('Não foi possível gerar a imagem do certificado.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = async () => {
    try {
      let certHtml = '';
      if (certRef.current) {
        const clonedContainer = certRef.current.cloneNode(true) as HTMLElement;
        const imgs = Array.from(clonedContainer.querySelectorAll('img')) as HTMLImageElement[];
        await Promise.all(
          imgs.map(async (img) => {
            const currentSrc = img.getAttribute('src') || img.src;
            if (currentSrc) {
              const dataUri = await imageToDataUri(currentSrc);
              if (dataUri) {
                img.src = dataUri;
              }
            }
          })
        );
        certHtml = clonedContainer.outerHTML;
      }

      if (window.self !== window.top) {
        const printWin = window.open('', '_blank');
        if (printWin) {
          const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
            .map(s => s.outerHTML)
            .join('\n');

          printWin.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Certificado - ${item.participante}</title>
                ${styles}
                <style>
                  @page { size: A4 landscape; margin: 0; }
                  html, body {
                    width: 297mm;
                    height: 210mm;
                    margin: 0;
                    padding: 0;
                    background: #ffffff !important;
                    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  body {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-sizing: border-box;
                    padding: 6mm;
                  }
                  #certificate-print-area {
                    width: 285mm !important;
                    height: 198mm !important;
                    box-sizing: border-box !important;
                    padding: 6mm 10mm !important;
                    margin: 0 auto !important;
                    border: 5px solid #f59e0b !important;
                    background: #fffbeb !important;
                    box-shadow: none !important;
                    border-radius: 12px !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: space-between !important;
                    page-break-inside: avoid !important;
                    page-break-after: avoid !important;
                  }
                  img { max-width: 100% !important; height: auto !important; display: block !important; margin: 0 auto !important; object-fit: contain !important; }
                </style>
              </head>
              <body>
                ${certHtml}
                <script>
                  function triggerPrint() {
                    var imgs = Array.from(document.querySelectorAll('img'));
                    var promises = imgs.map(function(img) {
                      if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
                      return new Promise(function(resolve) {
                        img.onload = resolve;
                        img.onerror = resolve;
                      });
                    });
                    Promise.all(promises).then(function() {
                      setTimeout(function() {
                        window.focus();
                        window.print();
                      }, 250);
                    });
                  }
                  if (document.readyState === 'complete') {
                    triggerPrint();
                  } else {
                    window.onload = triggerPrint;
                  }
                </script>
              </body>
            </html>
          `);
          printWin.document.close();
          return;
        }
      }
    } catch (e) {
      console.error('Print iframe fallback error:', e);
    }

    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-4xl overflow-hidden my-auto print:shadow-none print:border-none print:w-full print:max-w-none">
        
        {/* Modal Top Bar (Hidden on print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-neutral-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span className="font-semibold text-sm sm:text-base">Certificado do Atleta</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-neutral-950 transition-colors shadow-sm"
              title="Imprimir ou Salvar como PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Container (Render Target for html2canvas and print) */}
        <div className="p-4 sm:p-6 md:p-8 bg-neutral-100 print:p-0">
          <div
            ref={certRef}
            id="certificate-print-area"
            className="relative bg-gradient-to-br from-amber-50/90 via-white to-blue-50/80 p-6 sm:p-10 rounded-xl border-8 border-amber-500/80 shadow-inner overflow-hidden text-neutral-800 font-sans print:rounded-none print:border-4 print:p-8 print:shadow-none"
          >
            {/* Background Watermark Icon */}
            <div className="absolute right-[-40px] bottom-[-40px] opacity-[0.04] pointer-events-none select-none">
              <Trophy className="w-96 h-96 text-amber-700" />
            </div>

            {/* Corner Decorative Frames */}
            <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-amber-600 rounded-tl"></div>
            <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-amber-600 rounded-tr"></div>
            <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-amber-600 rounded-bl"></div>
            <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-amber-600 rounded-br"></div>

            {/* Header: Container Block containing image box + event info beside it */}
            <div className="bg-white/90 backdrop-blur-sm p-4 sm:p-5 rounded-2xl border border-amber-200 shadow-sm flex flex-row items-center justify-start gap-4 sm:gap-6 mb-5 text-left">
              {/* Image Container Box (constrains image size in print & screen) */}
              <div className="flex-shrink-0 w-32 sm:w-40 md:w-48 h-24 sm:h-28 md:h-32 flex items-center justify-center overflow-hidden rounded-xl bg-white border border-amber-200/60 p-2 shadow-inner">
                {config?.topBannerUrl ? (
                  <img
                    src={config.topBannerUrl}
                    alt="Logo do Evento"
                    className="max-w-full max-h-full w-auto h-auto object-contain"
                  />
                ) : config?.logoUrl ? (
                  <img
                    src={config.logoUrl}
                    alt="Logo"
                    className="max-w-full max-h-full w-auto h-auto object-contain"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Trophy className="w-8 h-8 text-amber-600" />
                  </div>
                )}
              </div>

              {/* Information beside the image box inside the block */}
              <div className="flex-1 flex flex-col justify-center space-y-1 pl-1">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight text-neutral-900 drop-shadow-sm leading-tight">
                  {eventName}
                </h1>
                <p className="text-xs sm:text-sm text-amber-800 font-bold tracking-wide uppercase">
                  {eventSubtitle}
                </p>
                <div className="text-xs sm:text-sm text-neutral-700 font-semibold flex items-center gap-1.5 pt-0.5">
                  <Calendar className="w-4 h-4 text-amber-700" />
                  <span>Data: {eventDate}</span>
                </div>
              </div>
            </div>

            {/* Certificate Statement */}
            <div className="text-center my-6">
              <p className="text-xs sm:text-sm uppercase tracking-widest text-neutral-500 font-bold mb-1">
                Certificamos que
              </p>
              <h2 className="text-2xl sm:text-4xl font-black text-neutral-900 tracking-tight my-2 text-amber-800 drop-shadow-sm">
                {item.participante}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 max-w-xl mx-auto mt-2">
                Concluiu com sucesso a prova, registrando um desempenho oficial validado no circuito.
              </p>
            </div>

            {/* Performance Stats Cards Grid */}
            <div className="grid grid-cols-3 gap-3 my-6">
              
              {/* Number and Distance Block */}
              <div className="bg-white/90 backdrop-blur-sm p-2.5 sm:p-3 rounded-xl border border-amber-200 shadow-sm text-center flex flex-col justify-center">
                <span className="text-[10px] uppercase font-bold text-neutral-500 block mb-0.5">
                  Nº
                </span>
                <span className="font-mono font-black text-sm sm:text-base text-amber-800 block">
                  #{item.numero}
                </span>
                <span className="text-[10px] uppercase font-bold text-neutral-500 block mt-1">
                  Distância
                </span>
                <span className="font-bold text-xs sm:text-sm text-neutral-900 block mt-0.5">
                  {item.modalidade || '5 KM'}
                </span>
              </div>

              {/* Gender Block */}
              <div className="bg-white/90 backdrop-blur-sm p-2.5 sm:p-3 rounded-xl border border-neutral-200 shadow-sm text-center flex flex-col justify-center">
                <span className="text-[10px] uppercase font-bold text-neutral-500 block mb-0.5">
                  Gênero
                </span>
                <span className="font-bold text-xs sm:text-sm text-neutral-900 block">
                  {parseGender(item.genero)}
                </span>
                <span className="text-[11px] font-semibold text-neutral-700 block mt-0.5">
                  {itemGen === 'Masculino' || itemGen === 'M' ? 'Geral Masculino' : itemGen === 'Feminino' || itemGen === 'F' ? 'Geral Feminino' : 'Geral'}
                </span>
                <span className="text-[11px] font-extrabold text-amber-800 block mt-0.5">
                  {itemGen === 'Feminino' || itemGen === 'F'
                    ? (displayRankNum ? `${displayRankNum.replace('º', 'ª')} Colocada` : 'Concluinte')
                    : (displayRankNum ? `${displayRankNum} Colocado` : 'Concluinte')}
                </span>
              </div>

              {/* Position: Posição Rato Team (+ 20% size increase + C.G.CP small below) */}
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-2.5 sm:p-3 rounded-xl text-white shadow-md text-center flex flex-col justify-center">
                <span className="text-[10px] uppercase font-bold text-amber-100 block mb-0.5">
                  Posição Rato Team
                </span>
                <span className="font-black text-base sm:text-lg text-white drop-shadow-sm">
                  {formattedPos}
                </span>
                <span className="text-[10.5px] font-bold text-amber-100/90 block mt-1 pt-1 border-t border-amber-400/50">
                  C.G.CP: {item.cgcp || '-'}
                </span>
              </div>

            </div>

            {/* Times Grid */}
            <div className="grid grid-cols-3 gap-3 my-4 bg-amber-500/10 p-4 rounded-xl border border-amber-300/60">
              
              {/* Net Time */}
              <div className="text-center">
                <span className="text-[10px] uppercase font-bold text-amber-900 block flex items-center justify-center gap-1 mb-1">
                  <Timer className="w-3 h-3 text-amber-600" />
                  Tempo Líquido
                </span>
                <span className="font-mono font-extrabold text-base sm:text-2xl text-neutral-900">
                  {item.tLiq || '00:00:00'}
                </span>
              </div>

              {/* Gross Time */}
              <div className="text-center border-x border-amber-300/60 px-2">
                <span className="text-[10px] uppercase font-bold text-neutral-600 block flex items-center justify-center gap-1 mb-1">
                  <Zap className="w-3 h-3 text-neutral-500" />
                  Tempo Bruto
                </span>
                <span className="font-mono font-semibold text-sm sm:text-xl text-neutral-700">
                  {item.tBruto || '00:00:00'}
                </span>
              </div>

              {/* Pace */}
              <div className="text-center">
                <span className="text-[10px] uppercase font-bold text-neutral-600 block flex items-center justify-center gap-1 mb-1">
                  <Flame className="w-3 h-3 text-amber-600" />
                  Pace Médio
                </span>
                <span className="font-mono font-semibold text-sm sm:text-xl text-neutral-800">
                  {item.pace ? `${item.pace} /km` : '-'}
                </span>
              </div>

            </div>

            {/* Certificate Footer / Validation Stamp */}
            <div className="mt-8 pt-4 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Documento oficial emitido e validado via cronometragem eletrônica.</span>
              </div>

              <div className="flex items-center gap-3 font-mono text-[10px] text-neutral-400">
                <span>Cod. Validação: {item.numero}-{item.tLiq?.replace(/:/g, '') || '000'}</span>
              </div>
            </div>

          </div>
        </div>

        {/* Print Styles helper */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #certificate-print-area, #certificate-print-area * {
              visibility: visible;
            }
            #certificate-print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              height: 100%;
              border-width: 4px !important;
              page-break-after: avoid;
            }
          }
        `}</style>
      </div>
    </div>
  );
};
