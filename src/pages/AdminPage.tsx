import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Button, Input } from '../components/ui';
import { AppConfig, Registration, KitOption, ResultItem } from '../types';
import { getConfig, subscribeToConfig, subscribeToRegistrations, updateConfig, clearAllRegistrations, importRegistrations, deleteRegistration, subscribeToResults, importResults, clearAllResults } from '../lib/db';
import { auth, storage } from '../lib/firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Logo } from '../components/Logo';
import { Eye, EyeOff, Image as ImageIcon, Upload, Loader2, X, Link2, Check, BarChart3, Settings, Users, Trash2, Download, Database, FileUp, FileDown, Trash, Edit, Bold, Italic, Trophy } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

import { fixUtf8Mojibake, parseGender } from '../lib/utils';
import { INITIAL_RESULTS_DATA } from '../data/initialResults';
import * as XLSX from 'xlsx';

interface ColumnCheckReport {
  expectedName: string;
  expectedKey: string;
  matchedHeader: string | null;
  found: boolean;
  sampleValue: string;
}

const DOB_ALIASES = [
  'data nascimento', 'datanascimento', 'nascimento', 'data de nascimento',
  'data de nasc', 'data de nasc.', 'data nasc', 'data nasc.', 'dt nasc', 'dt. nasc',
  'dt. nasc.', 'dt_nasc', 'data_nascimento', 'data_nasc', 'dn', 'd.n.', 'd.n',
  'dt.nasc', 'dat.nasc', 'd_nasc', 'd_n', 'birth', 'birthdate', 'dob', 'nasc',
  'dt nascimento', 'dt. nascimento', 'idade', 'age'
];

const CGCP_ALIASES = [
  'c.g.cp', 'cgcp', 'c.g.c.p.', 'c.g.cp.', 'c.g. cp', 'c g cp', 'cg.cp', 'cg cp',
  'c.g./c.p.', 'c.g./c.p', 'c.g. / c.p.', 'c.g. / c.p', 'cg/cp', 'cg / cp',
  'c.g.-c.p.', 'c.g. - c.p.', 'c.g. (cp)', 'c.g. (c.p.)', 'c.g. (c.p)',
  'c.g.', 'cg', 'c.g.c.p', 'c_g_cp', 'cg_cp', 'col. g. cp', 'col. g. cp.', 'col.g.cp',
  'c.g/c.p', 'c.g/c.p.', 'cg.c.p', 'c.g..cp',
  'posicao', 'posição', 'colocacao', 'colocação', 'posicao geral', 'posição geral',
  'pos. geral', 'pos geral', 'col. geral', 'colocacao geral', 'colocação geral',
  'classificacao', 'classificação', 'clas. geral', 'cl. geral', 'pos', 'rank', 'ranking', 'geral',
  'colocacao g.cp', 'colocação g.cp', 'posicao g.cp', 'posição g.cp'
];

const RESULTS_EXPECTED_COLUMNS = [
  { key: 'numero', label: 'número', aliases: ['número', 'numero', 'nÚmero', 'nº', 'numero peito', 'nãºmero', 'nâºmero', 'nÃºmero'] },
  { key: 'participante', label: 'Participante', aliases: ['participante', 'nome', 'atleta'] },
  { key: 'documento', label: 'Documento', aliases: ['documento', 'cpf', 'doc'] },
  { key: 'dataNascimento', label: 'Data nascimento', aliases: DOB_ALIASES },
  { key: 'genero', label: 'Gênero', aliases: ['gênero', 'genero', 'sexo', 'gãªnero', 'gÃªnero'] },
  { key: 'email', label: 'E-mail', aliases: ['e-mail', 'email', 'e_mail'] },
  { key: 'telefone', label: 'Telefone', aliases: ['telefone', 'whatsapp', 'celular', 'fone'] },
  { key: 'modalidade', label: 'Modalidade', aliases: ['modalidade', 'distancia', 'corrida'] },
  { key: 'camiseta', label: 'CAMISETA', aliases: ['camiseta', 'tshirt', 't-shirt', 'tshirtsize'] },
  { key: 'tLiq', label: 'T. Liq.', aliases: ['t. liq.', 't.liq.', 'tempo liquido', 't liq', 'tliq'] },
  { key: 'tBruto', label: 'T. Bruto', aliases: ['t. bruto', 't.bruto', 'tempo bruto', 't bruto', 'tbruto'] },
  { key: 'pace', label: 'Pace', aliases: ['pace', 'ritmo'] },
  { key: 'cgcp', label: 'C.G.CP', aliases: CGCP_ALIASES },
];

function getValueByAliases(row: Record<string, any>, aliases: string[], isDate: boolean = false): string {
  // 1. Exact match on normalized header
  for (const alias of aliases) {
    const normAlias = normalizeHeaderString(alias);
    if (!normAlias) continue;
    for (const key of Object.keys(row)) {
      if (normalizeHeaderString(key) === normAlias) {
        const val = row[key];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return String(val).trim();
        }
      }
    }
  }

  // 2. Partial match on normalized header
  for (const alias of aliases) {
    const normAlias = normalizeHeaderString(alias);
    if (normAlias.length >= 3) {
      for (const key of Object.keys(row)) {
        const normKey = normalizeHeaderString(key);
        if (normKey.length >= 3 && (normKey.includes(normAlias) || normAlias.includes(normKey))) {
          const val = row[key];
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            return String(val).trim();
          }
        }
      }
    }
  }

  // 3. Fallback for dates: scan values in row matching DD/MM/YYYY or YYYY-MM-DD
  if (isDate) {
    for (const key of Object.keys(row)) {
      const val = String(row[key] || '').trim();
      if (val.match(/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/) || val.match(/^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/)) {
        return val;
      }
    }
  }

  return '';
}

const REGISTRATIONS_EXPECTED_COLUMNS = [
  { key: 'cpf', label: 'cpf', aliases: ['cpf', 'documento'] },
  { key: 'nome', label: 'nome', aliases: ['nome', 'participante', 'first_name'] },
  { key: 'sobrenome', label: 'sobrenome', aliases: ['sobrenome', 'last_name'] },
  { key: 'dataNascimento', label: 'dataNascimento', aliases: ['datanascimento', 'data nascimento', 'nascimento'] },
  { key: 'whatsapp', label: 'whatsapp', aliases: ['whatsapp', 'telefone', 'celular'] },
  { key: 'email', label: 'email', aliases: ['email', 'e-mail'] },
  { key: 'cep', label: 'cep', aliases: ['cep'] },
  { key: 'numero', label: 'numero', aliases: ['numero', 'número', 'nãºmero', 'nÃºmero'] },
  { key: 'complemento', label: 'complemento', aliases: ['complemento'] },
  { key: 'cidade', label: 'cidade', aliases: ['cidade'] },
  { key: 'estado', label: 'estado', aliases: ['estado', 'uf'] },
  { key: 'tshirtSize', label: 'tshirtSize', aliases: ['tshirtsize', 'camiseta', 't-shirt'] },
  { key: 'genero', label: 'genero', aliases: ['genero', 'gênero', 'gãªnero', 'gÃªnero', 'sexo'] },
  { key: 'modalidade', label: 'modalidade', aliases: ['modalidade'] },
  { key: 'kit', label: 'kit', aliases: ['kit'] },
];

