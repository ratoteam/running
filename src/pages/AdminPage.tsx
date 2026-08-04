import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Button, Input } from '../components/ui';
import { AppConfig, Registration, KitOption } from '../types';
import { getConfig, subscribeToConfig, subscribeToRegistrations, updateConfig, clearAllRegistrations, importRegistrations, deleteRegistration } from '../lib/db';
import { auth, storage } from '../lib/firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Logo } from '../components/Logo';
import { Eye, EyeOff, Image as ImageIcon, Upload, Loader2, X, Link2, Check, BarChart3, Settings, Users, Trash2, Download, Database, FileUp, FileDown, Trash, Edit, Bold, Italic } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

import * as XLSX from 'xlsx';

export default function AdminPage() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginConfirmPassword, setLoginConfirmPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [config, setConfig] = useState<AppConfig | null>(null);

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  
  const [editSizes, setEditSizes] = useState<Record<string, number>>({});
  const [newSizeName, setNewSizeName] = useState('');
  const [newSizeQty, setNewSizeQty] = useState('');

  const [editBannerUrl, setEditBannerUrl] = useState('');
  const [editKits, setEditKits] = useState<KitOption[]>([]);
  const [newKitName, setNewKitName] = useState('');
  const [newKitUrl, setNewKitUrl] = useState('');
  const [newKitSizeNames, setNewKitSizeNames] = useState<Record<number, string>>({});
  const [newKitSizeQtys, setNewKitSizeQtys] = useState<Record<number, string>>({});

  const [isSignUp, setIsSignUp] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingKitImage, setUploadingKitImage] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const [showBannerUrlInput, setShowBannerUrlInput] = useState(false);
  const [showKitUrlInput, setShowKitUrlInput] = useState(false);
  const [showLogoUrlInput, setShowLogoUrlInput] = useState(false);

  const [activeTab, setActiveTab] = useState<'config' | 'dashboard' | 'registrations'>('dashboard');
  
  const [editGenders, setEditGenders] = useState<string[]>([]);
  const [newGenderName, setNewGenderName] = useState('');

  const [editModalities, setEditModalities] = useState<string[]>([]);
  const [newModalityName, setNewModalityName] = useState('');

  const [filterKit, setFilterKit] = useState('');
  const [filterSize, setFilterSize] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState('nome');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [deleteIdConfirm, setDeleteIdConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterKit, filterSize, filterGender, searchTerm, searchField]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubConfig = subscribeToConfig((cfg) => {
      setConfig(cfg);
      setEditSizes(cfg.tshirtSizes);
      setEditBannerUrl(cfg.bannerUrl || '');
      setEditKits(cfg.kits || []);
      setEditGenders(cfg.genders || []);
      setEditModalities(cfg.modalities || []);
    });
    
    let unsubRegs = () => {};
    if (isAuthenticated) {
      unsubRegs = subscribeToRegistrations(setRegistrations);
    }
    return () => {
      unsubConfig();
      if (isAuthenticated) unsubRegs();
    };
  }, [isAuthenticated]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginEmail || !loginPassword) {
      setLoginError('Preencha todos os campos');
      return;
    }
    if (isSignUp && loginPassword !== loginConfirmPassword) {
      setLoginError('As senhas não coincidem.');
      return;
    }
    try {
      if (isSignUp) {
        // Here we could check if it's the first user and assign admin privileges
        // For simplicity in this panel, creating an account logs you in.
        await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
      } else {
        await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      }
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setLoginError('Este e-mail já possui cadastro. Faça login em vez de criar conta.');
      } else if (isSignUp) {
        setLoginError('Erro ao criar conta. Pode já existir ou a senha é muito fraca (mínimo 6 caracteres).');
      } else {
        setLoginError('E-mail ou senha incorretos.');
      }
      if (error.code !== 'auth/email-already-in-use' && error.code !== 'auth/wrong-password' && error.code !== 'auth/user-not-found' && error.code !== 'auth/invalid-credential') {
        console.error(error);
      }
    }
  };

  const handleDeleteIndividual = (id: string) => {
    setDeleteIdConfirm(id);
  };

  const confirmDeleteIndividual = async () => {
    if (!deleteIdConfirm) return;
    setIsDeleting(true);
    const result = await deleteRegistration(deleteIdConfirm);
    setIsDeleting(false);
    setDeleteIdConfirm(null);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const handleClearDatabase = () => {
    setShowClearConfirm(true);
  };

  const confirmClearDatabase = async () => {
    setIsClearing(true);
    const result = await clearAllRegistrations();
    setIsClearing(false);
    setShowClearConfirm(false);
    
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const downloadCSV = (data: any[], filename: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBackupCSV = () => {
    if (registrations.length === 0) {
      toast.info("Não há cadastros para fazer backup.");
      return;
    }
    const exportData = registrations.map(r => ({
      cpf: r.cpf || '',
      nome: r.nome || '',
      sobrenome: r.sobrenome || '',
      dataNascimento: r.dataNascimento || '',
      whatsapp: r.whatsapp || '',
      email: r.email || '',
      cep: r.cep || '',
      endereco: r.endereco || '',
      numero: r.numero || '',
      complemento: r.complemento || '',
      bairro: r.bairro || '',
      cidade: r.cidade || '',
      estado: r.estado || '',
      tshirtSize: r.tshirtSize || '',
      genero: r.genero || '',
      modalidade: r.modalidade || '',
      pcd: r.pcd || '',
      kit: r.kit || ''
    }));
    downloadCSV(exportData, "backup_inscritos.csv");
  };

  const handleDownloadCSVTemplate = () => {
    const templateData = [{
      cpf: '00000000000',
      nome: 'Exemplo',
      sobrenome: 'Silva',
      dataNascimento: '01/01/1990',
      whatsapp: '11999999999',
      email: 'exemplo@email.com',
      cep: '00000000',
      endereco: 'Rua Exemplo',
      numero: '123',
      complemento: 'Apto 1',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
      tshirtSize: 'M',
      genero: 'Masculino',
      modalidade: '5Km',
      pcd: 'Não',
      kit: 'Kit Simples'
    }];
    downloadCSV(templateData, "modelo_importacao.csv");
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json<any>(worksheet);
        
        if (data.length === 0) {
          toast.error("O arquivo está vazio.");
          return;
        }

        const formattedData = data.map(row => ({
          cpf: String(row.cpf || ''),
          nome: String(row.nome || ''),
          sobrenome: String(row.sobrenome || ''),
          dataNascimento: String(row.dataNascimento || ''),
          whatsapp: String(row.whatsapp || ''),
          email: String(row.email || ''),
          cep: String(row.cep || ''),
          endereco: String(row.endereco || ''),
          numero: String(row.numero || ''),
          complemento: String(row.complemento || ''),
          bairro: String(row.bairro || ''),
          cidade: String(row.cidade || ''),
          estado: String(row.estado || ''),
          tshirtSize: String(row.tshirtSize || ''),
          genero: String(row.genero || ''),
          modalidade: String(row.modalidade || ''),
          pcd: String(row.pcd || ''),
          kit: String(row.kit || ''),
          isAdmin: false
        })).filter(r => r.cpf && r.nome); // Require at least cpf and nome

        if (formattedData.length === 0) {
          toast.error("Nenhum registro válido encontrado. Verifique os cabeçalhos.");
          return;
        }

        const result = await importRegistrations(formattedData);
        if (result.success) {
          toast.success(result.message);
        } else {
          toast.error(result.message);
        }
      } catch (error) {
        console.error("Error parsing CSV: ", error);
        toast.error("Erro ao ler o arquivo CSV. Verifique o formato.");
      }
      
      // Reset file input
      e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleExportExcel = () => {
    const exportData = filteredRegistrations.map(r => ({
      'Participante': `${r.nome} ${r.sobrenome}`.trim(),
      'Documento': r.cpf,
      'Data nascimento': r.dataNascimento || '',
      'Gênero': r.genero || '',
      'E-mail': r.email || '',
      'Telefone': r.whatsapp || '',
      'Endereço': `${r.endereco || ''} ${r.numero || ''}`.trim(),
      'Modalidade': r.modalidade || '',
      'ETINIA': '',
      'Informe seu bairro/região:': r.bairro || '',
      'PCD?': (!config?.enablePCD) ? 'Não' : (r.pcd || 'Não'),
      'CAMISETA': r.tshirtSize || ''
    }));

    const headers = [
      'Participante', 'Documento', 'Data nascimento', 'Gênero', 'E-mail', 'Telefone',
      'Endereço', 'Modalidade', 'ETINIA', 'Informe seu bairro/região:', 'PCD?', 'CAMISETA'
    ];

    const worksheet = XLSX.utils.json_to_sheet(exportData, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inscritos");
    
    XLSX.writeFile(workbook, "Inscritos.xlsx");
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    setSaveStatus('saving');
    try {
      await updateConfig({ ...config, tshirtSizes: editSizes, bannerUrl: editBannerUrl, kits: editKits, genders: editGenders, modalities: editModalities });
      setSaveStatus('idle');
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      if (error.code !== 'auth/email-already-in-use' && error.code !== 'auth/wrong-password' && error.code !== 'auth/user-not-found' && error.code !== 'auth/invalid-credential') {
        console.error(error);
      }
      setSaveStatus('idle');
      toast.error('Erro ao salvar as configurações.');
    }
  };

  const handleAddSize = () => {
    if (newSizeName && newSizeQty) {
      setEditSizes({ ...editSizes, [newSizeName.toUpperCase()]: parseInt(newSizeQty, 10) });
      setNewSizeName('');
      setNewSizeQty('');
    }
  };

  const handleRemoveSize = (sizeToRemove: string) => {
    const newSizes = { ...editSizes };
    delete newSizes[sizeToRemove];
    setEditSizes(newSizes);
  };

  const handleAddGender = () => {
    if (newGenderName && !editGenders.includes(newGenderName)) {
      setEditGenders([...editGenders, newGenderName]);
      setNewGenderName('');
    }
  };

  const handleRemoveGender = (genderToRemove: string) => {
    setEditGenders(editGenders.filter(g => g !== genderToRemove));
  };

  const handleAddModality = () => {
    if (newModalityName && !editModalities.includes(newModalityName)) {
      setEditModalities([...editModalities, newModalityName]);
      setNewModalityName('');
    }
  };

  const handleRemoveModality = (modalityToRemove: string) => {
    setEditModalities(editModalities.filter(m => m !== modalityToRemove));
  };

  const handleAddKit = () => {
    if (newKitName) {
      setEditKits([...editKits, { name: newKitName, imageUrl: newKitUrl, tshirtSizes: {} }]);
      setNewKitName('');
      setNewKitUrl('');
    }
  };

  const handleRemoveKit = (idx: number) => {
    setEditKits(editKits.filter((_, i) => i !== idx));
  };

  const handleAddKitSize = (idx: number) => {
    const sizeName = newKitSizeNames[idx];
    const sizeQty = newKitSizeQtys[idx];
    if (sizeName && sizeQty) {
      const newKits = [...editKits];
      if (!newKits[idx].tshirtSizes) {
        newKits[idx].tshirtSizes = {};
      }
      newKits[idx].tshirtSizes![sizeName.toUpperCase()] = parseInt(sizeQty, 10);
      setEditKits(newKits);
      setNewKitSizeNames({ ...newKitSizeNames, [idx]: '' });
      setNewKitSizeQtys({ ...newKitSizeQtys, [idx]: '' });
    }
  };

  const handleRemoveKitSize = (kitIdx: number, sizeToRemove: string) => {
    const newKits = [...editKits];
    if (newKits[kitIdx].tshirtSizes) {
      delete newKits[kitIdx].tshirtSizes![sizeToRemove];
      setEditKits(newKits);
    }
  };

  const handleUpdateKitSizeQty = (kitIdx: number, size: string, qty: number) => {
    const newKits = [...editKits];
    if (newKits[kitIdx].tshirtSizes) {
      newKits[kitIdx].tshirtSizes![size] = qty;
      setEditKits(newKits);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingBanner(true);
    try {
      const storageRef = ref(storage, `banners/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setEditBannerUrl(url);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao enviar imagem.');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleKitImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingKitImage(true);
    try {
      const storageRef = ref(storage, `kits/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setNewKitUrl(url);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao enviar imagem.');
    } finally {
      setUploadingKitImage(false);
    }
  };

  const handleHeaderBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !config) return;
    
    setUploadingLogo(true);
    try {
      const storageRef = ref(storage, `banners/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setConfig({ ...config, headerBannerUrl: url });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao enviar imagem.');
    } finally {
      setUploadingLogo(false);
    }
  };

  if (authLoading) return <div className="flex-1 flex items-center justify-center">Carregando painel...</div>;

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center max-w-md mx-auto w-full pt-12 gap-6">
        <Logo />
        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 w-full">
          <h2 className="text-xl font-bold mb-4 text-center">
            {isSignUp ? 'Criar Conta' : 'Acesso Restrito'}
          </h2>
          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">E-mail</label>
              <Input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Senha</label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium mb-1">Confirmar Senha</label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} value={loginConfirmPassword} onChange={e => setLoginConfirmPassword(e.target.value)} className="pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}
            {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
            <Button type="submit" className="mt-2">
              {isSignUp ? 'Cadastrar' : 'Entrar'}
            </Button>
          </form>
          <div className="text-center mt-4 text-sm flex flex-col gap-2">
            {config?.allowAdminRegistration !== false && (
              <button 
                onClick={() => { setIsSignUp(!isSignUp); setLoginError(''); setLoginPassword(''); setLoginConfirmPassword(''); }} 
                className="text-neutral-500 hover:underline"
              >
                {isSignUp ? 'Já tenho conta' : 'Cadastrar'}
              </button>
            )}
            <button onClick={() => navigate('/')} className="text-neutral-400 hover:underline">Voltar ao site</button>
          </div>
        </div>
      </div>
    );
  }

  if (!config) return <div className="flex-1 flex items-center justify-center">Carregando configurações...</div>;

  const filteredRegistrations = registrations.filter(r => {
    if (filterKit && r.kit !== filterKit) return false;
    if (filterSize && r.tshirtSize !== filterSize) return false;
    if (filterGender && r.genero !== filterGender) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (searchField === 'nome') {
        const fullName = `${r.nome || ''} ${r.sobrenome || ''}`.toLowerCase();
        if (!fullName.includes(term)) return false;
      } else if (searchField === 'cpf') {
        if (!(r.cpf || '').toLowerCase().includes(term)) return false;
      } else if (searchField === 'whatsapp') {
        if (!(r.whatsapp || '').toLowerCase().includes(term)) return false;
      } else if (searchField === 'email') {
        if (!(r.email || '').toLowerCase().includes(term)) return false;
      }
    }
    return true;
  });

  const itemsPerPage = 50;
  const totalPages = Math.ceil(filteredRegistrations.length / itemsPerPage);
  const paginatedRegistrations = filteredRegistrations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  const getGenderData = () => {
    const data: Record<string, number> = {};
    filteredRegistrations.forEach(r => {
      const g = r.genero || 'Não informado';
      data[g] = (data[g] || 0) + 1;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  };

  const getKitData = () => {
    const data: Record<string, number> = {};
    filteredRegistrations.forEach(r => {
      const k = r.kit || 'Nenhum';
      data[k] = (data[k] || 0) + 1;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  };

  const getSizeData = () => {
    const data: Record<string, number> = {};
    filteredRegistrations.forEach(r => {
      const s = r.tshirtSize || 'Nenhum';
      data[s] = (data[s] || 0) + 1;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  };

  const allSizes = new Set<string>();
  if (config?.kits && config.kits.length > 0) {
    config.kits.forEach(k => {
      if (k.tshirtSizes) {
        Object.keys(k.tshirtSizes).forEach(s => allSizes.add(s));
      }
    });
  } else {
    Object.keys(config?.tshirtSizes || {}).forEach(s => allSizes.add(s));
  }
  const filterSizeOptions = Array.from(allSizes);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-neutral-200">
        <h2 className="text-xl font-bold uppercase tracking-tight">Painel de Configurações</h2>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/')} className="bg-transparent text-neutral-900 border border-neutral-300 hover:bg-neutral-100 hover:text-black">
            Voltar
          </Button>
          <Button onClick={handleLogout} className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">
            Sair
          </Button>
        </div>
      </div>

      <div className="flex bg-white rounded-lg p-1 shadow-sm border border-neutral-200 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'dashboard' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
        >
          <BarChart3 size={18} /> Dashboard e Filtros
        </button>
        <button 
          onClick={() => setActiveTab('registrations')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'registrations' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
        >
          <Users size={18} /> Inscritos
        </button>
        <button 
          onClick={() => setActiveTab('config')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'config' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
        >
          <Settings size={18} /> Configurações Gerais
        </button>
      </div>

      {activeTab === 'config' && (
        <>
          <div className="flex flex-col max-w-3xl mx-auto w-full gap-6">
            
              {/* Registration Control */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 flex flex-col gap-4">
                <h3 className="text-lg font-bold border-b pb-2">Configurações do Formulário</h3>
                
                <div className="flex items-center justify-between mt-4">
                  <span className="font-medium">Status das inscrições</span>
                  <Button 
                    onClick={() => setConfig({ ...config, isActive: !config.isActive })}
                    className={config.isActive ? 'bg-green-600 hover:bg-green-700 w-28' : 'bg-neutral-500 hover:bg-neutral-600 w-28'}
                  >
                    {config.isActive ? 'Ativado' : 'Desativado'}
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span className="font-medium">Permitir novos administradores</span>
                  <Button 
                    onClick={() => setConfig({ ...config, allowAdminRegistration: config.allowAdminRegistration === false ? true : false })}
                    className={config.allowAdminRegistration !== false ? 'bg-green-600 hover:bg-green-700 w-28' : 'bg-neutral-500 hover:bg-neutral-600 w-28'}
                  >
                    {config.allowAdminRegistration !== false ? 'Ativado' : 'Desativado'}
                  </Button>
                </div>

                <div className="flex flex-col gap-2 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Calcular limite automaticamente (Soma das camisetas)</span>
                    <Button 
                      onClick={() => setConfig({ ...config, isAutoMax: !config.isAutoMax })}
                      className={config.isAutoMax ? 'bg-green-600 hover:bg-green-700 w-28' : 'bg-neutral-500 hover:bg-neutral-600 w-28'}
                    >
                      {config.isAutoMax ? 'Ativado' : 'Desativado'}
                    </Button>
                  </div>
                  {!config.isAutoMax && (
                    <div className="pl-6">
                      <label className="block text-sm text-neutral-500 mb-1">Limite Manual de Vagas</label>
                      <Input 
                        type="number" 
                        value={config.maxRegistrations || 0} 
                        onChange={(e) => setConfig({ ...config, maxRegistrations: parseInt(e.target.value, 10) || 0 })}
                      />
                      <p className="text-xs text-neutral-400 mt-1">
                        Com o limite manual, as quantidades definidas por tamanho acima serão ignoradas e os participantes poderão escolher qualquer tamanho até que o total de vagas se esgote.
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-neutral-100">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Habilitar campo PCD (Pessoa com Deficiência)</span>
                    <Button 
                      onClick={() => setConfig({ ...config, enablePCD: !config.enablePCD })}
                      className={config.enablePCD ? 'bg-green-600 hover:bg-green-700 w-28' : 'bg-neutral-500 hover:bg-neutral-600 w-28'}
                    >
                      {config.enablePCD ? 'Ativado' : 'Desativado'}
                    </Button>
                  </div>
                  <p className="text-xs text-neutral-500">
                    Se ativado, adicionará a pergunta "PCD?" com as opções "Sim" e "Não" no formulário de cadastro.
                  </p>
                </div>

                <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-neutral-100">
                  <label className="block font-medium">Link do Grupo do WhatsApp</label>
                  <Input 
                    type="url" 
                    value={config.whatsappGroupUrl || ''} 
                    placeholder="https://chat.whatsapp.com/..."
                    onChange={(e) => setConfig({ ...config, whatsappGroupUrl: e.target.value })}
                  />
                  <p className="text-xs text-neutral-500">
                    O usuário será redirecionado para este link (ou o verá na página de sucesso) após concluir a inscrição.
                  </p>
                </div>
              </div>

              {/* Personalização Visual */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 flex flex-col gap-4">
                <h3 className="text-lg font-bold border-b pb-2">Personalização Visual</h3>
                
                <div className="flex flex-col gap-2">
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
                    <div className="mt-4 flex flex-col gap-6">
                      
                      {/* Configuração de Título Simples */}
                      <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 mt-2 flex flex-col gap-6">
                        
                        {/* Título Row */}
                        <div className="flex flex-col gap-2">
                          <h4 className="font-medium text-neutral-800 text-sm">Título</h4>
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                            <div className="md:col-span-4">
                              <label className="block text-xs text-neutral-500 mb-1">Texto</label>
                              <Input 
                                type="text" 
                                value={config.pageTitle || ''} 
                                onChange={(e) => setConfig({ ...config, pageTitle: e.target.value })}
                                placeholder="Meu Evento"
                              />
                            </div>
                            <div className="md:col-span-3">
                              <label className="block text-xs text-neutral-500 mb-1">Tamanho</label>
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
                            <div className="md:col-span-2">
                              <label className="block text-xs text-neutral-500 mb-1">Cor</label>
                              <div className="flex h-10">
                                <input 
                                  type="color" 
                                  value={config.pageTitleColor || '#171717'}
                                  onChange={(e) => setConfig({ ...config, pageTitleColor: e.target.value })}
                                  className="h-full w-full rounded-md border border-neutral-300 cursor-pointer p-1"
                                />
                              </div>
                            </div>
                            <div className="md:col-span-3 flex items-center gap-2 h-10 pb-2">
                              <button 
                                type="button"
                                onClick={() => setConfig({ ...config, pageTitleBold: config.pageTitleBold !== false ? false : true })}
                                className={`p-1.5 rounded border ${config.pageTitleBold !== false ? 'bg-neutral-200 border-neutral-300 text-neutral-900' : 'bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50'}`}
                                title="Negrito"
                              >
                                <Bold size={16} />
                              </button>
                              <button 
                                type="button"
                                onClick={() => setConfig({ ...config, pageTitleItalic: !config.pageTitleItalic })}
                                className={`p-1.5 rounded border ${config.pageTitleItalic ? 'bg-neutral-200 border-neutral-300 text-neutral-900' : 'bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50'}`}
                                title="Itálico"
                              >
                                <Italic size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Subtítulo Row */}
                        <div className="flex flex-col gap-2 border-t border-neutral-200 pt-4">
                          <h4 className="font-medium text-neutral-800 text-sm">Subtítulo</h4>
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                            <div className="md:col-span-4">
                              <label className="block text-xs text-neutral-500 mb-1">Texto</label>
                              <Input 
                                type="text" 
                                value={config.pageSubtitle || ''} 
                                onChange={(e) => setConfig({ ...config, pageSubtitle: e.target.value })}
                                placeholder="Subtítulo opcional"
                              />
                            </div>
                            <div className="md:col-span-3">
                              <label className="block text-xs text-neutral-500 mb-1">Tamanho</label>
                              <select 
                                className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                                value={config.pageSubtitleSize || 'medio'}
                                onChange={(e) => setConfig({ ...config, pageSubtitleSize: e.target.value as any })}
                              >
                                <option value="pequeno">Pequeno</option>
                                <option value="medio">Médio</option>
                                <option value="grande">Grande</option>
                              </select>
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-xs text-neutral-500 mb-1">Cor</label>
                              <div className="flex h-10">
                                <input 
                                  type="color" 
                                  value={config.pageSubtitleColor || '#525252'}
                                  onChange={(e) => setConfig({ ...config, pageSubtitleColor: e.target.value })}
                                  className="h-full w-full rounded-md border border-neutral-300 cursor-pointer p-1"
                                />
                              </div>
                            </div>
                            <div className="md:col-span-3 flex items-center gap-2 h-10 pb-2">
                              <button 
                                type="button"
                                onClick={() => setConfig({ ...config, pageSubtitleBold: !config.pageSubtitleBold })}
                                className={`p-1.5 rounded border ${config.pageSubtitleBold ? 'bg-neutral-200 border-neutral-300 text-neutral-900' : 'bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50'}`}
                                title="Negrito"
                              >
                                <Bold size={16} />
                              </button>
                              <button 
                                type="button"
                                onClick={() => setConfig({ ...config, pageSubtitleItalic: !config.pageSubtitleItalic })}
                                className={`p-1.5 rounded border ${config.pageSubtitleItalic ? 'bg-neutral-200 border-neutral-300 text-neutral-900' : 'bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50'}`}
                                title="Itálico"
                              >
                                <Italic size={16} />
                              </button>
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Header Banner Upload Section */}
                      <div>
                        <label className="block text-sm font-medium mb-1">Imagem do Banner de Cabeçalho (Opcional - JPEG ou PNG)</label>
                        <div className="flex items-center gap-2 mt-2">
                          {config.headerBannerUrl && (
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-10 h-10 rounded border border-neutral-200 overflow-hidden flex items-center justify-center bg-neutral-50 flex-shrink-0 cursor-pointer"
                                onClick={() => setPreviewImage(config.headerBannerUrl!)}
                                title="Ver imagem"
                              >
                                <img src={config.headerBannerUrl} alt="Banner" className="w-full h-full object-cover p-1" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                              </div>
                              <Button 
                                type="button" 
                                onClick={() => setConfig({ ...config, headerBannerUrl: '' })} 
                                className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 p-2 h-10 w-10 flex-shrink-0"
                                title="Remover banner"
                              >
                                <Trash2 size={18} />
                              </Button>
                            </div>
                          )}
                          
                          {showLogoUrlInput ? (
                            <div className="flex-1 flex items-center gap-2">
                              <Input 
                                type="text" 
                                value={config.headerBannerUrl || ''} 
                                placeholder="https://exemplo.com/banner.png"
                                onChange={(e) => setConfig({ ...config, headerBannerUrl: e.target.value })}
                                className="flex-1"
                              />
                              <Button type="button" onClick={() => setShowLogoUrlInput(false)} className="bg-green-600 hover:bg-green-700 px-3 h-10">
                                <Check size={18} />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex-1 flex items-center gap-2">
                              <button type="button" onClick={() => setShowLogoUrlInput(true)} className="w-10 h-10 rounded-md hover:bg-neutral-100 border border-neutral-200 flex items-center justify-center bg-white transition-colors" title="Inserir URL da imagem">
                                <Link2 className="text-neutral-500" size={20} />
                              </button>
                              <input
                                type="file"
                                id="header-banner-upload"
                                accept="image/jpeg, image/png"
                                className="hidden"
                                onChange={handleHeaderBannerUpload}
                                disabled={uploadingLogo}
                              />
                              <label htmlFor="header-banner-upload" className="cursor-pointer w-10 h-10 rounded-md hover:bg-neutral-100 border border-neutral-200 flex items-center justify-center bg-white transition-colors" title="Fazer upload de banner (JPEG/PNG)">
                                {uploadingLogo ? <Loader2 className="animate-spin text-neutral-500" size={20} /> : <Upload className="text-neutral-500" size={20} />}
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-2 pt-4 border-t border-dashed border-neutral-200">
                  <label className="block text-sm font-medium mb-1">Imagem do Banner Promocional</label>
                  <div className="flex items-center gap-2 mt-2">
                    {editBannerUrl && (
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-10 h-10 rounded border border-neutral-200 overflow-hidden flex items-center justify-center bg-neutral-50 flex-shrink-0 cursor-pointer"
                          onClick={() => setPreviewImage(editBannerUrl)}
                          title="Ver imagem"
                        >
                          <img src={editBannerUrl} alt="Banner thumb" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                        </div>
                        <Button 
                          type="button" 
                          onClick={() => setEditBannerUrl('')} 
                          className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 p-2 h-10 w-10 flex-shrink-0"
                          title="Remover banner"
                        >
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    )}
                    {showBannerUrlInput ? (
                      <div className="flex-1 flex items-center gap-2">
                        <Input 
                          value={editBannerUrl} 
                          onChange={e => setEditBannerUrl(e.target.value)} 
                          placeholder="URL da imagem..." 
                          className="flex-1"
                        />
                        <Button type="button" onClick={() => setShowBannerUrlInput(false)} className="bg-green-600 hover:bg-green-700 px-3 h-10">
                          <Check size={18} />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center gap-2">
                        <button type="button" onClick={() => setShowBannerUrlInput(true)} className="w-10 h-10 rounded-md hover:bg-neutral-100 border border-neutral-200 flex items-center justify-center bg-white transition-colors" title="Inserir URL da imagem">
                          <Link2 className="text-neutral-500" size={20} />
                        </button>
                        <input
                          type="file"
                          id="banner-upload"
                          accept="image/*"
                          className="hidden"
                          onChange={handleBannerUpload}
                          disabled={uploadingBanner}
                        />
                        <label htmlFor="banner-upload" className="cursor-pointer w-10 h-10 rounded-md hover:bg-neutral-100 border border-neutral-200 flex items-center justify-center bg-white transition-colors" title="Fazer upload de imagem">
                          {uploadingBanner ? <Loader2 className="animate-spin text-neutral-500" size={20} /> : <Upload className="text-neutral-500" size={20} />}
                        </label>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">Será exibido abaixo do topo na página de cadastro.</p>
                </div>
              </div>

              {/* Opções de Gênero */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 flex flex-col gap-4">
                <h3 className="text-lg font-bold border-b pb-2">Opções de Gênero</h3>
                <div className="flex flex-col gap-2">
                  {editGenders.map(g => (
                    <div key={g} className="flex items-center gap-2">
                      <div className="flex-1 font-bold">{g}</div>
                      <Button onClick={() => handleRemoveGender(g)} className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 p-2 h-auto">Remover</Button>
                    </div>
                  ))}
                  {editGenders.length === 0 && (
                    <div className="text-sm text-neutral-500 italic">Nenhum gênero configurado.</div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-dashed">
                  <Input 
                    placeholder="Ex: Não Binário" 
                    value={newGenderName} 
                    onChange={e => setNewGenderName(e.target.value)} 
                    className="flex-1"
                  />
                  <Button onClick={handleAddGender} className="bg-neutral-800">Adicionar</Button>
                </div>
              </div>

              {/* Opções de Modalidade */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 flex flex-col gap-4">
                <h3 className="text-lg font-bold border-b pb-2">Opções de Modalidade</h3>
                <div className="flex flex-col gap-2">
                  {editModalities.map(m => (
                    <div key={m} className="flex items-center gap-2">
                      <div className="flex-1 font-bold">{m}</div>
                      <Button onClick={() => handleRemoveModality(m)} className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 p-2 h-auto">Remover</Button>
                    </div>
                  ))}
                  {editModalities.length === 0 && (
                    <div className="text-sm text-neutral-500 italic">Nenhuma modalidade configurada.</div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-dashed">
                  <Input 
                    placeholder="Ex: 5Km" 
                    value={newModalityName} 
                    onChange={e => setNewModalityName(e.target.value)} 
                    className="flex-1"
                  />
                  <Button onClick={handleAddModality} className="bg-neutral-800">Adicionar</Button>
                </div>
              </div>

              {/* Opções de Kits */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 flex flex-col gap-4">
                <h3 className="text-lg font-bold border-b pb-2">Opções de Kits</h3>
                
                <div className="flex flex-col gap-2 mb-4 bg-neutral-50 p-4 border border-neutral-200 rounded-lg">
                  <h5 className="text-sm font-medium mb-1">Adicionar novo kit</h5>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <Input 
                      placeholder="Nome do Kit (ex: Premium)" 
                      value={newKitName} 
                      onChange={e => setNewKitName(e.target.value)} 
                      className="flex-1"
                    />
                    
                    {showKitUrlInput ? (
                      <div className="flex-1 flex items-center gap-2">
                        <Input 
                          placeholder="URL da Imagem..." 
                          value={newKitUrl} 
                          onChange={e => setNewKitUrl(e.target.value)} 
                          className="flex-1"
                        />
                        <Button type="button" onClick={() => setShowKitUrlInput(false)} className="bg-green-600 hover:bg-green-700 px-3 h-10">
                          <Check size={18} />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {newKitUrl && (
                          <div 
                            className="w-10 h-10 rounded border border-neutral-200 overflow-hidden flex items-center justify-center bg-white flex-shrink-0 cursor-pointer"
                            onClick={() => setPreviewImage(newKitUrl)}
                            title="Ver imagem"
                          >
                            <img src={newKitUrl} alt="Kit thumb" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                          </div>
                        )}
                        <button type="button" onClick={() => setShowKitUrlInput(true)} className="w-10 h-10 rounded-md hover:bg-neutral-200 border border-neutral-300 flex items-center justify-center bg-white transition-colors" title="Inserir URL da imagem">
                          <Link2 className="text-neutral-500" size={18} />
                        </button>
                        <input
                          type="file"
                          id="kit-image-upload"
                          accept="image/*"
                          className="hidden"
                          onChange={handleKitImageUpload}
                          disabled={uploadingKitImage}
                        />
                        <label htmlFor="kit-image-upload" className="cursor-pointer w-10 h-10 rounded-md hover:bg-neutral-200 border border-neutral-300 flex items-center justify-center bg-white transition-colors" title="Fazer upload de imagem">
                           {uploadingKitImage ? <Loader2 className="animate-spin text-neutral-500" size={18} /> : <Upload className="text-neutral-500" size={18} />}
                        </label>
                      </div>
                    )}
                    
                    <Button onClick={handleAddKit} className="bg-neutral-800 self-start sm:self-auto h-10 px-4">Adicionar</Button>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {editKits.map((kit, idx) => (
                    <div key={idx} className="flex flex-col bg-white p-4 border border-neutral-200 rounded gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          {kit.imageUrl ? (
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-10 h-10 rounded border border-neutral-200 overflow-hidden flex items-center justify-center bg-neutral-50 flex-shrink-0 cursor-pointer"
                                onClick={() => setPreviewImage(kit.imageUrl!)}
                                title="Ver imagem"
                              >
                                <img src={kit.imageUrl} alt={kit.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                              </div>
                              <Button
                                type="button"
                                onClick={() => {
                                  const newKits = [...editKits];
                                  newKits[idx].imageUrl = '';
                                  setEditKits(newKits);
                                }}
                                className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 p-1.5 h-auto w-auto flex-shrink-0"
                                title="Remover imagem do kit"
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded border border-neutral-200 flex items-center justify-center bg-neutral-50 flex-shrink-0">
                               <ImageIcon className="text-neutral-400" size={18} />
                            </div>
                          )}
                          <span className="font-bold text-lg">{kit.name}</span>
                        </div>
                        <Button onClick={() => handleRemoveKit(idx)} className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 py-1.5 px-3 h-auto">Remover Kit</Button>
                      </div>
                      
                      {/* T-Shirt Config for this Kit */}
                      <div className="bg-neutral-50 p-4 rounded-md border border-neutral-200">
                        <h4 className="text-sm font-bold text-neutral-700 mb-3">Tamanhos e Estoque deste Kit</h4>
                        <div className="flex flex-col gap-2">
                          {Object.entries(kit.tshirtSizes || {}).map(([size, qty]) => (
                            <div key={size} className="flex items-center gap-2">
                              <div className="w-16 font-bold text-sm">{size}</div>
                              <Input 
                                type="number" 
                                value={qty || 0} 
                                className="w-24 h-8 text-sm"
                                onChange={(e) => handleUpdateKitSizeQty(idx, size, parseInt(e.target.value, 10) || 0)}
                              />
                              <Button onClick={() => handleRemoveKitSize(idx, size)} className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 p-1.5 h-auto text-xs">Remover</Button>
                            </div>
                          ))}
                          {Object.keys(kit.tshirtSizes || {}).length === 0 && (
                            <div className="text-sm text-neutral-500 italic">Nenhum tamanho configurado para este kit.</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-200 border-dashed">
                          <Input 
                            placeholder="Ex: PP" 
                            value={newKitSizeNames[idx] || ''} 
                            onChange={e => setNewKitSizeNames({ ...newKitSizeNames, [idx]: e.target.value })}
                            className="w-20 h-8 text-sm uppercase"
                          />
                          <Input 
                            type="number" 
                            placeholder="Qtd (Ex: 50)" 
                            value={newKitSizeQtys[idx] || ''} 
                            onChange={e => setNewKitSizeQtys({ ...newKitSizeQtys, [idx]: e.target.value })}
                            className="w-32 h-8 text-sm"
                          />
                          <Button onClick={() => handleAddKitSize(idx)} className="bg-neutral-800 h-8 text-xs px-3">Adicionar</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {editKits.length === 0 && (
                    <div className="text-center p-4 text-neutral-500 border border-dashed border-neutral-300 rounded">
                      Nenhum kit adicionado.
                    </div>
                  )}
                </div>
              </div>

              {/* T-Shirt Config */}
              {editKits.length === 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 flex flex-col gap-4">
                <h3 className="text-lg font-bold border-b pb-2">Tamanhos e Estoque de Camisetas (Global)</h3>
                
                <div className="flex flex-col gap-2">
                  {Object.entries(editSizes).map(([size, qty]) => (
                    <div key={size} className="flex items-center gap-2">
                      <div className="w-16 font-bold">{size}</div>
                      <Input 
                        type="number" 
                        value={qty || 0} 
                        className="w-24"
                        onChange={(e) => setEditSizes({ ...editSizes, [size]: parseInt(e.target.value, 10) || 0 })}
                      />
                      <Button onClick={() => handleRemoveSize(size)} className="bg-red-100 text-red-600 hover:bg-red-200 p-2">Remover</Button>
                    </div>
                  ))}
                  {Object.keys(editSizes).length === 0 && (
                    <div className="text-sm text-neutral-500 italic">Nenhum tamanho configurado.</div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-dashed">
                  <Input 
                    placeholder="Ex: PP" 
                    value={newSizeName} 
                    onChange={e => setNewSizeName(e.target.value)} 
                    className="w-20"
                  />
                  <Input 
                    type="number" 
                    placeholder="Qtd" 
                    value={newSizeQty} 
                    onChange={e => setNewSizeQty(e.target.value)} 
                    className="w-24"
                  />
                  <Button onClick={handleAddSize} className="bg-neutral-800">Adicionar</Button>
                </div>
              </div>
              )}

              {/* Data Management */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 flex flex-col gap-4">
                <h3 className="text-lg font-bold border-b pb-2 flex items-center gap-2">
                  <Database size={20} /> Gerenciamento de Dados
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-neutral-200 p-4 rounded flex flex-col gap-3">
                    <h4 className="font-bold flex items-center gap-2"><FileDown size={18} /> Exportar / Backup</h4>
                    <p className="text-sm text-neutral-500 flex-1">Faça download de todos os cadastros em formato CSV para backup.</p>
                    <Button onClick={handleBackupCSV} className="w-full">
                      Download de Backup CSV
                    </Button>
                  </div>

                  <div className="border border-neutral-200 p-4 rounded flex flex-col gap-3">
                    <h4 className="font-bold flex items-center gap-2"><FileUp size={18} /> Importar Cadastros</h4>
                    <p className="text-sm text-neutral-500 flex-1">Importe cadastros via CSV. <a href="#" onClick={(e) => { e.preventDefault(); handleDownloadCSVTemplate(); }} className="text-blue-600 hover:underline">Baixe o modelo aqui</a>.</p>
                    <label className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 bg-neutral-900 text-white hover:bg-neutral-800 cursor-pointer">
                      <FileUp size={16} /> Selecionar e Importar CSV
                      <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
                    </label>
                  </div>
                </div>

                <div className="mt-2 pt-4 border-t border-neutral-100">
                  <div className="border border-red-200 bg-red-50 p-4 rounded flex flex-col gap-3">
                    <h4 className="font-bold text-red-700 flex items-center gap-2"><Trash size={18} /> Zona de Perigo</h4>
                    <p className="text-sm text-red-600">Apague todos os cadastros atuais do banco de dados. Esta ação é irreversível.</p>
                    <Button onClick={handleClearDatabase} className="w-full bg-red-600 hover:bg-red-700 text-white">
                      Limpar Banco de Dados
                    </Button>
                  </div>
                </div>
              </div>

          </div>

      <div className="flex justify-end items-center gap-4 mt-6">
        <Button onClick={handleSaveConfig} disabled={saveStatus === 'saving'} className="h-12 px-8 text-lg">
          {saveStatus === 'saving' ? 'Salvando...' : 'Salvar Todas as Configurações'}
        </Button>
      </div>
      </>
      )}

      {activeTab === 'dashboard' && (
        <div className="flex flex-col gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><BarChart3 size={20} /> Filtros</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Filtrar por Gênero</label>
                <select className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={filterGender} onChange={e => setFilterGender(e.target.value)}>
                  <option value="">Todos</option>
                  {(config.genders || []).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Filtrar por Kit</label>
                <select className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={filterKit} onChange={e => setFilterKit(e.target.value)}>
                  <option value="">Todos</option>
                  {(config.kits || []).map(k => <option key={k.name} value={k.name}>{k.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Filtrar por Tamanho</label>
                <select className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={filterSize} onChange={e => setFilterSize(e.target.value)}>
                  <option value="">Todos</option>
                  {filterSizeOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200">
              <h3 className="text-sm font-bold text-center mb-4 uppercase tracking-wider text-neutral-500">Distribuição por Gênero</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={getGenderData()} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} label>
                      {getGenderData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200">
              <h3 className="text-sm font-bold text-center mb-4 uppercase tracking-wider text-neutral-500">Distribuição por Kit</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={getKitData()} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} label>
                      {getKitData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 md:col-span-2 lg:col-span-1">
              <h3 className="text-sm font-bold text-center mb-4 uppercase tracking-wider text-neutral-500">Distribuição por Tamanho</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getSizeData()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value">
                      {getSizeData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'registrations' && (
        <div className="flex flex-col gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><Users size={20} /> Inscritos ({filteredRegistrations.length})</h3>
              <Button onClick={handleExportExcel} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white h-9 px-4">
                <Download size={16} /> Baixar Relatório
              </Button>
            </div>
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1 flex gap-2">
                <select className="h-10 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2" value={searchField} onChange={e => setSearchField(e.target.value)}>
                  <option value="nome">Nome</option>
                  <option value="cpf">CPF</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">E-mail</option>
                </select>
                <input 
                  type="text" 
                  placeholder="Buscar..." 
                  className="flex-1 h-10 rounded-md border border-neutral-300 px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-neutral-100 text-neutral-600">
                  <tr>
                    <th className="p-3 rounded-tl">Nome</th>
                    <th className="p-3">CPF</th>
                    <th className="p-3">Data de Nasc.</th>
                    <th className="p-3">WhatsApp</th>
                    <th className="p-3">Gênero</th>
                    <th className="p-3">Kit</th>
                    <th className="p-3">Tamanho</th>
                    <th className="p-3 rounded-tr text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRegistrations.map(r => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-neutral-50">
                      <td className="p-3 font-medium">{r.nome} {r.sobrenome} {r.isAdmin && <span className="ml-2 text-xs bg-black text-white px-1 rounded">Admin</span>}</td>
                      <td className="p-3">{r.cpf}</td>
                      <td className="p-3">{r.dataNascimento || '-'}</td>
                      <td className="p-3">{r.whatsapp}</td>
                      <td className="p-3">{r.genero}</td>
                      <td className="p-3">{r.kit}</td>
                      <td className="p-3 font-bold">{r.tshirtSize || '-'}</td>
                      <td className="p-3 text-center flex items-center justify-center gap-2">
                        <button 
                          onClick={() => window.open(`/?cpf=${r.cpf}&admin=true`, '_blank')}
                          className="text-neutral-500 hover:text-neutral-900 transition-colors p-1 rounded hover:bg-neutral-200"
                          title="Editar Cadastro"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteIndividual(r.id!)}
                          className="text-red-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50"
                          title="Excluir Cadastro"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredRegistrations.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-4 text-center text-neutral-500">Nenhum inscrito encontrado com os filtros atuais.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-4 p-4 flex items-center justify-between border-t border-neutral-200">
                <div className="text-sm text-neutral-500 hidden md:block">
                  Mostrando {(currentPage - 1) * itemsPerPage + 1} até {Math.min(currentPage * itemsPerPage, filteredRegistrations.length)} de {filteredRegistrations.length} inscritos
                </div>
                <div className="flex items-center gap-2 mx-auto md:mx-0">
                  <Button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                    disabled={currentPage === 1}
                    className="h-8 px-3 text-xs bg-neutral-100 text-neutral-700 hover:bg-neutral-200 disabled:opacity-50"
                  >
                    Anterior
                  </Button>
                  <span className="text-sm font-medium mx-2">Página {currentPage} de {totalPages}</span>
                  <Button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                    disabled={currentPage === totalPages}
                    className="h-8 px-3 text-xs bg-neutral-100 text-neutral-700 hover:bg-neutral-200 disabled:opacity-50"
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-lg overflow-hidden max-w-3xl w-full flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-neutral-200">
              <h3 className="font-semibold text-lg">Visualização da Imagem</h3>
              <button onClick={() => setPreviewImage(null)} className="text-neutral-500 hover:text-black bg-neutral-100 hover:bg-neutral-200 p-1.5 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 bg-neutral-100 flex items-center justify-center min-h-[200px]">
              <img src={previewImage} alt="Preview" className="max-w-full max-h-[70vh] object-contain rounded" />
            </div>
          </div>
        </div>
      )}

      {/* Delete Individual Modal */}
      {deleteIdConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-2">Excluir Cadastro</h3>
              <p className="text-sm text-neutral-600 mb-6">
                Tem certeza que deseja excluir permanentemente este cadastro? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3 w-full">
                <Button 
                  onClick={() => setDeleteIdConfirm(null)} 
                  className="flex-1 bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50"
                  disabled={isDeleting}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={confirmDeleteIndividual} 
                  className="flex-1 bg-red-600 text-white hover:bg-red-700 border border-red-700"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Excluindo...' : 'Excluir'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-2">Limpar Banco de Dados</h3>
              <p className="text-sm text-neutral-600 mb-6">
                ATENÇÃO: Você está prestes a apagar <strong>TODOS</strong> os cadastros do banco de dados. Esta ação é irreversível e não pode ser desfeita. Tem certeza de que deseja continuar?
              </p>
              
              <div className="flex items-center gap-3 w-full">
                <Button 
                  onClick={() => setShowClearConfirm(false)} 
                  className="flex-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-800"
                  disabled={isClearing}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={confirmClearDatabase} 
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  disabled={isClearing}
                >
                  {isClearing ? 'Apagando...' : 'Sim, Limpar tudo'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
