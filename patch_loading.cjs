const fs = require('fs');

function patchFile(filepath) {
  let content = fs.readFileSync(filepath, 'utf8');
  const oldLoading = `<div className="flex-1 flex items-center justify-center">Carregando...</div>`;
  const newLoading = `<div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
      <div className="w-12 h-12 border-4 border-neutral-200 border-t-green-600 rounded-full animate-spin"></div>
      <p className="text-neutral-500 font-medium">Carregando informações...</p>
    </div>`;
  
  if (content.includes(oldLoading)) {
    content = content.replace(oldLoading, newLoading);
    fs.writeFileSync(filepath, content);
    console.log(`Patched ${filepath}`);
  }
}

patchFile('src/pages/RegistrationPage.tsx');
patchFile('src/pages/SuccessPage.tsx');
patchFile('src/pages/AdminPage.tsx');
