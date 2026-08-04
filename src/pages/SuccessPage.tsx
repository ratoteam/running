import { useLocation, Navigate } from 'react-router-dom';
import { Button } from '../components/ui';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import { AppConfig } from '../types';
import { useEffect, useState } from 'react';
import { getConfig } from '../lib/db';
import { QRCodeSVG } from 'qrcode.react';

export default function SuccessPage() {
  const location = useLocation();
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      const c = await getConfig();
      setConfig(c);
    };
    fetchConfig();
  }, []);

  // Only allow access if navigated from a successful registration
  if (!location.state?.success) {
    return <Navigate to="/" replace />;
  }

  if (!config) {
    return <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
      <div className="w-12 h-12 border-4 border-neutral-200 border-t-green-600 rounded-full animate-spin"></div>
      <p className="text-neutral-500 font-medium">Carregando informações...</p>
    </div>;
  }

  return (
    <div className="flex-1 flex items-center justify-center py-12">
      <div className="bg-white p-8 md:p-12 rounded-xl shadow-lg border border-neutral-200 max-w-lg w-full text-center flex flex-col items-center">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={40} />
        </div>
        
        <h1 className="text-3xl font-black text-neutral-900 mb-4 tracking-tight">Inscrição Confirmada!</h1>
        <p className="text-neutral-600 text-lg mb-8 leading-relaxed">
          Sua inscrição foi realizada com sucesso. Você já garantiu a sua vaga no evento.
        </p>

        {config.whatsappGroupUrl ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 w-full flex flex-col items-center">
            <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center mb-4">
              <MessageCircle size={24} />
            </div>
            <h2 className="text-xl font-bold text-neutral-800 mb-2">Próximo Passo: Grupo Oficial</h2>
            <p className="text-sm text-neutral-700 mb-6 text-center">
              É <strong>extremamente importante</strong> que você entre no nosso grupo de WhatsApp. 
              Somente por lá enviaremos todas as orientações, horários, localização e atualizações essenciais sobre o evento.
            </p>

            <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-neutral-100 inline-block">
              <QRCodeSVG 
                value={config.whatsappGroupUrl} 
                size={160} 
                level="M"
                includeMargin={false}
              />
              <p className="text-xs text-neutral-500 mt-3">Escaneie com o celular</p>
            </div>

            <a 
              href={config.whatsappGroupUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full"
            >
              <Button className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all gap-2">
                <MessageCircle size={20} />
                Entrar no Grupo do WhatsApp
              </Button>
            </a>
          </div>
        ) : (
          <p className="text-neutral-500">
            Fique atento aos nossos canais de comunicação para mais informações.
          </p>
        )}
      </div>
    </div>
  );
}
