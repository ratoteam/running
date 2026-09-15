import React, { useState, useEffect, useMemo } from 'react';
import { subscribeToResults, getConfig, subscribeToConfig, subscribeToRegistrations } from '../lib/db';
import { ResultItem, AppConfig, Registration } from '../types';
import { INITIAL_RESULTS_DATA } from '../data/initialResults';
import { Search, Trophy, Medal, Filter, RefreshCw, UserCheck, Timer, Zap, ShieldAlert, Award, ChevronDown } from 'lucide-react';
import { maskDocument, parseGender, getAge, getAgeCategory } from '../lib/utils';
import { CertificateModal } from '../components/CertificateModal';

// Convert "HH:MM:SS" or "MM:SS" to total seconds for proper numerical sorting
function timeToSeconds(timeStr?: string): number {
  if (!timeStr || timeStr === '00:00:00' || timeStr.trim() === '') return Infinity;
  const parts = timeStr.trim().split(':');
  if (parts.length === 3) {
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    const s = parseInt(parts[2], 10) || 0;
    return h * 3600 + m * 60 + s;
  }
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10) || 0;
    const s = parseInt(parts[1], 10) || 0;
    return m * 60 + s;
  }
  return Infinity;
}

export const ResultsPage: React.FC = () => {
  const [results, setResults] = useState<ResultItem[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // State for opening certificate modal
  const [selectedCertificate, setSelectedCertificate] = useState<{ item: ResultItem; position: number | string; genderPosition?: number | string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<string>('todos');
  const [categoryFilter, setCategoryFilter] = useState<string>('todos');
  const [modalityFilter, setModalityFilter] = useState<string>('todos');
  const [showOnlyFinished, setShowOnlyFinished] = useState<boolean>(true);

  // Map of birth dates from static initial results dataset
  const initialBirthDateMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const item of INITIAL_RESULTS_DATA) {
      if (item.dataNascimento && item.dataNascimento.trim()) {
        if (item.numero) map[`num_${item.numero.trim()}`] = item.dataNascimento.trim();
        if (item.documento) map[`doc_${item.documento.replace(/\D/g, '')}`] = item.dataNascimento.trim();
        if (item.participante) map[`name_${item.participante.trim().toLowerCase()}`] = item.dataNascimento.trim();
      }
    }
    return map;
  }, []);

  // Map of birth dates from live Registrations collection
  const regBirthDateMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const reg of registrations) {
      if (reg.dataNascimento && reg.dataNascimento.trim()) {
        const dob = reg.dataNascimento.trim();
        if (reg.numero) map[`num_${String(reg.numero).trim()}`] = dob;
        if (reg.cpf) {
          const docDigits = reg.cpf.replace(/\D/g, '');
          if (docDigits) map[`doc_${docDigits}`] = dob;
        }
        const fullName = `${reg.nome || ''} ${reg.sobrenome || ''}`.trim().toLowerCase();
        if (fullName) map[`name_${fullName}`] = dob;
        if (reg.nome) map[`name_${reg.nome.trim().toLowerCase()}`] = dob;
      }
    }
    return map;
  }, [registrations]);

  // Helper to reliably get a runner's birth date (using fallback to live registrations or initial results if item.dataNascimento is empty)
  const getItemBirthDate = (item: ResultItem): string => {
    if (item.dataNascimento && item.dataNascimento.trim() !== '') {
      return item.dataNascimento.trim();
    }
    if (item.numero && regBirthDateMap[`num_${item.numero.trim()}`]) {
      return regBirthDateMap[`num_${item.numero.trim()}`];
    }
    if (item.numero && initialBirthDateMap[`num_${item.numero.trim()}`]) {
      return initialBirthDateMap[`num_${item.numero.trim()}`];
    }
    if (item.documento) {
      const docDigits = item.documento.replace(/\D/g, '');
      if (docDigits && regBirthDateMap[`doc_${docDigits}`]) {
        return regBirthDateMap[`doc_${docDigits}`];
      }
      if (docDigits && initialBirthDateMap[`doc_${docDigits}`]) {
        return initialBirthDateMap[`doc_${docDigits}`];
      }
    }
    if (item.participante) {
      const nameKey = item.participante.trim().toLowerCase();
      if (regBirthDateMap[`name_${nameKey}`]) {
        return regBirthDateMap[`name_${nameKey}`];
      }
      if (initialBirthDateMap[`name_${nameKey}`]) {
        return initialBirthDateMap[`name_${nameKey}`];
      }
    }
    return '';
  };

  // Helper to get age category for any item, ensuring it ALWAYS returns an age category (never "Geral Masculino" or "Geral Feminino")
  const getItemCategoryByAge = (item: ResultItem, dob: string): string => {
    const age = getAge(dob);
    const ageCat = getAgeCategory(age);
    if (ageCat !== 'Indefinido') {
      return ageCat;
    }
    
    // If item.categoria itself specifies a category range
    const rawCat = (item.categoria || '').trim();
    if (rawCat && !rawCat.toLowerCase().includes('geral') && rawCat !== 'Indefinido') {
      if (/sub\s*-?\s*20|1[0-9]/i.test(rawCat)) return 'Sub-20 (Até 19 anos)';
      if (/20\s*(a|-)\s*29/i.test(rawCat)) return '20 a 29 anos';
      if (/30\s*(a|-)\s*39/i.test(rawCat)) return '30 a 39 anos';
      if (/40\s*(a|-)\s*49/i.test(rawCat)) return '40 a 49 anos';
      if (/50\s*(a|-)\s*59/i.test(rawCat)) return '50 a 59 anos';
      if (/60/i.test(rawCat)) return '60+ anos';
      return rawCat;
    }

    // Default age category fallback when birth date is unparsed/missing
    return '30 a 39 anos';
  };

  // Map of qualification rank numbers by gender
  const genderRankMap = useMemo(() => {
    const map = new Map<string, number>();
    const counters: Record<string, number> = {};

    const validList = [...results]
      .filter(r => timeToSeconds(r.tLiq) !== Infinity)
      .sort((a, b) => timeToSeconds(a.tLiq) - timeToSeconds(b.tLiq));

    validList.forEach((r) => {
      const gen = parseGender(r.genero);
      counters[gen] = (counters[gen] || 0) + 1;
      const key = r.id || (r.numero ? `num_${r.numero}` : '') || (r.documento ? `doc_${r.documento}` : '') || r.participante;
      if (key) {
        map.set(key, counters[gen]);
      }
    });

    return map;
  }, [results]);

  // Map of overall general qualification rank numbers across all runners (unfiltered)
  const overallRankMap = useMemo(() => {
    const map = new Map<string, number>();

    const validList = [...results]
      .filter(r => timeToSeconds(r.tLiq) !== Infinity)
      .sort((a, b) => timeToSeconds(a.tLiq) - timeToSeconds(b.tLiq));

    validList.forEach((r, idx) => {
      const key = r.id || (r.numero ? `num_${r.numero}` : '') || (r.documento ? `doc_${r.documento}` : '') || r.participante;
      if (key) {
        map.set(key, idx + 1);
      }
    });

    return map;
  }, [results]);

  useEffect(() => {
    getConfig().then(c => setConfig(c));
    const unsubConfig = subscribeToConfig(c => setConfig(c));

    let unsubReg: (() => void) | null = null;
    try {
      unsubReg = subscribeToRegistrations(regs => setRegistrations(regs));
    } catch (e) {
      console.warn("Registrations subscription error: ", e);
    }

    let unsubRes: (() => void) | null = null;
    subscribeToResults((data) => {
      if (data && data.length > 0) {
        setResults(data);
      } else {
        // Fallback to static initial dataset if Firestore has no entries yet
        setResults(INITIAL_RESULTS_DATA);
      }
      setLoading(false);
    }).then(unsub => {
      unsubRes = unsub;
    });

    return () => {
      unsubConfig();
      if (unsubReg) unsubReg();
      if (unsubRes) unsubRes();
    };
  }, []);


  // Compute available options
  const modalities = useMemo(() => {
    const set = new Set<string>();
    results.forEach(r => { if (r.modalidade) set.add(r.modalidade); });
    return Array.from(set);
  }, [results]);

  // Sort & Filter
  const sortedAndFiltered = useMemo(() => {
    // 1. Separate valid finished times vs unclassified
    let filtered = results.filter(item => {
      // Search filter (Name, Number, CPF/Document)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const qDigits = q.replace(/\D/g, '');
        const matchName = item.participante.toLowerCase().includes(q);
        const matchNum = item.numero.toLowerCase().includes(q);
        const docLower = item.documento ? item.documento.toLowerCase() : '';
        const docDigits = item.documento ? item.documento.replace(/\D/g, '') : '';
        const matchDoc = docLower.includes(q) || (qDigits.length > 2 && docDigits.includes(qDigits));
        if (!matchName && !matchNum && !matchDoc) return false;
      }

      // Gender filter
      if (genderFilter !== 'todos') {
        const itemGen = parseGender(item.genero);
        if (itemGen !== genderFilter) {
          return false;
        }
      }

      // Modality filter
      if (modalityFilter !== 'todos') {
        if (item.modalidade !== modalityFilter) return false;
      }

      // Age category / Display category filter
      if (categoryFilter !== 'todos') {
        const dob = getItemBirthDate(item);
        const displayCategory = getItemCategoryByAge(item, dob);
        if (displayCategory !== categoryFilter) return false;
      }

      // Finished time filter
      const secs = timeToSeconds(item.tLiq);
      if (showOnlyFinished && secs === Infinity) {
        return false;
      }

      return true;
    });

    // 2. Sort by T. Liq ascending
    filtered.sort((a, b) => {
      const secA = timeToSeconds(a.tLiq);
      const secB = timeToSeconds(b.tLiq);
      if (secA === secB) {
        return (a.participante || '').localeCompare(b.participante || '');
      }
      return secA - secB;
    });

    return filtered;
  }, [results, searchQuery, genderFilter, categoryFilter, modalityFilter, showOnlyFinished, initialBirthDateMap, regBirthDateMap]);

  // Overall winner and metrics per gender
  const stats = useMemo(() => {
    const validRunners = results.filter(r => timeToSeconds(r.tLiq) !== Infinity);
    const sortedAllValid = [...validRunners].sort((a, b) => timeToSeconds(a.tLiq) - timeToSeconds(b.tLiq));
    
    const maleWinner = sortedAllValid.find(r => parseGender(r.genero) === 'M');
    const femaleWinner = sortedAllValid.find(r => parseGender(r.genero) === 'F');

    return {
      total: results.length,
      finishedCount: validRunners.length,
      maleWinnerName: maleWinner ? maleWinner.participante : '-',
      maleWinnerNumber: maleWinner?.numero ? `#${maleWinner.numero}` : '',
      maleWinnerTime: maleWinner ? maleWinner.tLiq : '-',
      maleWinnerPace: maleWinner?.pace ? `${maleWinner.pace} /km` : '',
      femaleWinnerName: femaleWinner ? femaleWinner.participante : '-',
      femaleWinnerNumber: femaleWinner?.numero ? `#${femaleWinner.numero}` : '',
      femaleWinnerTime: femaleWinner ? femaleWinner.tLiq : '-',
      femaleWinnerPace: femaleWinner?.pace ? `${femaleWinner.pace} /km` : '',
    };
  }, [results]);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans">
      {/* Header Banner */}
      {config?.showHeader && (
        <header className="border-b border-neutral-200 bg-white/90 backdrop-blur-md sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-3">
              {config.topBannerUrl ? (
                <img
                  src={config.topBannerUrl}
                  alt="Logo Evento"
                  className="h-10 w-auto object-contain rounded"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <Trophy className="w-6 h-6" />
                </div>
              )}
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
                  {config.pageTitle || 'Classificação & Resultados'}
                </h1>
                <p className="text-xs sm:text-sm text-neutral-500">
                  {config.pageSubtitle || 'Ranking Oficial por Tempo Líquido'}
                </p>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Title Banner & Metrics */}
        <section className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 opacity-5 pointer-events-none">
            <Trophy className="w-96 h-96 text-amber-600" />
          </div>

          <div className="relative z-10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <span className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 mb-3">
                  <Medal className="w-3.5 h-3.5 text-amber-600" />
                  <span>Ranking Geral e por Categoria</span>
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight">
                  Resultados Oficiais
                </h2>
                <p className="text-neutral-600 mt-1 max-w-2xl text-sm sm:text-base">
                  Classificação por tempo líquido, com filtros rápidos por gênero, faixa etária e busca direta por número de peito ou nome.
                </p>
              </div>

              <div className="flex items-center space-x-2 bg-neutral-50 border border-neutral-200 px-4 py-2.5 rounded-xl text-xs text-neutral-600">
                <Timer className="w-4 h-4 text-amber-600" />
                <span>Ordenado por <strong>Tempo Líquido (T. Liq.)</strong></span>
              </div>
            </div>

            {/* Quick Stat Cards: Total & Top Performers by Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-neutral-200">
              {/* Card 1: Total & Concluíram */}
              <div className="bg-neutral-50 border border-neutral-200 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Total de Atletas</div>
                  <div className="text-2xl font-extrabold text-neutral-900 mt-1">{stats.total}</div>
                </div>
                <div className="text-xs text-neutral-500 mt-2 border-t border-neutral-200/60 pt-2 flex items-center justify-between">
                  <span>Concluíram (com tempo):</span>
                  <strong className="text-amber-700 font-bold">{stats.finishedCount}</strong>
                </div>
              </div>

              {/* Card 2: 1º Colocado Masculino */}
              <div className="bg-blue-50/60 border border-blue-200/80 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-900 flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5 text-blue-600" />
                      1º Colocado
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                      MASCULINO
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="text-sm font-bold text-neutral-900 truncate" title={stats.maleWinnerName}>
                      {stats.maleWinnerName}
                    </div>
                    {stats.maleWinnerNumber && (
                      <div className="text-xs font-medium text-neutral-500 mt-0.5">
                        {stats.maleWinnerNumber}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 border-t border-blue-200/60 pt-2 flex items-center justify-between">
                  <span className="text-xs text-blue-950 font-medium">Tempo Líquido:</span>
                  <strong className="text-base font-extrabold text-blue-700">{stats.maleWinnerTime}</strong>
                </div>
              </div>

              {/* Card 3: 1ª Colocada Feminina */}
              <div className="bg-rose-50/60 border border-rose-200/80 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-rose-900 flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5 text-rose-600" />
                      1ª Colocada
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                      FEMININO
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="text-sm font-bold text-neutral-900 truncate" title={stats.femaleWinnerName}>
                      {stats.femaleWinnerName}
                    </div>
                    {stats.femaleWinnerNumber && (
                      <div className="text-xs font-medium text-neutral-500 mt-0.5">
                        {stats.femaleWinnerNumber}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 border-t border-rose-200/60 pt-2 flex items-center justify-between">
                  <span className="text-xs text-rose-950 font-medium">Tempo Líquido:</span>
                  <strong className="text-base font-extrabold text-rose-700">{stats.femaleWinnerTime}</strong>
                </div>
              </div>

              {/* Card 4: Melhor Tempo Geral */}
              <div className="bg-emerald-50/60 border border-emerald-200/80 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-emerald-900 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-emerald-600" />
                    Pace Médio Geral
                  </div>
                  <div className="text-xs text-emerald-800 mt-2">
                    {stats.maleWinnerPace ? `M: ${stats.maleWinnerPace}` : ''}
                    {stats.femaleWinnerPace ? ` | F: ${stats.femaleWinnerPace}` : ''}
                    {!stats.maleWinnerPace && !stats.femaleWinnerPace && '-'}
                  </div>
                </div>
                <div className="mt-3 border-t border-emerald-200/60 pt-2 flex items-center justify-between text-xs text-emerald-900">
                  <span>Modalidade principal:</span>
                  <strong className="font-bold">5 KM</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Filters Section */}
        <section className="bg-white border border-neutral-200 rounded-2xl p-5 md:p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
            <div className="flex items-center space-x-2 text-neutral-900 font-semibold text-sm">
              <Filter className="w-4 h-4 text-amber-600" />
              <span>Filtros e Busca</span>
            </div>

            <span className="text-xs text-neutral-500">
              Exibindo <strong>{sortedAndFiltered.length}</strong> de <strong>{results.length}</strong> registros
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Search Input */}
            <div className="md:col-span-5 relative">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Buscar por participante, nº de peito ou CPF..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-300 rounded-xl pl-11 pr-4 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:bg-white transition-all"
              />
            </div>

            {/* Gender Filter */}
            <div className="md:col-span-2">
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:bg-white transition-all"
              >
                <option value="todos">Todos Gêneros</option>
                <option value="M">M (Masculino)</option>
                <option value="F">F (Feminino)</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="md:col-span-3">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:bg-white transition-all"
              >
                <option value="todos">Todas as Faixas Etárias</option>
                <option value="Sub-20 (Até 19 anos)">Sub-20 (Até 19 anos)</option>
                <option value="20 a 29 anos">20 a 29 anos</option>
                <option value="30 a 39 anos">30 a 39 anos</option>
                <option value="40 a 49 anos">40 a 49 anos</option>
                <option value="50 a 59 anos">50 a 59 anos</option>
                <option value="60+ anos">60+ anos</option>
              </select>
            </div>

            {/* Modality Filter */}
            {modalities.length > 1 && (
              <div className="md:col-span-2">
                <select
                  value={modalityFilter}
                  onChange={(e) => setModalityFilter(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:bg-white transition-all"
                >
                  <option value="todos">Todas Modalidades</option>
                  {modalities.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Additional Quick Toggles */}
          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs">
            <label className="flex items-center space-x-2 text-neutral-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showOnlyFinished}
                onChange={(e) => setShowOnlyFinished(e.target.checked)}
                className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
              <span>Mostrar apenas atletas com tempo computado</span>
            </label>

            {(searchQuery || genderFilter !== 'todos' || categoryFilter !== 'todos' || modalityFilter !== 'todos' || !showOnlyFinished) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setGenderFilter('todos');
                  setCategoryFilter('todos');
                  setModalityFilter('todos');
                  setShowOnlyFinished(true);
                }}
                className="text-amber-700 hover:text-amber-800 underline font-medium"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </section>

        {/* Results Table / Cards */}
        <section className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mx-auto" />
              <p className="text-sm text-neutral-500">Carregando classificação...</p>
            </div>
          ) : sortedAndFiltered.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <ShieldAlert className="w-10 h-10 text-neutral-400 mx-auto" />
              <p className="text-base font-semibold text-neutral-800">Nenhum resultado encontrado</p>
              <p className="text-xs text-neutral-500">Tente ajustar a busca ou os filtros acima.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-100 text-xs font-bold uppercase tracking-wider text-neutral-700">
                    <th className="py-4 px-4 sm:px-6 text-center w-16">Pos</th>
                    <th className="py-4 px-3 w-16">Nº</th>
                    <th className="py-4 px-4">Participante</th>
                    <th className="py-4 px-3">Gênero</th>
                    <th className="py-4 px-3">Categoria</th>
                    <th className="py-4 px-4 text-amber-700">T. Líquido</th>
                    <th className="py-4 px-4">T. Bruto</th>
                    <th className="py-4 px-4">Pace</th>
                    <th className="py-4 px-4 text-center">Certificado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-sm">
                  {sortedAndFiltered.map((item, index) => {
                    const hasValidTime = timeToSeconds(item.tLiq) !== Infinity;
                    const pos = hasValidTime ? index + 1 : '-';
                    const itemKey = item.id || item.numero || String(index);

                    // Podium styling
                    let posBadge = null;
                    if (pos === 1) {
                      posBadge = (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 text-white font-black text-sm shadow">
                          1º
                        </span>
                      );
                    } else if (pos === 2) {
                      posBadge = (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-400 text-white font-black text-sm shadow">
                          2º
                        </span>
                      );
                    } else if (pos === 3) {
                      posBadge = (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-700 text-white font-black text-sm shadow">
                          3º
                        </span>
                      );
                    } else {
                      posBadge = (
                        <span className="text-neutral-500 font-bold text-xs">
                          {pos !== '-' ? `${pos}º` : '-'}
                        </span>
                      );
                    }

                    const dob = getItemBirthDate(item);
                    const displayCategory = getItemCategoryByAge(item, dob);
                    const overallPos = overallRankMap.get(itemKey);
                    const displayOverallPos = overallPos ? `${overallPos}º` : (pos !== '-' ? `${pos}º` : '-');

                    return (
                      <tr
                        key={itemKey}
                        className={`hover:bg-neutral-50 transition-colors ${
                          pos === 1 ? 'bg-amber-50/70' : pos === 2 ? 'bg-slate-100/70' : pos === 3 ? 'bg-amber-100/40' : ''
                        }`}
                      >
                        {/* Position */}
                        <td className="py-4 px-4 sm:px-6 text-center">
                          {posBadge}
                        </td>

                        {/* Number */}
                        <td className="py-4 px-3 font-mono font-bold text-amber-700 text-sm">
                          #{item.numero}
                        </td>

                        {/* Runner Info */}
                        <td className="py-4 px-4">
                          <div className="font-semibold text-neutral-900 text-sm sm:text-base">
                            {item.participante}
                          </div>
                          <div className="text-xs text-neutral-500 flex flex-col gap-1 mt-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {item.documento && (
                                <span className="inline-flex items-center gap-1 font-mono text-xs text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200 select-none">
                                  CPF: {maskDocument(item.documento)}
                                </span>
                              )}
                              {item.modalidade && (
                                <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 font-medium border border-neutral-200">
                                  {item.modalidade}
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold border border-amber-300 text-xs">
                                C.G.CP: {item.cgcp || displayOverallPos}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Gender */}
                        <td className="py-4 px-3 text-neutral-700 text-xs sm:text-sm font-medium">
                          {parseGender(item.genero)}
                        </td>

                        {/* Category */}
                        <td className="py-4 px-3 text-xs text-neutral-700 font-medium">
                          {displayCategory}
                        </td>

                        {/* Net Time (T. Liq) */}
                        <td className="py-4 px-4 font-mono font-extrabold text-neutral-900 text-base">
                          {hasValidTime ? item.tLiq : <span className="text-neutral-400 text-xs italic">Sem tempo</span>}
                        </td>

                        {/* Gross Time */}
                        <td className="py-4 px-4 font-mono text-neutral-700 text-sm">
                          {item.tBruto || '-'}
                        </td>

                        {/* Pace */}
                        <td className="py-4 px-4 font-mono text-xs text-neutral-500">
                          {item.pace ? `${item.pace} /km` : '-'}
                        </td>

                        {/* Certificate Button */}
                        <td className="py-4 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const gPos = genderRankMap.get(itemKey) || '-';
                              const oPos = overallPos || pos;
                              setSelectedCertificate({ item, position: oPos, genderPosition: gPos });
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-neutral-950 transition-all shadow-sm hover:shadow active:scale-95"
                            title="Gerar e baixar Certificado de Conclusão"
                          >
                            <Award className="w-3.5 h-3.5 text-neutral-950" />
                            <span>Certificado</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Certificate Modal */}
      {selectedCertificate && (
        <CertificateModal
          isOpen={!!selectedCertificate}
          onClose={() => setSelectedCertificate(null)}
          item={selectedCertificate.item}
          position={selectedCertificate.position}
          genderPosition={selectedCertificate.genderPosition}
          config={config}
        />
      )}
    </div>
  );
};
