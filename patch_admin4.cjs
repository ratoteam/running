const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminPage.tsx', 'utf8');

const targetImport = `import { Eye, EyeOff, Image as ImageIcon, Upload, Loader2, X, Link2, Check, BarChart3, Settings, Users, Trash2, Download, Database, FileUp, FileDown, Trash, Edit } from 'lucide-react';`;
const replaceImport = `import { Eye, EyeOff, Image as ImageIcon, Upload, Loader2, X, Link2, Check, BarChart3, Settings, Users, Trash2, Download, Database, FileUp, FileDown, Trash, Edit, Bold, Italic } from 'lucide-react';`;

content = content.replace(targetImport, replaceImport);

const targetTitleHeader = `<h4 className="font-medium text-neutral-800 text-sm">Configuração do Título</h4>`;
const replaceTitleHeader = `<h4 className="font-medium text-neutral-800 text-sm">Título</h4>`;

content = content.replace(targetTitleHeader, replaceTitleHeader);

const targetSubtitleHeader = `<h4 className="font-medium text-neutral-800 text-sm">Configuração do Subtítulo</h4>`;
const replaceSubtitleHeader = `<h4 className="font-medium text-neutral-800 text-sm">Subtítulo</h4>`;

content = content.replace(targetSubtitleHeader, replaceSubtitleHeader);

const targetTitleChecks = `<div className="md:col-span-3 flex items-center gap-4 h-10 pb-2">
                              <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={config.pageTitleBold !== false}
                                  onChange={(e) => setConfig({ ...config, pageTitleBold: e.target.checked })}
                                  className="rounded text-green-600 focus:ring-green-600"
                                />
                                Negrito
                              </label>
                              <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={config.pageTitleItalic || false}
                                  onChange={(e) => setConfig({ ...config, pageTitleItalic: e.target.checked })}
                                  className="rounded text-green-600 focus:ring-green-600"
                                />
                                Itálico
                              </label>
                            </div>`;

const replaceTitleChecks = `<div className="md:col-span-3 flex items-center gap-2 h-10 pb-2">
                              <button 
                                type="button"
                                onClick={() => setConfig({ ...config, pageTitleBold: config.pageTitleBold !== false ? false : true })}
                                className={\`p-1.5 rounded border \${config.pageTitleBold !== false ? 'bg-neutral-200 border-neutral-300 text-neutral-900' : 'bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50'}\`}
                                title="Negrito"
                              >
                                <Bold size={16} />
                              </button>
                              <button 
                                type="button"
                                onClick={() => setConfig({ ...config, pageTitleItalic: !config.pageTitleItalic })}
                                className={\`p-1.5 rounded border \${config.pageTitleItalic ? 'bg-neutral-200 border-neutral-300 text-neutral-900' : 'bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50'}\`}
                                title="Itálico"
                              >
                                <Italic size={16} />
                              </button>
                            </div>`;

content = content.replace(targetTitleChecks, replaceTitleChecks);

const targetSubtitleChecks = `<div className="md:col-span-3 flex items-center gap-4 h-10 pb-2">
                              <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={config.pageSubtitleBold || false}
                                  onChange={(e) => setConfig({ ...config, pageSubtitleBold: e.target.checked })}
                                  className="rounded text-green-600 focus:ring-green-600"
                                />
                                Negrito
                              </label>
                              <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={config.pageSubtitleItalic || false}
                                  onChange={(e) => setConfig({ ...config, pageSubtitleItalic: e.target.checked })}
                                  className="rounded text-green-600 focus:ring-green-600"
                                />
                                Itálico
                              </label>
                            </div>`;

const replaceSubtitleChecks = `<div className="md:col-span-3 flex items-center gap-2 h-10 pb-2">
                              <button 
                                type="button"
                                onClick={() => setConfig({ ...config, pageSubtitleBold: !config.pageSubtitleBold })}
                                className={\`p-1.5 rounded border \${config.pageSubtitleBold ? 'bg-neutral-200 border-neutral-300 text-neutral-900' : 'bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50'}\`}
                                title="Negrito"
                              >
                                <Bold size={16} />
                              </button>
                              <button 
                                type="button"
                                onClick={() => setConfig({ ...config, pageSubtitleItalic: !config.pageSubtitleItalic })}
                                className={\`p-1.5 rounded border \${config.pageSubtitleItalic ? 'bg-neutral-200 border-neutral-300 text-neutral-900' : 'bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50'}\`}
                                title="Itálico"
                              >
                                <Italic size={16} />
                              </button>
                            </div>`;

content = content.replace(targetSubtitleChecks, replaceSubtitleChecks);

fs.writeFileSync('src/pages/AdminPage.tsx', content);
console.log("Patched admin file icons");
