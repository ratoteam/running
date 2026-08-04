const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminPage.tsx', 'utf8');

const oldStr1 = `                <div className="flex items-center justify-between">
                  <span className="font-medium">Status das inscrições</span>
                  <Button 
                    onClick={() => setConfig({ ...config, isActive: !config.isActive })}
                    className={config.isActive ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                  >
                    {config.isActive ? 'Ativado (Pausar)' : 'Pausado (Ativar)'}
                  </Button>
                </div>\\n<div className="flex items-center justify-between mt-4">`;

const oldStr1Alt = `                <div className="flex items-center justify-between">
                  <span className="font-medium">Status das inscrições</span>
                  <Button 
                    onClick={() => setConfig({ ...config, isActive: !config.isActive })}
                    className={config.isActive ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                  >
                    {config.isActive ? 'Ativado (Pausar)' : 'Pausado (Ativar)'}
                  </Button>
                </div>\n<div className="flex items-center justify-between mt-4">`;


const newStr1 = `                <div className="flex items-center justify-between mt-4">
                  <span className="font-medium">Status das inscrições</span>
                  <Button 
                    onClick={() => setConfig({ ...config, isActive: !config.isActive })}
                    className={config.isActive ? 'bg-green-600 hover:bg-green-700 w-28' : 'bg-neutral-500 hover:bg-neutral-600 w-28'}
                  >
                    {config.isActive ? 'Ativado' : 'Desativado'}
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-4">`;

if (content.includes(oldStr1)) {
    content = content.replace(oldStr1, newStr1);
} else {
    content = content.replace(oldStr1Alt, newStr1);
}

const oldStr2 = `                  <span className="font-medium">Permitir novos administradores</span>
                  <Button 
                    onClick={() => setConfig({ ...config, allowAdminRegistration: config.allowAdminRegistration === false ? true : false })}
                    className={config.allowAdminRegistration !== false ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                  >
                    {config.allowAdminRegistration !== false ? 'Permitido (Ocultar)' : 'Oculto (Permitir)'}
                  </Button>`;
                  
const newStr2 = `                  <span className="font-medium">Permitir novos administradores</span>
                  <Button 
                    onClick={() => setConfig({ ...config, allowAdminRegistration: config.allowAdminRegistration === false ? true : false })}
                    className={config.allowAdminRegistration !== false ? 'bg-green-600 hover:bg-green-700 w-28' : 'bg-neutral-500 hover:bg-neutral-600 w-28'}
                  >
                    {config.allowAdminRegistration !== false ? 'Ativado' : 'Desativado'}
                  </Button>`;

content = content.replace(oldStr2, newStr2);
fs.writeFileSync('src/pages/AdminPage.tsx', content);