function normalizeHeaderString(str: string): string {
  const fixed = fixUtf8Mojibake(str);
  return fixed
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function findMatchedHeader(aliases: string[], fileHeaders: string[]): string | null {
  // 1. Exact match pass
  for (const alias of aliases) {
    const normAlias = normalizeHeaderString(alias);
    if (!normAlias) continue;
    for (const h of fileHeaders) {
      const normH = normalizeHeaderString(h);
      if (normH === normAlias) {
        return h;
      }
    }
  }

  // 2. Partial match pass
  for (const alias of aliases) {
    const normAlias = normalizeHeaderString(alias);
    if (normAlias.length < 3) continue;
    for (const h of fileHeaders) {
      const normH = normalizeHeaderString(h);
      if (normH.length >= 3 && (normH.includes(normAlias) || normAlias.includes(normH))) {
        return h;
      }
    }
  }
  return null;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('remember_admin_credentials') !== 'false';
  });
  const [loginEmail, setLoginEmail] = useState(() => {
    return localStorage.getItem('saved_admin_email') || '';
  });
  const [loginPassword, setLoginPassword] = useState(() => {
    return localStorage.getItem('saved_admin_password') || '';
  });
  const [loginConfirmPassword, setLoginConfirmPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [config, setConfig] = useState<AppConfig | null>(null);

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  
  const [editSizes, setEditSizes] = useState<Record<string, number>>({});
  const [newSizeName, setNewSizeName] = useState('');
  const [newSizeQty, setNewSizeQty] = useState('');

  
  const [editKits, setEditKits] = useState<KitOption[]>([]);
  const [newKitName, setNewKitName] = useState('');
  const [newKitUrl, setNewKitUrl] = useState('');
  const [newKitSizeNames, setNewKitSizeNames] = useState<Record<number, string>>({});
  const [newKitSizeQtys, setNewKitSizeQtys] = useState<Record<number, string>>({});

  const [isSignUp, setIsSignUp] = useState(false);
  
  const [uploadingKitImage, setUploadingKitImage] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  
  const [showKitUrlInput, setShowKitUrlInput] = useState(false);
  const [showLogoUrlInput, setShowLogoUrlInput] = useState(false);

  const [activeTab, setActiveTab] = useState<'config' | 'dashboard' | 'registrations' | 'results'>('dashboard');
  const [resultsList, setResultsList] = useState<ResultItem[]>([]);
  const [showClearResultsConfirm, setShowClearResultsConfirm] = useState(false);
  const [isClearingResults, setIsClearingResults] = useState(false);

  // CSV Verification states for Results
  const [showResultsVerifyModal, setShowResultsVerifyModal] = useState(false);
  const [resultsFileName, setResultsFileName] = useState('');
  const [resultsTotalRows, setResultsTotalRows] = useState(0);
  const [resultsColumnReport, setResultsColumnReport] = useState<ColumnCheckReport[]>([]);
  const [pendingResultsData, setPendingResultsData] = useState<Omit<ResultItem, 'id'>[]>([]);
  const [isImportingResults, setIsImportingResults] = useState(false);

  // CSV Verification states for Registrations
  const [showRegVerifyModal, setShowRegVerifyModal] = useState(false);
  const [regFileName, setRegFileName] = useState('');
  const [regTotalRows, setRegTotalRows] = useState(0);
  const [regColumnReport, setRegColumnReport] = useState<ColumnCheckReport[]>([]);
  const [pendingRegData, setPendingRegData] = useState<Omit<Registration, 'id' | 'createdAt'>[]>([]);
  const [isImportingRegs, setIsImportingRegs] = useState(false);
  
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


  // Inactivity timeout logic (15 minutes)
  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout;
    
    const resetTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      if (isAuthenticated) {
        inactivityTimer = setTimeout(() => {
          signOut(auth);
          toast.info('Sessão expirada após 15 minutos de inatividade.');
        }, 15 * 60 * 1000); // 15 minutes
      }
    };

    if (isAuthenticated) {
      resetTimer();
      window.addEventListener('mousemove', resetTimer);
      window.addEventListener('keydown', resetTimer);
      window.addEventListener('click', resetTimer);
      window.addEventListener('scroll', resetTimer);
    }

    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('scroll', resetTimer);
    };
  }, [isAuthenticated]);

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
      
      setEditKits(cfg.kits || []);
      setEditGenders(cfg.genders || []);
      setEditModalities(cfg.modalities || []);
    });
    
    let unsubRegs = () => {};
    let unsubRes = () => {};
    if (isAuthenticated) {
      unsubRegs = subscribeToRegistrations(setRegistrations);
      subscribeToResults((resData) => {
        setResultsList(resData);
      }).then(unsub => { unsubRes = unsub; });
    }
    return () => {
      unsubConfig();
      if (isAuthenticated) {
        unsubRegs();
        if (typeof unsubRes === 'function') unsubRes();
      }
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

      if (rememberMe) {
        localStorage.setItem('saved_admin_email', loginEmail);
        localStorage.setItem('saved_admin_password', loginPassword);
        localStorage.setItem('remember_admin_credentials', 'true');
      } else {
        localStorage.removeItem('saved_admin_email');
        localStorage.removeItem('saved_admin_password');
        localStorage.setItem('remember_admin_credentials', 'false');
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
      genero: 'M',
      modalidade: '5Km',
      pcd: 'Não',
      kit: 'Kit Simples'
    }];
    downloadCSV(templateData, "modelo_importacao.csv");
  };

  // --- VERIFY & IMPORT INSCRIÇÕES CSV ---
  const handleVerifyRegistrationsCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target?.result;
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const headerRows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
        const rawData = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });

        if (rawData.length === 0) {
          toast.error("O arquivo de inscrições está vazio.");
          return;
        }

        const data = rawData.map(row => {
          const cleanRow: Record<string, any> = {};
          Object.keys(row).forEach(k => {
            const cleanKey = fixUtf8Mojibake(String(k || '')).trim().replace(/^\uFEFF/, '');
            cleanRow[cleanKey] = row[k];
          });
          return cleanRow;
        });

        const headerSet = new Set<string>();
        if (headerRows.length > 0 && Array.isArray(headerRows[0])) {
          headerRows[0].forEach(h => {
            if (h !== undefined && h !== null) {
              const cleaned = fixUtf8Mojibake(String(h)).trim().replace(/^\uFEFF/, '');
              if (cleaned) headerSet.add(cleaned);
            }
          });
        }
        data.forEach(row => {
          Object.keys(row).forEach(k => {
            if (k) headerSet.add(k);
          });
        });

        const rawHeaders = Array.from(headerSet);
        const report: ColumnCheckReport[] = REGISTRATIONS_EXPECTED_COLUMNS.map(col => {
          const matchedHeader = findMatchedHeader(col.aliases, rawHeaders);
          const sampleRow = data.find(r => matchedHeader && r[matchedHeader] !== undefined && String(r[matchedHeader]).trim() !== '');
          const sampleVal = sampleRow && matchedHeader
            ? fixUtf8Mojibake(String(sampleRow[matchedHeader]).trim())
            : (data[0] && matchedHeader ? fixUtf8Mojibake(String(data[0][matchedHeader] || '')) : '');

          return {
            expectedName: col.label,
            expectedKey: col.key,
            matchedHeader,
            found: !!matchedHeader,
            sampleValue: sampleVal
          };
        });

        const formattedData = data.map(row => {
          const rawGen = row.genero || row['Gênero'] || row['GÃªnero'] || row.Genero || row.sexo || row.Sexo || '';
          return {
            cpf: fixUtf8Mojibake(row.cpf || row.CPF || row.Documento || row.documento || ''),
            nome: fixUtf8Mojibake(row.nome || row.Nome || row.Participante || row.participante || ''),
            sobrenome: fixUtf8Mojibake(row.sobrenome || row.Sobrenome || ''),
            dataNascimento: fixUtf8Mojibake(row.dataNascimento || row['Data Nascimento'] || row['Data nascimento'] || ''),
            whatsapp: fixUtf8Mojibake(row.whatsapp || row.WhatsApp || row.Telefone || row.telefone || ''),
            email: fixUtf8Mojibake(row.email || row.Email || row['E-mail'] || ''),
            cep: fixUtf8Mojibake(row.cep || row.CEP || ''),
            endereco: '',
            numero: fixUtf8Mojibake(row.numero || row.Número || row.Numero || ''),
            complemento: fixUtf8Mojibake(row.complemento || row.Complemento || ''),
            bairro: '',
            cidade: fixUtf8Mojibake(row.cidade || row.Cidade || ''),
            estado: fixUtf8Mojibake(row.estado || row.Estado || ''),
            tshirtSize: fixUtf8Mojibake(row.tshirtSize || row.CAMISETA || row.Camiseta || ''),
            genero: parseGender(rawGen),
            modalidade: fixUtf8Mojibake(row.modalidade || row.Modalidade || ''),
            pcd: '',
            kit: fixUtf8Mojibake(row.kit || row.Kit || ''),
            isAdmin: false
          };
        }).filter(r => r.cpf || r.nome);

        if (formattedData.length === 0) {
          toast.error("Nenhum registro válido de inscrição encontrado. Verifique os cabeçalhos.");
          return;
        }

        setRegFileName(file.name);
        setRegTotalRows(data.length);
        setRegColumnReport(report);
        setPendingRegData(formattedData);
        setShowRegVerifyModal(true);
      } catch (error) {
        console.error("Erro ao ler o arquivo CSV de inscrições:", error);
        toast.error("Erro ao ler o arquivo CSV de inscrições.");
      }

      e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmRegistrationsImport = async () => {
    setIsImportingRegs(true);
    const result = await importRegistrations(pendingRegData);
    setIsImportingRegs(false);
    setShowRegVerifyModal(false);

    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const handleDownloadResultsTemplate = () => {
    const templateData = [{
      'número': '5001',
      'Participante': 'João da Silva',
      'Documento': '000.000.000-00',
      'Data nascimento': '01/01/1990',
      'Gênero': 'M - Masculino',
      'E-mail': 'joao@email.com',
      'Telefone': '(11) 99999-9999',
      'Modalidade': '5Km',
      'CAMISETA': 'M',
      'T. Liq.': '00:22:15',
      'T. Bruto': '00:22:20',
      'Pace': '00:04:27',
      'C.G.CP': '1'
    }];
    downloadCSV(templateData, "modelo_resultados.csv");
  };

  // --- VERIFY & IMPORT RESULTADOS CSV ---
  const handleVerifyResultsCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target?.result;
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const headerRows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
        const rawData = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });

        if (rawData.length === 0) {
          toast.error("O arquivo de resultados está vazio.");
          return;
        }

        const data = rawData.map(row => {
          const cleanRow: Record<string, any> = {};
          Object.keys(row).forEach(k => {
            const cleanKey = fixUtf8Mojibake(String(k || '')).trim().replace(/^\uFEFF/, '');
            cleanRow[cleanKey] = row[k];
          });
          return cleanRow;
        });

        // Collect all header names present in the file
        const headerSet = new Set<string>();
        if (headerRows.length > 0 && Array.isArray(headerRows[0])) {
          headerRows[0].forEach(h => {
            if (h !== undefined && h !== null) {
              const cleaned = fixUtf8Mojibake(String(h)).trim().replace(/^\uFEFF/, '');
              if (cleaned) headerSet.add(cleaned);
            }
          });
        }
        data.forEach(row => {
          Object.keys(row).forEach(k => {
            if (k) headerSet.add(k);
          });
        });

        const rawHeaders = Array.from(headerSet);
        const report: ColumnCheckReport[] = RESULTS_EXPECTED_COLUMNS.map(col => {
          const matchedHeader = findMatchedHeader(col.aliases, rawHeaders);
          // Search all rows for a non-empty sample value if row 0 has empty value
          const sampleRow = data.find(r => matchedHeader && r[matchedHeader] !== undefined && String(r[matchedHeader]).trim() !== '');
          const sampleVal = sampleRow && matchedHeader
            ? fixUtf8Mojibake(String(sampleRow[matchedHeader]).trim())
            : (data[0] && matchedHeader ? fixUtf8Mojibake(String(data[0][matchedHeader] || '')) : '');

          return {
            expectedName: col.label,
            expectedKey: col.key,
            matchedHeader,
            found: !!matchedHeader,
            sampleValue: sampleVal
          };
        });

        const formattedResults: Omit<ResultItem, 'id'>[] = data.map(row => {
          const rawGen = getValueByAliases(row, ['gênero', 'genero', 'sexo', 'gãªnero', 'gÃªnero']);
          let rawDob = getValueByAliases(row, DOB_ALIASES, true);

          const num = fixUtf8Mojibake(getValueByAliases(row, ['número', 'numero', 'nÚmero', 'nº', 'numero peito', 'nãºmero', 'nâºmero', 'nÃºmero']));
          const doc = fixUtf8Mojibake(getValueByAliases(row, ['documento', 'cpf', 'doc']));
          const name = fixUtf8Mojibake(getValueByAliases(row, ['participante', 'nome', 'atleta']));

          // Check live registrations first if rawDob is empty
          if (!rawDob) {
            const cleanDoc = doc ? doc.replace(/\D/g, '') : '';
            const cleanName = name ? name.toLowerCase().trim() : '';
            const foundReg = registrations.find(r =>
              (num && String(r.numero).trim() === num.trim()) ||
              (cleanDoc && r.cpf && r.cpf.replace(/\D/g, '') === cleanDoc) ||
              (cleanName && `${r.nome || ''} ${r.sobrenome || ''}`.trim().toLowerCase() === cleanName) ||
              (cleanName && r.nome && r.nome.trim().toLowerCase() === cleanName)
            );
            if (foundReg?.dataNascimento) {
              rawDob = foundReg.dataNascimento;
            }
          }

          // Fallback to static initial dataset
          if (!rawDob) {
            const foundInit = INITIAL_RESULTS_DATA.find(i =>
              (num && i.numero === num) ||
              (doc && i.documento && i.documento.replace(/\D/g, '') === doc.replace(/\D/g, '')) ||
              (name && i.participante.toLowerCase().trim() === name.toLowerCase().trim())
            );
            if (foundInit?.dataNascimento) {
              rawDob = foundInit.dataNascimento;
            }
          }

          return {
            numero: num,
            participante: name,
            documento: doc,
            dataNascimento: fixUtf8Mojibake(rawDob),
            genero: parseGender(rawGen),
            email: fixUtf8Mojibake(getValueByAliases(row, ['e-mail', 'email', 'e_mail'])),
            telefone: fixUtf8Mojibake(getValueByAliases(row, ['telefone', 'whatsapp', 'celular', 'fone'])),
            endereco: '',
            modalidade: fixUtf8Mojibake(getValueByAliases(row, ['modalidade', 'distancia', 'corrida'])),
            etinia: '',
            bairro: '',
            pcd: '',
            camiseta: fixUtf8Mojibake(getValueByAliases(row, ['camiseta', 'tshirt', 't-shirt', 'tshirtsize'])),
            tLiq: fixUtf8Mojibake(getValueByAliases(row, ['t. liq.', 't.liq.', 'tempo liquido', 't liq', 'tliq']) || '00:00:00'),
            tBruto: fixUtf8Mojibake(getValueByAliases(row, ['t. bruto', 't.bruto', 'tempo bruto', 't bruto', 'tbruto']) || '00:00:00'),
            pace: fixUtf8Mojibake(getValueByAliases(row, ['pace', 'ritmo']) || '00:00:00'),
            cgcp: fixUtf8Mojibake(getValueByAliases(row, CGCP_ALIASES))
          };
        }).filter(r => r.participante || r.numero);

        if (formattedResults.length === 0) {
          toast.error("Nenhum resultado válido encontrado. Verifique os cabeçalhos.");
          return;
        }

        setResultsFileName(file.name);
        setResultsTotalRows(data.length);
        setResultsColumnReport(report);
        setPendingResultsData(formattedResults);
        setShowResultsVerifyModal(true);
      } catch (error) {
        console.error("Erro ao importar resultados CSV:", error);
        toast.error("Erro ao ler o arquivo CSV de resultados.");
      }

      e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmResultsImport = async () => {
    setIsImportingResults(true);
    const result = await importResults(pendingResultsData);
    setIsImportingResults(false);
    setShowResultsVerifyModal(false);

    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const confirmClearResults = async () => {
    setIsClearingResults(true);
    const result = await clearAllResults();
    setIsClearingResults(false);
    setShowClearResultsConfirm(false);

    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
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
      await updateConfig({ ...config, tshirtSizes: editSizes, kits: editKits, genders: editGenders, modalities: editModalities });
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

  
  const handleTopBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'image/jpeg' && file.type !== 'image/png' && file.type !== 'image/webp') {
      toast.error('O banner deve ser uma imagem JPEG, PNG ou WEBP.');
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem do banner não pode ser maior que 2MB.');
      return;
    }

    setUploadingLogo(true);
    try {
      const storageRef = ref(storage, `banners/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setConfig({ ...config, topBannerUrl: url });
      toast.success('Banner do topo carregado com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao fazer upload do banner: ' + error.message);
    } finally {
      setUploadingLogo(false);
      if (e.target) {
        e.target.value = '';
      }
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
              <label className="block text-sm font-medium mb-1">E-mail / Usuário</label>
              <Input
                type="email"
                name="email"
                id="admin-login-email"
                autoComplete="username"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Senha</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  id="admin-login-password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  className="pr-10"
                  placeholder="Sua senha"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm py-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-neutral-700 font-medium">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => {
                    const isChecked = e.target.checked;
                    setRememberMe(isChecked);
                    if (!isChecked) {
                      localStorage.removeItem('saved_admin_email');
                      localStorage.removeItem('saved_admin_password');
                      localStorage.setItem('remember_admin_credentials', 'false');
                    } else {
                      localStorage.setItem('remember_admin_credentials', 'true');
                    }
                  }}
                  className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 w-4 h-4 cursor-pointer"
                />
                <span>Lembrar e preencher usuário e senha automaticamente</span>
              </label>
            </div>
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium mb-1">Confirmar Senha</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="confirm-password"
                    id="admin-login-confirm-password"
                    autoComplete="new-password"
                    value={loginConfirmPassword}
                    onChange={e => setLoginConfirmPassword(e.target.value)}
                    className="pr-10"
                    placeholder="Confirme sua senha"
                  />
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
    const sizeOrder = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XGG', 'XXG', 'XXXG'];
    return Object.entries(data).sort((a,b)=>{
      const iA = sizeOrder.indexOf(a[0].toUpperCase());
      const iB = sizeOrder.indexOf(b[0].toUpperCase());
      if(iA !== -1 && iB !== -1) return iA - iB;
      if(iA !== -1) return -1;
      if(iB !== -1) return 1;
      return a[0].localeCompare(b[0]);
    }).map(([name, value]) => ({ name, value }));
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
  const filterSizeOptions = Array.from(allSizes).sort((a,b)=>{
    const o=['PP','P','M','G','GG','XG','XGG','XXG','XXXG'];
    const iA=o.indexOf(a.toUpperCase()),iB=o.indexOf(b.toUpperCase());
    return iA!==-1&&iB!==-1?iA-iB:iA!==-1?-1:iB!==-1?1:a.localeCompare(b);
  });

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
          onClick={() => setActiveTab('results')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md font-medium text-sm whitespace-nowrap transition-colors ${activeTab === 'results' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
        >
          <Trophy size={18} /> Importar & Resultados
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
              <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 flex flex-col gap-6">
                <h3 className="text-lg font-bold border-b pb-2">Configurações Gerais</h3>
                
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium block text-sm">Status das inscrições</span>
                      <span className="text-xs text-neutral-500">Ative ou desative o recebimento de novas inscrições.</span>
                    </div>
                    <button 
                      onClick={() => setConfig({ ...config, isActive: !config.isActive })}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${config.isActive ? 'bg-green-500' : 'bg-neutral-300'}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${config.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
                    <div>
                      <span className="font-medium block text-sm">Permitir novos administradores</span>
                      <span className="text-xs text-neutral-500">Permite que outras pessoas criem contas de administrador.</span>
                    </div>
                    <button 
                      onClick={() => setConfig({ ...config, allowAdminRegistration: config.allowAdminRegistration === false ? true : false })}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${config.allowAdminRegistration !== false ? 'bg-green-500' : 'bg-neutral-300'}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${config.allowAdminRegistration !== false ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-neutral-100 pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium block text-sm">Cálculo de vagas</span>
                        <span className="text-xs text-neutral-500">Definir vagas pela soma das opções de tamanho (Automático).</span>
                      </div>
                      <button 
                        onClick={() => setConfig({ ...config, isAutoMax: !config.isAutoMax })}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${config.isAutoMax ? 'bg-green-500' : 'bg-neutral-300'}`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${config.isAutoMax ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                    {!config.isAutoMax && (
                      <div className="pl-4 border-l-2 border-neutral-200 ml-1 mt-2">
                        <label className="block text-sm text-neutral-700 mb-1">Limite manual de inscritos</label>
                        <Input 
                          type="number" 
                          value={config.maxRegistrations || 0} 
                          onChange={(e) => setConfig({ ...config, maxRegistrations: parseInt(e.target.value, 10) || 0 })}
                          className="w-32"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
                    <div>
                      <span className="font-medium block text-sm">Campo PCD</span>
                      <span className="text-xs text-neutral-500">Habilita a pergunta sobre deficiência no formulário.</span>
                    </div>
                    <button 
                      onClick={() => setConfig({ ...config, enablePCD: !config.enablePCD })}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${config.enablePCD ? 'bg-green-500' : 'bg-neutral-300'}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${config.enablePCD ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 border-t border-neutral-100 pt-4">
                    <label className="block text-sm font-medium">Link do WhatsApp</label>
                    <Input 
                      type="url" 
                      value={config.whatsappGroupUrl || ''} 
                      placeholder="https://chat.whatsapp.com/..."
                      onChange={(e) => setConfig({ ...config, whatsappGroupUrl: e.target.value })}
                    />
                    <p className="text-xs text-neutral-500">
                      Opcional. Os inscritos serão redirecionados para este link ao concluir.
                    </p>
                  </div>
                </div>
              </div>

              {/* Personalização Visual */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 flex flex-col gap-4">
                <h3 className="text-lg font-bold border-b pb-2">Personalização Visual</h3>
                
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-sm block">Exibir Título no formulário</span>
                      <span className="text-xs text-neutral-500">Mostra o título e subtítulo no cabeçalho.</span>
                    </div>
                    <button 
                      onClick={() => setConfig({ ...config, showHeader: config.showHeader === false ? true : false })}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${config.showHeader !== false ? 'bg-green-500' : 'bg-neutral-300'}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${config.showHeader !== false ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  <p className="text-xs text-neutral-500">
                    Se desativado, o título no topo da página de cadastro será ocultado. O banner de imagem possui sua própria configuração separada abaixo.
                  </p>

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

                      
                      {/* Top Banner Settings */}
                      <div className="mt-6 pt-4 border-t border-neutral-200">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <label className="block text-sm font-medium">Banner do Topo da Página</label>
                          </div>
                          <button 
                            type="button"
                            onClick={() => setConfig({ ...config, topBannerEnabled: !config.topBannerEnabled })}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${config.topBannerEnabled ? 'bg-green-500' : 'bg-neutral-300'}`}
                          >
                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${config.topBannerEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                          </button>
                        </div>
                        <p className="text-xs text-neutral-500 mb-4">
                          Proporção ideal recomendada: 3:1 ou superior (ex: 1200x400 pixels). 
                          A imagem se adaptará automaticamente de forma responsiva ao tamanho da tela.
                        </p>
                        
                        <div className="flex flex-col gap-4 bg-neutral-50 p-4 rounded border border-neutral-200">
                            <div className="flex flex-col gap-2">
                              <label className="text-xs font-medium text-neutral-700">Imagem do Banner</label>
                              <div className="flex items-center gap-2">
                                {config.topBannerUrl && (
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-16 h-10 rounded border border-neutral-200 overflow-hidden flex items-center justify-center bg-white flex-shrink-0 cursor-pointer"
                                      onClick={() => setPreviewImage(config.topBannerUrl!)}
                                      title="Ver imagem"
                                    >
                                      <img src={config.topBannerUrl} alt="Banner" className={`w-full h-full ${config.topBannerFit === 'contain' ? 'object-contain bg-transparent' : 'object-cover'}`} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                                    </div>
                                    <Button 
                                      type="button" 
                                      onClick={() => setConfig({ ...config, topBannerUrl: '' })} 
                                      className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 p-2 h-10 w-10 flex-shrink-0"
                                      title="Remover banner"
                                    >
                                      <Trash2 size={18} />
                                    </Button>
                                  </div>
                                )}
                                <div className="flex-1 flex items-center gap-2">
                                  {showLogoUrlInput ? (
                                    <div className="flex-1 flex items-center gap-2">
                                      <Input 
                                        type="text" 
                                        value={config.topBannerUrl || ''} 
                                        placeholder="https://exemplo.com/banner.png"
                                        onChange={(e) => setConfig({ ...config, topBannerUrl: e.target.value })}
                                        className="flex-1 text-sm bg-white"
                                      />
                                      <Button type="button" onClick={() => setShowLogoUrlInput(false)} className="bg-green-600 hover:bg-green-700 px-3 h-10">
                                        <Check size={18} />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex-1 flex items-center gap-2">
                                      <button type="button" onClick={() => setShowLogoUrlInput(true)} className="w-10 h-10 rounded-md hover:bg-neutral-100 border border-neutral-200 flex items-center justify-center bg-white transition-colors" title="Inserir URL da imagem">
                                        <Link2 className="text-neutral-500" size={18} />
                                      </button>
                                      <input
                                        type="file"
                                        id="top-banner-upload"
                                        accept="image/jpeg, image/png, image/webp"
                                        className="hidden"
                                        onChange={handleTopBannerUpload}
                                        disabled={uploadingLogo}
                                      />
                                      <label htmlFor="top-banner-upload" className="cursor-pointer w-10 h-10 rounded-md hover:bg-neutral-100 border border-neutral-200 flex items-center justify-center bg-white transition-colors" title="Fazer upload de banner">
                                        {uploadingLogo ? <Loader2 className="animate-spin text-neutral-500" size={18} /> : <Upload className="text-neutral-500" size={18} />}
                                      </label>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                              <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-neutral-700">Ajuste da Imagem</label>
                                <select 
                                  className="flex h-9 w-full rounded-md border border-neutral-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                                  value={config.topBannerFit || 'cover'}
                                  onChange={(e) => setConfig({ ...config, topBannerFit: e.target.value as any })}
                                >
                                  <option value="cover">Preencher todo o espaço (Cortar bordas se necessário)</option>
                                  <option value="contain">Conter imagem (Ajustar automaticamente, sem cortes)</option>
                                </select>
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-neutral-700">Alinhamento Horizontal (se aplicável)</label>
                                <select 
                                  className="flex h-9 w-full rounded-md border border-neutral-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                                  value={config.topBannerPosition || 'center'}
                                  onChange={(e) => setConfig({ ...config, topBannerPosition: e.target.value as any })}
                                >
                                  <option value="left">Esquerda</option>
                                  <option value="center">Centro</option>
                                  <option value="right">Direita</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        
                      </div>
                    </div>
                  
                </div>
              </div>

              {/* Opções de Gênero */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 flex flex-col gap-4">
                <h3 className="text-lg font-bold border-b pb-2">Opções de Gênero</h3>
                <div className="flex flex-col gap-2">
                  {editGenders.map(g => (
                    <div key={g} className="flex items-center gap-2">
                      <div className="flex-1">{g}</div>
                      <button type="button" onClick={() => handleRemoveGender(g)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 h-auto rounded-full bg-transparent transition-colors" title="Remover"><Trash2 size={18} /></button>
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
                      <div className="flex-1">{m}</div>
                      <button type="button" onClick={() => handleRemoveModality(m)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 h-auto rounded-full bg-transparent transition-colors" title="Remover"><Trash2 size={18} /></button>
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
                          <span className="text-lg">{kit.name}</span>
                        </div>
                        <button type="button" onClick={() => handleRemoveKit(idx)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 h-auto rounded-full bg-transparent transition-colors" title="Remover Kit"><Trash2 size={20} /></button>
                      </div>
                      
                      {/* T-Shirt Config for this Kit */}
                      <div className="bg-neutral-50 p-4 rounded-md border border-neutral-200">
                        <h4 className="text-sm font-bold text-neutral-700 mb-3">Tamanhos e Estoque deste Kit</h4>
                        <div className="flex flex-col gap-2">
                          {Object.entries(kit.tshirtSizes || {}).sort((a,b)=>{
                            const o=['PP','P','M','G','GG','XG','XGG','XXG','XXXG'];
                            const iA=o.indexOf(a[0].toUpperCase()),iB=o.indexOf(b[0].toUpperCase());
                            return iA!==-1&&iB!==-1?iA-iB:iA!==-1?-1:iB!==-1?1:a[0].localeCompare(b[0]);
                          }).map(([size, qty]) => (
                            <div key={size} className="flex items-center gap-2">
                              <div className="w-16 text-sm">{size}</div>
                              <Input 
                                type="number" 
                                value={qty || 0} 
                                className="w-24 h-8 text-sm"
                                onChange={(e) => handleUpdateKitSizeQty(idx, size, parseInt(e.target.value, 10) || 0)}
                              />
                              <button type="button" onClick={() => handleRemoveKitSize(idx, size)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 h-auto rounded-full bg-transparent transition-colors" title="Remover"><Trash2 size={16} /></button>
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
                  {Object.entries(editSizes).sort((a,b)=>{
                    const o=['PP','P','M','G','GG','XG','XGG','XXG','XXXG'];
                    const iA=o.indexOf(a[0].toUpperCase()),iB=o.indexOf(b[0].toUpperCase());
                    return iA!==-1&&iB!==-1?iA-iB:iA!==-1?-1:iB!==-1?1:a[0].localeCompare(b[0]);
                  }).map(([size, qty]) => (
                    <div key={size} className="flex items-center gap-2">
                      <div className="w-16">{size}</div>
                      <Input 
                        type="number" 
                        value={qty || 0} 
                        className="w-24"
                        onChange={(e) => setEditSizes({ ...editSizes, [size]: parseInt(e.target.value, 10) || 0 })}
                      />
                      <button type="button" onClick={() => handleRemoveSize(size)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 h-auto rounded-full bg-transparent transition-colors" title="Remover"><Trash2 size={18} /></button>
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
                      <input type="file" accept=".csv" className="hidden" onChange={handleVerifyRegistrationsCSV} />
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

      {activeTab === 'results' && (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <div>
                <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                  <Trophy className="text-amber-500" size={20} />
                  Gestão & Importação de Resultados (Ranking)
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Importe os dados oficiais da corrida em formato CSV com os tempos dos participantes.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => navigate('/resultados')}
                  className="bg-amber-500 text-neutral-950 font-bold hover:bg-amber-400 text-xs"
                >
                  Ver Página /resultados
                </Button>
              </div>
            </div>

            {/* CSV Import Tools */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 flex flex-col gap-3 justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-neutral-800 flex items-center gap-2">
                    <FileUp size={16} className="text-amber-600" />
                    Importar Resultados CSV
                  </h4>
                  <p className="text-xs text-neutral-500 mt-1">
                    Selecione o arquivo CSV com a lista de tempos e resultados.
                  </p>
                </div>
                <label className="cursor-pointer inline-flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white font-medium py-2 px-4 rounded-md text-xs transition-colors">
                  <Upload size={14} />
                  <span>Escolher Arquivo CSV</span>
                  <input
                    type="file"
                    accept=".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={handleVerifyResultsCSV}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 flex flex-col gap-3 justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-neutral-800 flex items-center gap-2">
                    <FileDown size={16} className="text-blue-600" />
                    Baixar Modelo CSV
                  </h4>
                  <p className="text-xs text-neutral-500 mt-1">
                    Baixe o modelo com o cabeçalho correto de colunas de resultados.
                  </p>
                </div>
                <button
                  onClick={handleDownloadResultsTemplate}
                  className="inline-flex items-center justify-center gap-2 bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-300 font-medium py-2 px-4 rounded-md text-xs transition-colors"
                >
                  <Download size={14} />
                  <span>Baixar Modelo CSV</span>
                </button>
              </div>

              <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 flex flex-col gap-3 justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-red-800 flex items-center gap-2">
                    <Trash2 size={16} className="text-red-600" />
                    Limpar Resultados
                  </h4>
                  <p className="text-xs text-neutral-500 mt-1">
                    Apaga todos os registros de resultados importados.
                  </p>
                </div>
                <button
                  onClick={() => setShowClearResultsConfirm(true)}
                  className="inline-flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-medium py-2 px-4 rounded-md text-xs transition-colors"
                >
                  <Trash size={14} />
                  <span>Limpar Resultados</span>
                </button>
              </div>
            </div>

            {/* Expected CSV Header Reference */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
              <strong>Colunas CSV aceitas:</strong> <code className="bg-white px-1.5 py-0.5 rounded border border-amber-300 font-mono text-[11px]">número, Participante, Documento, Data nascimento, Gênero, E-mail, Telefone, Endereço, Modalidade, ETINIA, Informe seu bairro/região:, PCD?, CAMISETA, T. Liq., T. Bruto, Pace, C.G.CP</code>
            </div>

            {/* Current Results List Summary */}
            <div className="border border-neutral-200 rounded-lg overflow-hidden">
              <div className="p-3 bg-neutral-100 border-b border-neutral-200 flex items-center justify-between text-xs font-semibold text-neutral-700">
                <span>Resultados Cadastrados no Firestore ({resultsList.length})</span>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {resultsList.length === 0 ? (
                  <div className="p-6 text-center text-xs text-neutral-500">
                    Nenhum resultado importado via CSV no Firestore ainda. A página <code>/resultados</code> está exibindo a lista inicial. Use a opção "Escolher Arquivo CSV" para atualizar.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-bold">
                        <th className="p-2.5">Nº</th>
                        <th className="p-2.5">Participante</th>
                        <th className="p-2.5">Documento</th>
                        <th className="p-2.5">Modalidade</th>
                        <th className="p-2.5">Gênero</th>
                        <th className="p-2.5">T. Liq.</th>
                        <th className="p-2.5">Pace</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {resultsList.map((res, i) => (
                        <tr key={res.id || i} className="hover:bg-neutral-50">
                          <td className="p-2.5 font-bold font-mono text-amber-700">#{res.numero}</td>
                          <td className="p-2.5 font-medium">{res.participante}</td>
                          <td className="p-2.5 text-neutral-500">{res.documento}</td>
                          <td className="p-2.5">{res.modalidade}</td>
                          <td className="p-2.5">{res.genero}</td>
                          <td className="p-2.5 font-mono font-bold text-neutral-900">{res.tLiq}</td>
                          <td className="p-2.5 font-mono text-neutral-600">{res.pace}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
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
      {/* Confirmation Modal for Results Clear */}
      {showClearResultsConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-2">Limpar Resultados</h3>
              <p className="text-sm text-neutral-600 mb-6">
                ATENÇÃO: Você está prestes a apagar <strong>TODOS OS RESULTADOS</strong> da corrida salvos no banco de dados. Esta ação é irreversível.
              </p>
              
              <div className="flex items-center gap-3 w-full">
                <Button 
                  onClick={() => setShowClearResultsConfirm(false)} 
                  className="flex-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-800"
                  disabled={isClearingResults}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={confirmClearResults} 
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  disabled={isClearingResults}
                >
                  {isClearingResults ? 'Apagando...' : 'Apagar Resultados'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verification Modal for Results CSV */}
      {showResultsVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-neutral-200 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-neutral-900 text-white flex items-center justify-between border-b border-neutral-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Conferência de Colunas - Resultados CSV</h3>
                  <p className="text-xs text-neutral-400">Verificação prévia das colunas do arquivo antes da importação</p>
                </div>
              </div>
              <button 
                onClick={() => setShowResultsVerifyModal(false)}
                className="text-neutral-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-neutral-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-neutral-800">
              {/* Stat Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-neutral-50 border border-neutral-200 p-3 rounded-lg">
                  <span className="text-xs text-neutral-500 font-medium block">Arquivo Lido</span>
                  <span className="text-sm font-bold text-neutral-900 truncate block" title={resultsFileName}>{resultsFileName}</span>
                </div>
                <div className="bg-neutral-50 border border-neutral-200 p-3 rounded-lg">
                  <span className="text-xs text-neutral-500 font-medium block">Linhas / Registros</span>
                  <span className="text-sm font-bold text-neutral-900 block">{resultsTotalRows} linhas ({pendingResultsData.length} válidos)</span>
                </div>
                <div className={`border p-3 rounded-lg ${
                  resultsColumnReport.filter(r => r.found).length === resultsColumnReport.length 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}>
                  <span className="text-xs font-medium block opacity-80">Conferência das Colunas</span>
                  <span className="text-sm font-bold block">
                    {resultsColumnReport.filter(r => r.found).length} de {resultsColumnReport.length} colunas encontradas
                  </span>
                </div>
              </div>

              {/* Column Verification Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Status da Verificação de Colunas (Separadas por vírgula / ponto e vírgula)
                  </h4>
                  <span className="text-xs text-neutral-500">
                    {resultsColumnReport.filter(r => r.found).length === resultsColumnReport.length 
                      ? '✓ Todas as colunas foram conferidas com sucesso' 
                      : '⚠ Algumas colunas não foram encontradas no CSV'}
                  </span>
                </div>

                <div className="border border-neutral-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto bg-white text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-neutral-100 sticky top-0 border-b border-neutral-200 font-bold text-neutral-700">
                      <tr>
                        <th className="p-2.5">Coluna Oficial Esperada</th>
                        <th className="p-2.5">Cabeçalho Encontrado no CSV</th>
                        <th className="p-2.5">Exemplo Extraído (Linha 1)</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 font-mono">
                      {resultsColumnReport.map((col, idx) => (
                        <tr key={idx} className={col.found ? 'hover:bg-neutral-50' : 'bg-amber-50/40 hover:bg-amber-50'}>
                          <td className="p-2.5 font-bold text-neutral-900">{col.expectedName}</td>
                          <td className="p-2.5">
                            {col.matchedHeader ? (
                              <span className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-300 text-neutral-800">
                                {col.matchedHeader}
                              </span>
                            ) : (
                              <span className="text-neutral-400 italic">--- Ausente ---</span>
                            )}
                          </td>
                          <td className="p-2.5 text-neutral-600 truncate max-w-[200px]" title={col.sampleValue || '(vazio)'}>
                            {col.sampleValue || <span className="text-neutral-300 italic">(vazio)</span>}
                          </td>
                          <td className="p-2.5 text-center font-sans font-semibold">
                            {col.found ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <Check size={12} /> Conferida
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-amber-100 text-amber-800 border border-amber-200">
                                ! Ausente
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Data Sample Preview */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-neutral-900">
                  Pré-visualização dos Registros (Primeiros 5 resultados)
                </h4>
                <div className="border border-neutral-200 rounded-lg overflow-x-auto bg-white text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-neutral-100 border-b border-neutral-200 font-bold text-neutral-700">
                      <tr>
                        <th className="p-2">Nº</th>
                        <th className="p-2">Participante</th>
                        <th className="p-2">Documento</th>
                        <th className="p-2">Modalidade</th>
                        <th className="p-2">Gênero</th>
                        <th className="p-2">T. Liq.</th>
                        <th className="p-2">Pace</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 font-mono">
                      {pendingResultsData.slice(0, 5).map((item, i) => (
                        <tr key={i} className="hover:bg-neutral-50">
                          <td className="p-2 font-bold text-amber-700">#{item.numero}</td>
                          <td className="p-2 font-sans font-semibold text-neutral-900">{item.participante}</td>
                          <td className="p-2 text-neutral-500">{item.documento || '-'}</td>
                          <td className="p-2 font-sans">{item.modalidade || '-'}</td>
                          <td className="p-2 font-sans">{item.genero || '-'}</td>
                          <td className="p-2 font-bold text-neutral-900">{item.tLiq}</td>
                          <td className="p-2 text-neutral-600">{item.pace}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-neutral-100 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-neutral-600">
                Verificação de colunas concluída. Clique no botão ao lado para confirmar e realizar a importação.
              </span>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button 
                  onClick={() => setShowResultsVerifyModal(false)}
                  className="w-full sm:w-auto bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50"
                  disabled={isImportingResults}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleConfirmResultsImport}
                  className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-2.5 shadow-md flex items-center justify-center gap-2"
                  disabled={isImportingResults}
                >
                  {isImportingResults ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Importando Resultados...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      <span>Confirmar e Importar Resultados ({pendingResultsData.length} registros)</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verification Modal for Registrations CSV */}
      {showRegVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-neutral-200 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-neutral-900 text-white flex items-center justify-between border-b border-neutral-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <FileUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Conferência de Colunas - Inscrições CSV</h3>
                  <p className="text-xs text-neutral-400">Verificação prévia das colunas do arquivo antes da importação</p>
                </div>
              </div>
              <button 
                onClick={() => setShowRegVerifyModal(false)}
                className="text-neutral-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-neutral-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-neutral-800">
              {/* Stat Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-neutral-50 border border-neutral-200 p-3 rounded-lg">
                  <span className="text-xs text-neutral-500 font-medium block">Arquivo Lido</span>
                  <span className="text-sm font-bold text-neutral-900 truncate block" title={regFileName}>{regFileName}</span>
                </div>
                <div className="bg-neutral-50 border border-neutral-200 p-3 rounded-lg">
                  <span className="text-xs text-neutral-500 font-medium block">Linhas / Registros</span>
                  <span className="text-sm font-bold text-neutral-900 block">{regTotalRows} linhas ({pendingRegData.length} válidos)</span>
                </div>
                <div className={`border p-3 rounded-lg ${
                  regColumnReport.filter(r => r.found).length === regColumnReport.length 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}>
                  <span className="text-xs font-medium block opacity-80">Conferência das Colunas</span>
                  <span className="text-sm font-bold block">
                    {regColumnReport.filter(r => r.found).length} de {regColumnReport.length} colunas encontradas
                  </span>
                </div>
              </div>

              {/* Column Verification Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Status da Verificação de Colunas (Separadas por vírgula / ponto e vírgula)
                  </h4>
                  <span className="text-xs text-neutral-500">
                    {regColumnReport.filter(r => r.found).length === regColumnReport.length 
                      ? '✓ Todas as colunas foram conferidas com sucesso' 
                      : '⚠ Algumas colunas não foram encontradas no CSV'}
                  </span>
                </div>

                <div className="border border-neutral-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto bg-white text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-neutral-100 sticky top-0 border-b border-neutral-200 font-bold text-neutral-700">
                      <tr>
                        <th className="p-2.5">Coluna Oficial Esperada</th>
                        <th className="p-2.5">Cabeçalho Encontrado no CSV</th>
                        <th className="p-2.5">Exemplo Extraído (Linha 1)</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 font-mono">
                      {regColumnReport.map((col, idx) => (
                        <tr key={idx} className={col.found ? 'hover:bg-neutral-50' : 'bg-amber-50/40 hover:bg-amber-50'}>
                          <td className="p-2.5 font-bold text-neutral-900">{col.expectedName}</td>
                          <td className="p-2.5">
                            {col.matchedHeader ? (
                              <span className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-300 text-neutral-800">
                                {col.matchedHeader}
                              </span>
                            ) : (
                              <span className="text-neutral-400 italic">--- Ausente ---</span>
                            )}
                          </td>
                          <td className="p-2.5 text-neutral-600 truncate max-w-[200px]" title={col.sampleValue || '(vazio)'}>
                            {col.sampleValue || <span className="text-neutral-300 italic">(vazio)</span>}
                          </td>
                          <td className="p-2.5 text-center font-sans font-semibold">
                            {col.found ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <Check size={12} /> Conferida
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-amber-100 text-amber-800 border border-amber-200">
                                ! Ausente
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Data Sample Preview */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-neutral-900">
                  Pré-visualização dos Registros (Primeiras 5 inscrições)
                </h4>
                <div className="border border-neutral-200 rounded-lg overflow-x-auto bg-white text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-neutral-100 border-b border-neutral-200 font-bold text-neutral-700">
                      <tr>
                        <th className="p-2">Nome</th>
                        <th className="p-2">CPF</th>
                        <th className="p-2">Data Nasc.</th>
                        <th className="p-2">Gênero</th>
                        <th className="p-2">Modalidade</th>
                        <th className="p-2">Camiseta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 font-mono">
                      {pendingRegData.slice(0, 5).map((item, i) => (
                        <tr key={i} className="hover:bg-neutral-50">
                          <td className="p-2 font-sans font-semibold text-neutral-900">{item.nome} {item.sobrenome}</td>
                          <td className="p-2 text-neutral-500">{item.cpf || '-'}</td>
                          <td className="p-2 font-sans">{item.dataNascimento || '-'}</td>
                          <td className="p-2 font-sans">{item.genero || '-'}</td>
                          <td className="p-2 font-sans">{item.modalidade || '-'}</td>
                          <td className="p-2 font-sans font-bold">{item.tshirtSize || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-neutral-100 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-neutral-600">
                Verificação de colunas concluída. Clique no botão ao lado para confirmar e realizar a importação.
              </span>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button 
                  onClick={() => setShowRegVerifyModal(false)}
                  className="w-full sm:w-auto bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50"
                  disabled={isImportingRegs}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleConfirmRegistrationsImport}
                  className="w-full sm:w-auto bg-neutral-900 hover:bg-neutral-800 text-white font-bold px-6 py-2.5 shadow-md flex items-center justify-center gap-2"
                  disabled={isImportingRegs}
                >
                  {isImportingRegs ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Importando Inscrições...</span>
                    </>
                  ) : (
                    <>
                      <FileUp size={16} />
                      <span>Confirmar e Importar Inscrições ({pendingRegData.length} registros)</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

