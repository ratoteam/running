const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminPage.tsx', 'utf8');

const target = `                      {/* Configuração de Título Simples */}
                      <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 mt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Título da Página</label>
                            <Input 
                              type="text" 
                              value={config.pageTitle || ''} 
                              onChange={(e) => setConfig({ ...config, pageTitle: e.target.value })}
                              placeholder="Meu Evento"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Tamanho do Título</label>
                            <select 
                              className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                              value={config.pageTitleSize || 'grande'}
                              onChange={(e) => setConfig({ ...config, pageTitleSize: e.target.value as any })}
                            >
                              <option value="pequeno">Pequeno</option>
                              <option value="medio">Médio</option>
                              <option value="grande">Grande</option>
                            </select>
                          </div>
                        </div>
                      </div>`;

const replace = `                      {/* Configuração de Título Simples */}
                      <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 mt-2 flex flex-col gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                          <div className="md:col-span-5">
                            <label className="block text-sm font-medium mb-1">Título da Página</label>
                            <Input 
                              type="text" 
                              value={config.pageTitle || ''} 
                              onChange={(e) => setConfig({ ...config, pageTitle: e.target.value })}
                              placeholder="Meu Evento"
                            />
                          </div>
                          <div className="md:col-span-4">
                            <label className="block text-sm font-medium mb-1">Tamanho do Título</label>
                            <select 
                              className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                              value={config.pageTitleSize || 'grande'}
                              onChange={(e) => setConfig({ ...config, pageTitleSize: e.target.value as any })}
                            >
                              <option value="pequeno">Pequeno</option>
                              <option value="medio">Médio</option>
                              <option value="grande">Grande</option>
                            </select>
                          </div>
                          <div className="md:col-span-3">
                            <label className="block text-sm font-medium mb-1">Cor do Título</label>
                            <div className="flex h-10">
                              <input 
                                type="color" 
                                value={config.pageTitleColor || '#171717'}
                                onChange={(e) => setConfig({ ...config, pageTitleColor: e.target.value })}
                                className="h-full w-full rounded-md border border-neutral-300 cursor-pointer p-1"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                          <div className="md:col-span-9">
                            <label className="block text-sm font-medium mb-1">Subtítulo da Página</label>
                            <Input 
                              type="text" 
                              value={config.pageSubtitle || ''} 
                              onChange={(e) => setConfig({ ...config, pageSubtitle: e.target.value })}
                              placeholder="Subtítulo opcional"
                            />
                          </div>
                          <div className="md:col-span-3">
                            <label className="block text-sm font-medium mb-1">Cor do Subtítulo</label>
                            <div className="flex h-10">
                              <input 
                                type="color" 
                                value={config.pageSubtitleColor || '#525252'}
                                onChange={(e) => setConfig({ ...config, pageSubtitleColor: e.target.value })}
                                className="h-full w-full rounded-md border border-neutral-300 cursor-pointer p-1"
                              />
                            </div>
                          </div>
                        </div>
                      </div>`;

content = content.replace(target, replace);
fs.writeFileSync('src/pages/AdminPage.tsx', content);
