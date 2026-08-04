const fs = require('fs');

let content = fs.readFileSync('src/pages/AdminPage.tsx', 'utf-8');

const tabGroupOld = `<button 
          onClick={() => setActiveTab('config')}
          className={\`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md font-medium text-sm whitespace-nowrap transition-colors \${activeTab === 'config' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'}\`}
        >
          <Settings size={18} /> Configurações Gerais
        </button>`;
const tabGroupNew = `<button 
          onClick={() => setActiveTab('registrations')}
          className={\`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md font-medium text-sm whitespace-nowrap transition-colors \${activeTab === 'registrations' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'}\`}
        >
          <Users size={18} /> Inscritos
        </button>
        <button 
          onClick={() => setActiveTab('config')}
          className={\`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md font-medium text-sm whitespace-nowrap transition-colors \${activeTab === 'config' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'}\`}
        >
          <Settings size={18} /> Configurações Gerais
        </button>`;
content = content.replace(tabGroupOld, tabGroupNew);

const listStartOld = `          <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><Users size={20} /> Inscritos ({filteredRegistrations.length})</h3>`;
const listStartNew = `        </div>
      )}

      {activeTab === 'registrations' && (
        <div className="flex flex-col gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><Users size={20} /> Inscritos ({filteredRegistrations.length})</h3>`;
content = content.replace(listStartOld, listStartNew);

fs.writeFileSync('src/pages/AdminPage.tsx', content);
