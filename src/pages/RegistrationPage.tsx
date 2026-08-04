import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-toastify';
import { Logo } from '../components/Logo';
import { Button, Input, Select } from '../components/ui';
import { AppConfig, Registration } from '../types';
import { getConfig, subscribeToConfig, subscribeToRegistrations, submitRegistration, initConfig, getRegistrationByCpf } from '../lib/db';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Eye, EyeOff, X } from 'lucide-react';

type FormValues = Omit<Registration, 'isAdmin' | 'createdAt' | 'id'> & { id?: string };

const maskCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
}

const maskPhone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{4,5})(\d{4})/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
}

const maskCEP = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
}

const maskDate = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\/\d{4})\d+?$/, '$1');
}

export default function RegistrationPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAdminAction = searchParams.get('admin') === 'true';

  const [cpfExists, setCpfExists] = useState(false);
  const [showCpfModal, setShowCpfModal] = useState(false);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [isAdminLoginLoading, setIsAdminLoginLoading] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [isAdminSignUp, setIsAdminSignUp] = useState(false);
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginError('');
    if (!adminEmail || !adminPassword) {
      setAdminLoginError('Preencha todos os campos');
      return;
    }
    if (isAdminSignUp && adminPassword !== adminConfirmPassword) {
      setAdminLoginError('As senhas não coincidem');
      return;
    }
    setIsAdminLoginLoading(true);
    try {
      if (isAdminSignUp) {
        await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
      } else {
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      }
      setShowAdminLoginModal(false);
      navigate('/admin');
    } catch (e: any) {
      if (e.code !== 'auth/email-already-in-use' && e.code !== 'auth/wrong-password' && e.code !== 'auth/user-not-found' && e.code !== 'auth/invalid-credential') {
        console.error(e);
      }
      if (e.code === 'auth/email-already-in-use') {
        setAdminLoginError('Este e-mail já possui cadastro. Faça login em vez de criar conta.');
      } else if (isAdminSignUp) {
        setAdminLoginError('Erro ao criar conta. A senha deve ter no mínimo 6 caracteres.');
      } else {
        setAdminLoginError('Credenciais inválidas.');
      }
    } finally {
      setIsAdminLoginLoading(false);
    }
  };


  const defaultValues = {
    kit: '',
    cpf: searchParams.get('cpf') || '',
    nome: '',
    sobrenome: '',
    dataNascimento: '',
    whatsapp: '',
    email: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    tshirtSize: '',
    genero: '',
    modalidade: '',
    pcd: ''
  };

  const { register, handleSubmit, watch, setValue, reset, control, formState: { errors, isDirty, isValid } } = useForm<FormValues>({
    mode: 'onChange',
    defaultValues
  });

  const selectedKit = watch('kit');
  const cepValue = watch('cep');
  const cpfValue = watch('cpf');

  useEffect(() => {
    initConfig().then(() => {
      const unsubConfig = subscribeToConfig(setConfig);
      const unsubRegs = subscribeToRegistrations(setRegistrations);
      setLoading(false);
      return () => {
        unsubConfig();
        unsubRegs();
      };
    });
  }, []);

  useEffect(() => {
    if (loading) return;
    const checkCpf = async () => {
      if (cpfValue && cpfValue.replace(/\D/g, '').length >= 11) {
        try {
          const reg = await getRegistrationByCpf(cpfValue);
          if (reg) {
            if (isAdminAction) {
              setCpfExists(false);
              reset({ ...defaultValues, ...reg, cpf: cpfValue });
            } else {
              setCpfExists(true);
              setShowCpfModal(true);
              reset({ ...defaultValues, cpf: cpfValue });
            }
          } else {
            setCpfExists(false);
          }
        } catch (e) {
          console.error("Failed to fetch registration by CPF", e);
        }
      } else {
        setCpfExists(false);
      }
    };
    
    // Simple debounce for CPF check
    const timeoutId = setTimeout(() => {
      checkCpf();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [cpfValue, reset, loading, isAdminAction]);

  useEffect(() => {
    const fetchCep = async () => {
      const cleanCep = cepValue?.replace(/\D/g, '');
      if (cleanCep && cleanCep.length === 8) {
        try {
          const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`);
          if (res.ok) {
            const data = await res.json();
            setValue('endereco', data.street || '');
            setValue('bairro', data.neighborhood || '');
            setValue('cidade', data.city || '');
            setValue('estado', data.state || '');
            return;
          }
          
          // Fallback to viacep
          const resVia = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
          if (resVia.ok) {
            const data = await resVia.json();
            if (!data.erro) {
              setValue('endereco', data.logradouro || '');
              setValue('bairro', data.bairro || '');
              setValue('cidade', data.localidade || '');
              setValue('estado', data.uf || '');
            }
          }
        } catch (e) {
          console.error("Erro ao buscar CEP", e);
        }
      }
    };
    fetchCep();
  }, [cepValue, setValue]);

  if (loading || !config) {
    return <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
      <div className="w-12 h-12 border-4 border-neutral-200 border-t-green-600 rounded-full animate-spin"></div>
      <p className="text-neutral-500 font-medium">Carregando informações...</p>
    </div>;
  }

  let autoMaxTotal = 0;
  if (config.kits && config.kits.length > 0) {
    config.kits.forEach(k => {
      if (k.tshirtSizes) {
        const sum = Object.values(k.tshirtSizes).reduce<number>((a, b) => a + Number(b), 0);
        autoMaxTotal += sum;
      }
    });
  } else {
    const sum = Object.values(config.tshirtSizes || {}).reduce<number>((a, b) => a + Number(b), 0);
    autoMaxTotal = sum;
  }

  const maxAllowed = config.isAutoMax ? autoMaxTotal : (config.maxRegistrations || 0);
  
  const totalRegistrations = registrations.length;
  const vagasRestantes = Math.max(0, maxAllowed - totalRegistrations);
  const isEsgotado = !isAdminAction && (vagasRestantes <= 0 || !config.isActive);

  const getTshirtSizesAvailable = () => {
    let sizesObj: Record<string, number> = {};
    let kitMode = false;
    
    if (config.kits && config.kits.length > 0) {
      if (!selectedKit) return [];
      const kit = config.kits.find(k => k.name === selectedKit);
      if (kit && kit.tshirtSizes) {
        sizesObj = kit.tshirtSizes;
        kitMode = true;
      }
    } else {
      sizesObj = config.tshirtSizes || {};
    }

    const sizeOrder = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XGG', 'XXG', 'XXXG'];
    const sizes = Object.keys(sizesObj).sort((a, b) => {
      const indexA = sizeOrder.indexOf(a.toUpperCase());
      const indexB = sizeOrder.indexOf(b.toUpperCase());
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });
    return sizes.map(size => {
      const taken = registrations.filter(r => 
        r.tshirtSize === size && (!kitMode || r.kit === selectedKit)
      ).length;
      
      const total = sizesObj[size];
      if (!config.isAutoMax) {
        return { size, available: vagasRestantes };
      }
      return { size, available: Math.max(0, total - taken) };
    });
  };

  const availableSizes = getTshirtSizesAvailable();

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true);
    const result = await submitRegistration(data);
    setSubmitting(false);
    if (result.success) {
      toast.success(result.message);
      if (isAdminAction) {
        navigate('/admin');
      } else {
        navigate('/success', { state: { success: true } });
      }
    } else {
      toast.error(result.message);
    }
  };

  const onErrors = (errors: any) => {
    toast.error('Por favor, preencha todos os campos obrigatórios corretamente.');
  };

  return (
    <div className="flex flex-col gap-6">
      <Logo config={config} />
      
      
      {/* Counters Panel */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 text-center flex flex-col items-center">
        <h2 className="text-2xl font-bold mb-4 uppercase tracking-tight">Status das Vagas</h2>
        <div className="flex flex-col items-center justify-center">
          <div className="text-6xl font-bold text-neutral-900 leading-none">
            {isEsgotado ? <span className="text-red-600 text-4xl">ESGOTADO</span> : vagasRestantes}
          </div>
          {!isEsgotado && (
            <div className="text-sm text-neutral-500 font-medium mt-2">
              Totais disponíveis.
            </div>
          )}
        </div>
        {config.maxRegistrations > 0 && !config.isAutoMax && (
          <div className="w-full max-w-md bg-neutral-100 rounded-full h-3 mt-6 overflow-hidden border border-neutral-200">
            <div 
              className="bg-neutral-900 h-3 rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${Math.min(100, Math.max(0, (registrations.length / config.maxRegistrations) * 100))}` + '%' }}
            ></div>
          </div>
        )}
      </div>

      {isAdminAction && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="font-bold text-blue-800">Modo Administrador</h3>
            <p className="text-sm text-blue-600">Você está editando o cadastro de: <strong>{isAdminAction}</strong></p>
          </div>
          <Button 
            type="button" 
            onClick={() => window.location.href = '/admin'}
            className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
          >
            Voltar ao Painel
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit, onErrors)} className="flex flex-col gap-6">
        <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm border border-neutral-200">
          <h2 className="text-xl font-bold mb-6 border-b pb-2">Dados Pessoais</h2>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-4">
              <label className="block text-sm font-medium mb-1 text-neutral-700">CPF <span className="text-red-500">*</span></label>
              <Controller
                name="cpf"
                control={control}
                rules={{ required: true, pattern: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/ }}
                render={({ field: { onChange, ...rest } }) => (
                  <Input 
                    {...rest}
                    onChange={(e) => {
                      e.target.value = maskCPF(e.target.value);
                      onChange(e);
                    }}
                    placeholder="000.000.000-00" 
                    maxLength={14}
                    disabled={isEsgotado || submitting} 
                  />
                )}
              />
              <p className="text-xs text-neutral-500 mt-1">Apenas números</p>
            </div>
            <div className="md:col-span-8 hidden md:block"></div>

            <div className="md:col-span-6">
              <label className="block text-sm font-medium mb-1.5 text-neutral-700">Nome</label>
              <Input {...register('nome', { required: true })} disabled={isEsgotado || submitting} />
            </div>
            <div className="md:col-span-6">
              <label className="block text-sm font-medium mb-1.5 text-neutral-700">Sobrenome</label>
              <Input {...register('sobrenome', { required: true })} disabled={isEsgotado || submitting} />
            </div>

            <div className="md:col-span-4">
              <label className="block text-sm font-medium mb-1.5 text-neutral-700">Data de Nascimento</label>
              <Input 
                {...(() => {
                  const { onChange, ...rest } = register('dataNascimento', { required: true });
                  return {
                    ...rest,
                    onChange: (e) => {
                      e.target.value = maskDate(e.target.value);
                      onChange(e);
                    }
                  };
                })()} 
                placeholder="DD/MM/AAAA" 
                maxLength={10}
                disabled={isEsgotado || submitting} 
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-sm font-medium mb-1.5 text-neutral-700">Gênero</label>
              <Select {...register('genero', { required: true })} disabled={isEsgotado || submitting}>
                <option value="">Selecione...</option>
                {(config.genders || []).map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </Select>
            </div>
            {config.enablePCD ? (
              <div className="md:col-span-4">
                <label className="block text-sm font-medium mb-1.5 text-neutral-700">PCD?</label>
                <Select {...register('pcd', { required: true })} disabled={isEsgotado || submitting}>
                  <option value="">Selecione...</option>
                  <option value="Sim">Sim</option>
                  <option value="Não">Não</option>
                </Select>
              </div>
            ) : (
              <div className="md:col-span-4 hidden md:block"></div>
            )}
          </div>
        </div>

        {/* Seção 2: Contato e Endereço */}
        <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm border border-neutral-200">
          <h3 className="text-lg font-bold text-neutral-800 mb-5 pb-2 border-b border-neutral-100 flex items-center gap-2">
            <span className="bg-neutral-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
            Contato e Endereço
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-6">
            <div className="md:col-span-4">
              <label className="block text-sm font-medium mb-1.5 text-neutral-700">WhatsApp</label>
              <Input 
                {...(() => {
                  const { onChange, ...rest } = register('whatsapp', { required: true });
                  return {
                    ...rest,
                    onChange: (e) => {
                      e.target.value = maskPhone(e.target.value);
                      onChange(e);
                    }
                  };
                })()} 
                placeholder="(00) 00000-0000" 
                maxLength={15}
                disabled={isEsgotado || submitting} 
              />
              <p className="text-xs text-neutral-500 mt-1">Apenas números</p>
            </div>
            <div className="md:col-span-8">
              <label className="block text-sm font-medium mb-1.5 text-neutral-700">E-mail</label>
              <Input type="email" {...register('email', { required: true })} disabled={isEsgotado || submitting} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-4">
              <label className="block text-sm font-medium mb-1.5 text-neutral-700">CEP</label>
              <Input 
                {...(() => {
                  const { onChange, ...rest } = register('cep', { required: true });
                  return {
                    ...rest,
                    onChange: (e) => {
                      e.target.value = maskCEP(e.target.value);
                      onChange(e);
                    }
                  };
                })()} 
                placeholder="00000-000" 
                maxLength={9}
                disabled={isEsgotado || submitting} 
              />
              <p className="text-xs text-neutral-500 mt-1">Apenas números</p>
            </div>
            <div className="md:col-span-8">
              <label className="block text-sm font-medium mb-1.5 text-neutral-700">Logradouro / Endereço</label>
              <Input {...register('endereco', { required: true })} disabled={isEsgotado || submitting} />
            </div>
            
            <div className="md:col-span-3">
              <label className="block text-sm font-medium mb-1.5 text-neutral-700">Número</label>
              <Input {...register('numero', { required: true })} disabled={isEsgotado || submitting} />
            </div>
            <div className="md:col-span-4">
              <label className="block text-sm font-medium mb-1.5 text-neutral-700">Complemento <span className="text-neutral-400 font-normal">(Opcional)</span></label>
              <Input {...register('complemento')} disabled={isEsgotado || submitting} />
            </div>
            <div className="md:col-span-5">
              <label className="block text-sm font-medium mb-1.5 text-neutral-700">Bairro</label>
              <Input {...register('bairro', { required: true })} disabled={isEsgotado || submitting} />
            </div>

            <div className="md:col-span-8">
              <label className="block text-sm font-medium mb-1.5 text-neutral-700">Cidade</label>
              <Input {...register('cidade', { required: true })} disabled={isEsgotado || submitting} />
            </div>
            <div className="md:col-span-4">
              <label className="block text-sm font-medium mb-1.5 text-neutral-700">Estado</label>
              <Input {...register('estado', { required: true })} disabled={isEsgotado || submitting} />
            </div>
          </div>
        </div>

        {/* Seção 3: Seleção do Evento */}
        <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm border border-neutral-200">
          <h3 className="text-lg font-bold text-neutral-800 mb-5 pb-2 border-b border-neutral-100 flex items-center gap-2">
            <span className="bg-neutral-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
            Opções do Evento
          </h3>
          <div className="flex flex-col gap-8">
            <div>
              <label className="block text-sm font-medium mb-3 text-neutral-700">Modalidade</label>
              <div className="flex flex-col gap-3">
                {(config.modalities || []).map(m => (
                  <label key={m} className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${isEsgotado || submitting ? 'opacity-50 cursor-not-allowed bg-neutral-100 border-neutral-200' : 'cursor-pointer hover:bg-neutral-50 border-neutral-200'}`}>
                    <input 
                      type="radio" 
                      value={m} 
                      {...register('modalidade', { required: true })} 
                      disabled={isEsgotado || submitting} 
                      className="w-4 h-4 text-neutral-900 focus:ring-neutral-900 disabled:opacity-50" 
                    />
                    <span className="text-sm font-medium">{m}</span>
                  </label>
                ))}
              </div>
            </div>

            {config.kits && config.kits.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-3 text-neutral-700">Selecione o Kit</label>
                <div className="flex flex-col gap-3">
                  {(config.kits || []).map(k => (
                    <label key={k.name} className={`flex items-start gap-3 p-3 border rounded-lg transition-colors ${isEsgotado || submitting ? 'opacity-50 cursor-not-allowed bg-neutral-100 border-neutral-200' : 'cursor-pointer hover:bg-neutral-50 border-neutral-200'}`}>
                      <input 
                        type="radio" 
                        value={k.name} 
                        {...register('kit', { required: true })} 
                        disabled={isEsgotado || submitting} 
                        className="w-4 h-4 mt-0.5 text-neutral-900 focus:ring-neutral-900 disabled:opacity-50" 
                      />
                      <div className="flex flex-col flex-1">
                        <span className="text-sm font-medium">{k.name}</span>
                        {k.imageUrl && (
                          <div className="mt-2 w-full max-w-xs bg-neutral-50 p-2 rounded border border-neutral-100">
                            <img 
                              src={k.imageUrl} 
                              alt={`Imagem do ${k.name}`} 
                              className="max-w-full h-auto object-contain rounded drop-shadow-sm max-h-40" 
                              onError={(e) => { e.currentTarget.style.display = 'none' }}
                            />
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
            
            {(!config.kits || config.kits.length === 0 || selectedKit) && (
              <div>
                <label className="block text-sm font-medium mb-3 text-neutral-700">Tamanho da Camiseta</label>
                <div className="flex flex-col gap-3">
                  {availableSizes.map(s => (
                    <label 
                      key={s.size} 
                      className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${isEsgotado || submitting || s.available <= 0 ? 'opacity-50 cursor-not-allowed bg-neutral-100 border-neutral-200' : 'cursor-pointer hover:bg-neutral-50 border-neutral-200'}`}
                    >
                      <input 
                        type="radio" 
                        value={s.size} 
                        {...register('tshirtSize', { required: true })} 
                        disabled={isEsgotado || submitting || s.available <= 0} 
                        className="w-4 h-4 text-neutral-900 focus:ring-neutral-900 disabled:opacity-50" 
                      />
                      <span className="text-sm font-medium">
                        {s.size} {config.isAutoMax ? (s.available <= 0 ? '(Esgotado)' : `(${s.available} disp.)`) : (s.available <= 0 ? '(Esgotado)' : '')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full mt-2 h-14 text-lg font-bold tracking-wide uppercase transition-all shadow-md hover:shadow-lg" 
          disabled={isEsgotado || submitting || cpfExists}
        >
          {submitting ? 'Processando...' : isEsgotado ? 'Inscrições Encerradas' : cpfExists ? 'Cadastro Já Realizado' : isAdminAction ? 'Salvar Alterações' : 'Confirmar Inscrição'}
        </Button>
      </form>

      <div className="text-center mt-8">
        <button 
          onClick={() => setShowAdminLoginModal(true)} 
          className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          Área do Administrador
        </button>
      </div>

      
      {showAdminLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setShowAdminLoginModal(false)}
              className="absolute right-4 top-4 text-neutral-400 hover:text-neutral-600"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-center text-neutral-900 mb-6">
              {isAdminSignUp ? 'Criar Conta' : 'Acesso Restrito'}
            </h3>
            <form onSubmit={handleAdminLogin} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-left">E-mail</label>
                <Input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-left">Senha</label>
                <div className="relative">
                  <Input 
                    type={showAdminPassword ? "text" : "password"} 
                    value={adminPassword} 
                    onChange={e => setAdminPassword(e.target.value)} 
                    className="pr-10" 
                    required 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowAdminPassword(!showAdminPassword)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                  >
                    {showAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {isAdminSignUp && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-left">Confirmar Senha</label>
                  <div className="relative">
                    <Input 
                      type={showAdminPassword ? "text" : "password"} 
                      value={adminConfirmPassword} 
                      onChange={e => setAdminConfirmPassword(e.target.value)} 
                      className="pr-10" 
                      required 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowAdminPassword(!showAdminPassword)} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                    >
                      {showAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}
              {adminLoginError && <p className="text-red-500 text-sm text-left">{adminLoginError}</p>}
              <Button type="submit" className="mt-2" disabled={isAdminLoginLoading}>
                {isAdminLoginLoading ? 'Processando...' : (isAdminSignUp ? 'Cadastrar' : 'Entrar')}
              </Button>
            </form>
            {config?.allowAdminRegistration !== false && (
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => { setIsAdminSignUp(!isAdminSignUp); setAdminLoginError(''); setAdminPassword(''); setAdminConfirmPassword(''); }}
                  className="text-sm text-neutral-500 hover:underline"
                >
                  {isAdminSignUp ? 'Já tenho conta' : 'Cadastrar novo administrador'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showCpfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 relative animate-in fade-in zoom-in duration-200">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-center text-neutral-900 mb-2">
              CPF já cadastrado
            </h3>
            <p className="text-sm text-center text-neutral-500 mb-6">
              Este CPF já possui cadastro no sistema. Para realizar alterações, por favor, contate o administrador.
            </p>
            <Button 
              onClick={() => setShowCpfModal(false)}
              className="w-full bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Ok
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
