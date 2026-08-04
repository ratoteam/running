const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminPage.tsx', 'utf8');

const isAutoMaxOld = `                <div className="flex flex-col gap-2 mt-2">
                  <label className="font-medium flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={config.isAutoMax} 
                      onChange={(e) => setConfig({ ...config, isAutoMax: e.target.checked })}
                    />
                    Calcular limite automaticamente (Soma das camisetas)
                  </label>`;

const isAutoMaxNew = `                <div className="flex flex-col gap-2 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Calcular limite automaticamente (Soma das camisetas)</span>
                    <Button 
                      onClick={() => setConfig({ ...config, isAutoMax: !config.isAutoMax })}
                      className={config.isAutoMax ? 'bg-green-600 hover:bg-green-700 w-28' : 'bg-neutral-500 hover:bg-neutral-600 w-28'}
                    >
                      {config.isAutoMax ? 'Ativado' : 'Desativado'}
                    </Button>
                  </div>`;
content = content.replace(isAutoMaxOld, isAutoMaxNew);

const enablePCDOld = `                <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-neutral-100">
                  <label className="font-medium flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={config.enablePCD} 
                      onChange={(e) => setConfig({ ...config, enablePCD: e.target.checked })}
                    />
                    Habilitar campo PCD (Pessoa com Deficiência)
                  </label>
                  <p className="text-xs text-neutral-500 pl-6">`;

const enablePCDNew = `                <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-neutral-100">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Habilitar campo PCD (Pessoa com Deficiência)</span>
                    <Button 
                      onClick={() => setConfig({ ...config, enablePCD: !config.enablePCD })}
                      className={config.enablePCD ? 'bg-green-600 hover:bg-green-700 w-28' : 'bg-neutral-500 hover:bg-neutral-600 w-28'}
                    >
                      {config.enablePCD ? 'Ativado' : 'Desativado'}
                    </Button>
                  </div>
                  <p className="text-xs text-neutral-500">`;
content = content.replace(enablePCDOld, enablePCDNew);

const showHeaderOld = `                <div className="flex flex-col gap-2">
                  <label className="font-medium flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={config.showHeader !== false} 
                      onChange={(e) => setConfig({ ...config, showHeader: e.target.checked })}
                      className="w-4 h-4"
                    />
                    Exibir topo no formulário (Logotipo Principal)
                  </label>
                  <p className="text-xs text-neutral-500 pl-6">
                    Se desmarcado, a logo e o título no topo da página de cadastro serão ocultados. Ideal caso você utilize um banner que já contenha a identidade visual.
                  </p>

                  {config.showHeader !== false && (
                    <div className="mt-4 pl-6 flex flex-col gap-6">`;

const showHeaderNew = `                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium cursor-pointer">Exibir topo no formulário (Logotipo Principal)</span>
                    <Button 
                      onClick={() => setConfig({ ...config, showHeader: config.showHeader === false ? true : false })}
                      className={config.showHeader !== false ? 'bg-green-600 hover:bg-green-700 w-28' : 'bg-neutral-500 hover:bg-neutral-600 w-28'}
                    >
                      {config.showHeader !== false ? 'Ativado' : 'Desativado'}
                    </Button>
                  </div>
                  <p className="text-xs text-neutral-500">
                    Se desativado, a logo e o título no topo da página de cadastro serão ocultados. Ideal caso você utilize um banner que já contenha a identidade visual.
                  </p>

                  {config.showHeader !== false && (
                    <div className="mt-4 flex flex-col gap-6">`;
content = content.replace(showHeaderOld, showHeaderNew);

fs.writeFileSync('src/pages/AdminPage.tsx', content);
