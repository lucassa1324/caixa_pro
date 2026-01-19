'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  PlusCircle, 
  BarChart3, 
  Settings2, 
  Check, 
  AlertCircle, 
  DollarSign, 
  CreditCard, 
  QrCode,
  ArrowDownCircle,
  ArrowUpCircle,
  History,
  Store,
  Plus,
  Trash2,
  Pencil,
  X,
  Search,
  ChevronDown
} from 'lucide-react';

// import { readEstablishmentConfig, saveEstablishmentConfig, deleteEstablishmentConfig, EstablishmentConfig as ExcelEstablishmentConfig } from '../lib/excel';

interface Establishment {
  id: string;
  name: string;
  fileName: string;
  enabledMethods: string[]; // Ex: ['Dinheiro', 'Pix', 'Crédito', 'Débito']
}

export default function Home() {
  // Navigation State
  const [activeTab, setActiveTab] = useState('saidas'); // 'saidas', 'baixas', 'relatorios', 'configuracoes'

  // Filter State for Baixas
  const [filterStatus, setFilterStatus] = useState('Todos'); // 'Todos', 'Pendente', 'Pago'
  const [filterType, setFilterType] = useState('Todos'); // 'Todos', 'Venda', 'Gasto', 'Outro'

  // Establishments State
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [activeEstablishmentId, setActiveEstablishmentId] = useState<string | null>(null);
  
  // Lista global de métodos disponíveis
  const ALL_PAYMENT_METHODS = ['Dinheiro', 'Pix', 'Crédito', 'Débito'];
  
  // Form for new establishment
  const [newEstName, setNewEstName] = useState('');
  const [newEstFileName, setNewEstFileName] = useState('');
  const [newEstMethods, setNewEstMethods] = useState<string[]>(ALL_PAYMENT_METHODS);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Global Config State
  const [basePath, setBasePath] = useState('');

  // Form State
  const [input, setInput] = useState('');
  const [type, setType] = useState('Venda');
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
  const [cardBrand, setCardBrand] = useState('Visa');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // Reports State
  const [reports, setReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  const [paymentFilter, setPaymentFilter] = useState('Todos');
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'oldest', 'value_asc', 'value_desc'
  const [searchValue, setSearchValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Edit Sale State
  const [editingSale, setEditingSale] = useState<any>(null);
  const [editValue, setEditValue] = useState('');

  // Load data from localStorage on mount
  useEffect(() => {
    const loadEstablishmentsAndConfigs = async () => {
      const saved = localStorage.getItem('establishments');
      const activeId = localStorage.getItem('active_establishment_id');
      const savedBasePath = localStorage.getItem('base_path');
      
      if (savedBasePath) {
        setBasePath(savedBasePath);
      }

      let loadedEstablishments: Establishment[] = [];

      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Migração: Se houver dados antigos com sheetId mas sem fileName ou enabledMethods
          const migrated = parsed.map((est: any) => ({
            ...est,
            fileName: est.fileName || est.sheetId || 'vendas_sem_nome',
            enabledMethods: est.enabledMethods || ALL_PAYMENT_METHODS // Fallback para ALL_PAYMENT_METHODS
          }));
          
          // Para cada estabelecimento, tenta ler o config.json
          const establishmentsWithConfigs = await Promise.all(migrated.map(async (est: Establishment) => {
            try {
              const response = await fetch(`/api/config/read?companyFileName=${est.fileName}`);
              if (response.ok) {
                const config = await response.json();
                return { ...est, enabledMethods: config.enabledMethods };
              } else {
                console.warn(`Não foi possível ler config.json para ${est.fileName} via API, usando dados do localStorage. Status: ${response.status}`);
              }
            } catch (e) {
              console.warn(`Erro ao buscar config.json para ${est.fileName} via API, usando dados do localStorage.`, e);
            }
            return est; // Usa os dados do localStorage/migrados se não houver config.json ou erro
          }));

          loadedEstablishments = establishmentsWithConfigs;
          
          setEstablishments(loadedEstablishments);
          
          if (activeId && loadedEstablishments.find((e: Establishment) => e.id === activeId)) {
            setActiveEstablishmentId(activeId);
          } else if (loadedEstablishments.length > 0) {
            setActiveEstablishmentId(loadedEstablishments[0].id);
          }
        } catch (e) {
          console.error('Erro ao carregar dados do localStorage ou configs:', e);
        }
      }
    };

    loadEstablishmentsAndConfigs();
  }, []);

  const activeEstablishment = establishments.find(e => e.id === activeEstablishmentId);

  const fetchReports = async (fileName?: string, month?: string) => {
    const targetFileName = fileName || activeEstablishment?.fileName;
    const targetMonth = month || selectedMonth;

    if (!targetFileName) return;
    setLoadingReports(true);
    setReports([]); // Limpa dados anteriores para evitar confusão visual
    
    try {
      const response = await fetch(`/api/reports?spreadsheetId=${targetFileName}&month=${targetMonth}`);
      const data = await response.json();
      if (response.ok) {
        // Sanitizar e ordenar os dados
        const sanitizedData = (data.data || []).map((item: any) => {
          let valorNumerico = 0;
          if (typeof item.Valor === 'number') {
            valorNumerico = item.Valor;
          } else if (typeof item.Valor === 'string') {
            // Remove R$, espaços e trata formatos brasileiros e americanos
            let cleanValue = item.Valor
              .replace('R$', '')
              .replace(/\s/g, '');
            
            // Se tiver vírgula e ponto, remove o ponto (milhar) e troca vírgula por ponto (decimal)
            if (cleanValue.includes(',') && cleanValue.includes('.')) {
              cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
            } 
            // Se tiver apenas vírgula, troca por ponto
            else if (cleanValue.includes(',')) {
              cleanValue = cleanValue.replace(',', '.');
            }
            
            valorNumerico = parseFloat(cleanValue) || 0;
          }
          
          return {
            ...item,
            Valor: valorNumerico
          };
        });

        setReports(sanitizedData);
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  // Busca relatórios quando a aba, o estabelecimento ou o mês mudar
  useEffect(() => {
    if (activeTab === 'baixas') {
      setFilterStatus('Pendente');
      setFilterType('Venda');
      setPaymentFilter('Todos');
      setSearchValue('');
      setCurrentPage(1);
    } else if (activeTab === 'relatorios') {
      setFilterStatus('Todos');
      setFilterType('Todos');
      setPaymentFilter('Todos');
      setSearchValue('');
      setCurrentPage(1);
    }
    
    if ((activeTab === 'relatorios' || activeTab === 'baixas') && activeEstablishment?.fileName) {
      fetchReports(activeEstablishment.fileName, selectedMonth);
    }
  }, [activeTab, activeEstablishmentId, selectedMonth, activeEstablishment?.fileName]);

  const addEstablishment = async () => {
    if (!newEstName?.trim()) return;
    
    // O ID/Nome da pasta será baseado no nome do estabelecimento
    const fileName = newEstName.trim().replace(/[^a-zA-Z0-9.\-_]/g, '_');
    
    let updatedEstablishments: Establishment[];
    let currentEst: Establishment | undefined;

    if (editingId) {
      // Find the establishment to update
      const existingEstIndex = establishments.findIndex(est => est.id === editingId);
      if (existingEstIndex > -1) {
        currentEst = {
          ...establishments[existingEstIndex],
          name: newEstName.trim(),
          fileName,
          enabledMethods: newEstMethods
        };
        updatedEstablishments = [
          ...establishments.slice(0, existingEstIndex),
          currentEst,
          ...establishments.slice(existingEstIndex + 1)
        ];
        setMessage({ text: 'Estabelecimento atualizado!', type: 'success' });
        setEditingId(null);
      } else {
        console.error("Editing ID not found:", editingId);
        setMessage({ text: 'Erro: Estabelecimento a ser atualizado não encontrado.', type: 'error' });
        return;
      }
    } else {
      // Add new
      currentEst = {
        id: Date.now().toString(),
        name: newEstName.trim(),
        fileName,
        enabledMethods: newEstMethods
      };

      updatedEstablishments = [...establishments, currentEst];
      
      if (!activeEstablishmentId) {
        setActiveEstablishmentId(currentEst.id);
        localStorage.setItem('active_establishment_id', currentEst.id);
      }
      setMessage({ text: 'Estabelecimento adicionado!', type: 'success' });
    }

    setEstablishments(updatedEstablishments);
    localStorage.setItem('establishments', JSON.stringify(updatedEstablishments));
    
    // Salva a configuração no arquivo config.json
    if (currentEst) {
      try {
        await fetch('/api/config/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: currentEst.id,
            name: currentEst.name,
            fileName: currentEst.fileName,
            enabledMethods: currentEst.enabledMethods
          })
        });
      } catch (error) {
        console.error('Erro ao salvar config.json:', error);
        setMessage({ text: `Erro ao salvar configuração do estabelecimento: ${error instanceof Error ? error.message : String(error)}`, type: 'error' });
      }
    }
    setNewEstName('');
    setNewEstFileName('');
    setNewEstMethods(ALL_PAYMENT_METHODS);
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const startEditing = (est: Establishment) => {
    setEditingId(est.id);
    setNewEstName(est.name);
    setNewEstFileName(est.fileName);
    setNewEstMethods(est.enabledMethods || ALL_PAYMENT_METHODS);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setNewEstName('');
    setNewEstFileName('');
    setNewEstMethods(ALL_PAYMENT_METHODS);
  };

  const removeEstablishment = async (id: string) => {
    const estToRemove = establishments.find(e => e.id === id);
    if (!estToRemove) return;

    if (!confirm(`Tem certeza que deseja remover o estabelecimento "${estToRemove.name}"? Isso também excluirá suas configurações.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/config/delete?companyFileName=${estToRemove.fileName}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete config');
      }
      setMessage({ text: 'Configuração do estabelecimento excluída!', type: 'success' });
    } catch (error) {
      console.error('Erro ao deletar config.json:', error);
      setMessage({ text: `Erro ao deletar configuração do estabelecimento: ${error instanceof Error ? error.message : String(error)}`, type: 'error' });
      // Decide if you want to stop here or proceed with local removal even if config file deletion fails
      // For now, we'll proceed with local removal
    }

    const updated = establishments.filter(e => e.id !== id);
    setEstablishments(updated);
    localStorage.setItem('establishments', JSON.stringify(updated));
    
    if (activeEstablishmentId === id) {
      const nextId = updated.length > 0 ? updated[0].id : null;
      setActiveEstablishmentId(nextId);
      if (nextId) localStorage.setItem('active_establishment_id', nextId);
      else localStorage.removeItem('active_establishment_id');
    }
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const selectEstablishment = (id: string) => {
    setActiveEstablishmentId(id);
    localStorage.setItem('active_establishment_id', id);
    
    // Reset payment method if it's not enabled for the new establishment
    const selectedEst = establishments.find(e => e.id === id);
    if (selectedEst?.enabledMethods && !selectedEst.enabledMethods.includes(paymentMethod)) {
      setPaymentMethod(selectedEst.enabledMethods[0]);
    }
  };

  const updateBasePath = async (path: string) => {
    // Se o caminho for igual ao que já temos, não faz nada
    if (path === basePath) return;
    
    setBasePath(path);
    localStorage.setItem('base_path', path);
    
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ basePath: path })
      });
      
      if (response.ok) {
        setMessage({ text: 'Diretório base atualizado!', type: 'success' });
        // Após atualizar o diretório, tenta escanear automaticamente
        handleScanDirectories();
      } else {
        const data = await response.json();
        setMessage({ text: `Erro: ${data.error || 'Falha ao salvar diretório'}`, type: 'error' });
      }
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (err) {
      console.error('Erro ao salvar diretório:', err);
      setMessage({ text: 'Erro de conexão ao salvar diretório.', type: 'error' });
    }
  };

  const handleScanDirectories = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/config/scan');
      const data = await response.json();

      if (response.ok && data.establishments) {
        // Garantir que estamos pegando a lista mais atual do localStorage ou do state
        const currentSaved = localStorage.getItem('establishments');
        const currentList = currentSaved ? JSON.parse(currentSaved) : establishments;
        
        const currentFiles = currentList.map((e: Establishment) => e.fileName);
        const newEsts = data.establishments.filter((e: any) => !currentFiles.includes(e.fileName));

        if (newEsts.length > 0) {
          const updatedList = [...currentList, ...newEsts];
          setEstablishments(updatedList);
          localStorage.setItem('establishments', JSON.stringify(updatedList));
          
          // Se não houver estabelecimento ativo, seleciona o primeiro da nova lista
          if (!activeEstablishmentId && updatedList.length > 0) {
            const firstId = updatedList[0].id;
            setActiveEstablishmentId(firstId);
            localStorage.setItem('active_establishment_id', firstId);
          }
          
          setMessage({ text: `${newEsts.length} novos locais encontrados!`, type: 'success' });
        } else {
          setMessage({ text: 'Todos os locais já estão sincronizados.', type: 'success' });
        }
      } else {
        setMessage({ text: data.error || 'Erro ao escanear pastas.', type: 'error' });
      }
    } catch (err) {
      console.error('Erro ao escanear:', err);
      setMessage({ text: 'Falha ao conectar com o servidor para escanear.', type: 'error' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    }
  };

  const handleDarBaixa = async (sale: any) => {
    if (!activeEstablishment?.fileName) return;
    try {
      const response = await fetch('/api/sales/manage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sale.ID_Único,
          companyName: activeEstablishment.fileName,
          updates: { Status: 'Pago' }
        })
      });
      if (response.ok) {
        fetchReports();
        setMessage({ text: 'Venda baixada com sucesso!', type: 'success' });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      }
    } catch (err) {
      console.error('Erro ao dar baixa:', err);
    }
  };

  const handleUndoBaixa = async (sale: any) => {
    if (!activeEstablishment?.fileName || !confirm('Deseja retornar esta venda para Pendente?')) return;
    try {
      const response = await fetch('/api/sales/manage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sale.ID_Único,
          companyName: activeEstablishment.fileName,
          updates: { Status: 'Pendente' }
        })
      });
      if (response.ok) {
        fetchReports();
        setMessage({ text: 'Venda retornada para pendente!', type: 'success' });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      }
    } catch (err) {
      console.error('Erro ao desfazer baixa:', err);
    }
  };

  const handleBatchBaixa = async () => {
    const pendingSales = filteredReports.filter(r => r.Status !== 'Pago' && r.Tipo === 'Venda');
    if (pendingSales.length === 0 || !activeEstablishment?.fileName) return;

    const confirmMsg = `Deseja dar baixa em ${pendingSales.length} venda(s) de ${paymentFilter}?`;
    if (!confirm(confirmMsg)) return;

    setLoadingReports(true);
    try {
      const response = await fetch('/api/sales/manage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: pendingSales.map(s => s.ID_Único),
          companyName: activeEstablishment.fileName,
          updates: { Status: 'Pago' }
        })
      });
      if (response.ok) {
        fetchReports();
        setMessage({ text: `${pendingSales.length} vendas baixadas com sucesso!`, type: 'success' });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      }
    } catch (err) {
      console.error('Erro ao dar baixa em lote:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleDeleteSale = async (id: string) => {
    if (!activeEstablishment?.fileName || !confirm('Tem certeza que deseja excluir esta venda?')) return;
    try {
      const response = await fetch(`/api/sales/manage?id=${id}&companyName=${activeEstablishment.fileName}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchReports();
        setMessage({ text: 'Venda excluída!', type: 'success' });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      }
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };

  const handleUpdateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale || !activeEstablishment?.fileName) return;

    try {
      const response = await fetch('/api/sales/manage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingSale.ID_Único,
          companyName: activeEstablishment.fileName,
          updates: { Valor: parseFloat(editValue.replace(',', '.')) }
        })
      });
      if (response.ok) {
        setEditingSale(null);
        fetchReports();
        setMessage({ text: 'Valor atualizado!', type: 'success' });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      }
    } catch (err) {
      console.error('Erro ao atualizar valor:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input?.trim() || !activeEstablishment?.fileName) return;

    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          input, 
          type, 
          paymentMethod: (paymentMethod === 'Crédito' || paymentMethod === 'Débito') 
            ? `${paymentMethod} (${cardBrand})` 
            : paymentMethod,
          spreadsheetId: activeEstablishment.fileName
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ 
          text: `Sucesso! ${data.count} lançamento(s) em ${activeEstablishment.name}.`, 
          type: 'success' 
        });
        setInput('');
      } else {
        setMessage({ 
          text: `Erro: ${data.error || 'Falha ao processar'}`, 
          type: 'error' 
        });
      }
    } catch (err) {
      setMessage({ text: 'Erro de conexão com o servidor.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Filtrar relatórios com base nos estados de filtro e busca
  const filteredReports = reports
    .filter(item => {
      const matchStatus = filterStatus === 'Todos' || item.Status === filterStatus;
      const matchType = filterType === 'Todos' || item.Tipo === filterType;
      
      // Lógica de filtro de pagamento melhorada
      let matchPayment = paymentFilter === 'Todos';
      if (paymentFilter === 'Cartão') {
        matchPayment = item.Pagamento?.includes('Crédito') || 
                      item.Pagamento?.includes('Débito') || 
                      item.Pagamento?.includes('Cartão');
      } else if (paymentFilter !== 'Todos') {
        matchPayment = item.Pagamento?.includes(paymentFilter);
      }
      
      // Busca por valor
      const matchSearch = !searchValue || 
        item.Valor.toString().includes(searchValue.replace(',', '.')) ||
        item.Valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }).includes(searchValue);

      return matchStatus && matchType && matchPayment && matchSearch;
    })
    .sort((a, b) => {
      const parseDate = (str: string) => {
        if (!str) return 0;
        const [datePart, timePart] = str.split(' ');
        const [day, month, year] = datePart.split('/');
        return new Date(`${year}-${month}-${day}T${timePart || '00:00:00'}`).getTime();
      };

      if (sortBy === 'recent') return parseDate(b.Data) - parseDate(a.Data);
      if (sortBy === 'oldest') return parseDate(a.Data) - parseDate(b.Data);
      if (sortBy === 'value_asc') return a.Valor - b.Valor;
      if (sortBy === 'value_desc') return b.Valor - a.Valor;
      return 0;
    });

  // Lógica de Paginação
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const paginatedReports = filteredReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 p-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="font-black text-2xl text-blue-600 tracking-tighter italic leading-none">CAIXA PRO</h1>
            {activeEstablishment && (
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 flex items-center gap-1">
                <Store className="w-3 h-3" /> {activeEstablishment.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeEstablishment ? (
              <span className="flex items-center gap-1 text-[10px] bg-green-50 text-green-600 px-2 py-1 rounded-full font-bold uppercase border border-green-100">
                <Check className="w-3 h-3" /> Conectado
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] bg-amber-50 text-amber-600 px-2 py-1 rounded-full font-bold uppercase border border-amber-100">
                <AlertCircle className="w-3 h-3" /> Sem Planilha
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-md mx-auto w-full p-4">
        
        {/* TAB: SAIDAS (Lançamentos) */}
        {activeTab === 'saidas' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {establishments.length > 0 ? (
              <div className="bg-white rounded-3xl shadow-xl shadow-blue-900/5 border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-2xl">
                      <PlusCircle className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Novo Lançamento</h2>
                      <p className="text-xs text-gray-500">Lançando em <span className="font-bold text-blue-600">{activeEstablishment?.name}</span></p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Seletor de Estabelecimento (Select) */}
                  {establishments.length > 1 && (
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Trocar Estabelecimento</label>
                      <div className="relative">
                        <select
                          value={activeEstablishmentId || ''}
                          onChange={(e) => selectEstablishment(e.target.value)}
                          className="w-full p-4 pr-12 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none text-sm font-bold text-gray-900 appearance-none transition-all shadow-sm"
                        >
                          {establishments.map((est) => (
                            <option key={est.id} value={est.id}>
                              {est.name.toUpperCase()}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Store className="w-4 h-4 text-blue-600" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tipo */}
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Tipo de Fluxo</label>
                    <div className="flex gap-2">
                      {[
                        { id: 'Venda', icon: ArrowUpCircle, color: 'text-green-600', bg: 'bg-green-50', active: 'bg-green-600' },
                        { id: 'Gasto', icon: ArrowDownCircle, color: 'text-red-600', bg: 'bg-red-50', active: 'bg-red-600' },
                        { id: 'Outro', icon: History, color: 'text-gray-600', bg: 'bg-gray-50', active: 'bg-gray-600' }
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setType(t.id)}
                          className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-2xl border transition-all ${
                            type === t.id
                              ? `${t.active} text-white border-transparent shadow-lg transform scale-105`
                              : `${t.bg} ${t.color} border-gray-100`
                          }`}
                        >
                          <t.icon className="w-5 h-5" />
                          <span className="text-xs font-bold">{t.id}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pagamento */}
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Forma de Recebimento</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'Dinheiro', icon: DollarSign },
                        { id: 'Pix', icon: QrCode },
                        { id: 'Crédito', icon: CreditCard },
                        { id: 'Débito', icon: CreditCard }
                      ].filter(m => !activeEstablishment?.enabledMethods || activeEstablishment.enabledMethods.includes(m.id)).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentMethod(m.id)}
                          className={`py-3 flex flex-col items-center gap-2 rounded-2xl border font-bold transition-all ${
                            paymentMethod === m.id
                              ? 'bg-gray-900 text-white border-transparent shadow-lg transform scale-105'
                              : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <m.icon className="w-5 h-5" />
                          <span className="text-[10px]">{m.id}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bandeira do Cartão (Condicional) */}
                  {(paymentMethod === 'Crédito' || paymentMethod === 'Débito') && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Bandeira do Cartão</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['Visa', 'Master', 'Elo', 'Hiper', 'Amex', 'Outra'].map((brand) => (
                          <button
                            key={brand}
                            type="button"
                            onClick={() => setCardBrand(brand)}
                            className={`py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all ${
                              cardBrand === brand
                                ? 'bg-blue-600 text-white border-transparent shadow-md'
                                : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-white'
                            }`}
                          >
                            {brand}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Valores */}
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Valores (Espaço separa)</label>
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="15,00 22 30,50..."
                      rows={4}
                      className="w-full p-5 bg-gray-50 border border-gray-200 rounded-3xl focus:ring-4 focus:ring-blue-100 focus:bg-white outline-none transition-all text-2xl font-bold text-gray-800 placeholder:text-gray-300"
                      disabled={loading || !activeEstablishment}
                    />
                  </div>

                  {message.text && (
                    <div className={`p-4 rounded-2xl text-sm font-bold flex items-center gap-3 animate-in zoom-in-95 duration-300 ${
                      message.type === 'success' 
                        ? 'bg-green-50 text-green-700 border border-green-100' 
                        : 'bg-red-50 text-red-700 border border-red-100'
                    }`}>
                      {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                      {message.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !input.trim() || !activeEstablishment}
                    className={`w-full py-5 rounded-3xl text-white font-black text-lg shadow-2xl transition-all active:scale-95 ${
                      loading || !input.trim() || !activeEstablishment
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                        : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                    }`}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                        PROCESSANDO...
                      </div>
                    ) : (
                      'LANÇAR AGORA'
                    )}
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center space-y-4">
                <div className="bg-amber-50 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Nenhum estabelecimento</h3>
                  <p className="text-xs text-gray-500">Você precisa cadastrar um estabelecimento antes de fazer lançamentos.</p>
                </div>
                <button
                  onClick={() => setActiveTab('configuracoes')}
                  className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest"
                >
                  Ir para Ajustes
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB: BAIXAS (CONTROLE) */}
        {activeTab === 'baixas' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Seletor de Estabelecimento (Select) */}
            <div className="px-2 grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Estabelecimento</label>
                <div className="relative">
                  <select
                    value={activeEstablishmentId || ''}
                    onChange={(e) => selectEstablishment(e.target.value)}
                    className="w-full p-3 pr-10 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none text-sm font-bold text-gray-900 appearance-none transition-all shadow-sm"
                  >
                    {establishments.map((est) => (
                      <option key={est.id} value={est.id}>
                        {est.name.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Store className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Mês de Referência</label>
                <input 
                  type="month" 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full p-3 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none text-sm font-bold text-gray-900 shadow-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between mb-2 px-2">
              <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" /> Baixas e Controle
                </h2>
              </div>
              <div className="flex gap-2">
                {paymentFilter !== 'Todos' && filteredReports.some(r => r.Status !== 'Pago' && r.Tipo === 'Venda') && (
                  <button 
                    onClick={handleBatchBaixa}
                    className="bg-green-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm animate-in fade-in zoom-in duration-200"
                  >
                    <Check className="w-3 h-3" /> Baixar Tudo ({paymentFilter})
                  </button>
                )}
                <button onClick={() => fetchReports()} className="text-blue-600 text-[10px] font-black uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full" disabled={!activeEstablishment}>
                  Atualizar
                </button>
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              {/* Busca por Valor */}
              <div className="relative">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Buscar Valor</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Ex: 50,00 ou 50.00"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold text-gray-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                  {searchValue && (
                    <button 
                      onClick={() => setSearchValue('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Forma de Pagamento</label>
                  <div className="relative">
                    <select
                      value={paymentFilter}
                      onChange={(e) => setPaymentFilter(e.target.value)}
                      className="w-full p-3 pr-8 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-bold text-gray-900 outline-none focus:ring-4 focus:ring-blue-100 appearance-none"
                    >
                      {['Todos', 'Dinheiro', 'Pix', 'Cartão'].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Ordenar por</label>
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full p-3 pr-8 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-bold text-gray-900 outline-none focus:ring-4 focus:ring-blue-100 appearance-none"
                    >
                      <option value="recent">Mais Recentes</option>
                      <option value="oldest">Mais Antigos</option>
                      <option value="value_desc">Maior Valor</option>
                      <option value="value_asc">Menor Valor</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Status da Baixa</label>
                  <div className="flex gap-2">
                    {['Todos', 'Pendente', 'Pago'].map(s => (
                      <button
                        key={s}
                        onClick={() => setFilterStatus(s)}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all ${
                          filterStatus === s ? 'bg-gray-900 text-white shadow-md' : 'bg-gray-50 text-gray-500 border border-gray-100'
                        }`}
                      >
                        {s === 'Pago' ? 'Paga' : s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Fluxo</label>
                  <div className="flex gap-2">
                    {['Todos', 'Venda', 'Gasto'].map(t => (
                      <button
                        key={t}
                        onClick={() => setFilterType(t)}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all ${
                          filterType === t ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-50 text-gray-500 border border-gray-100'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal de Edição Rápida */}
            {editingSale && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white w-full max-w-xs rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest">Editar Valor</h3>
                    <button onClick={() => setEditingSale(null)}><X className="w-5 h-5 text-gray-400" /></button>
                  </div>
                  <form onSubmit={handleUpdateSale} className="space-y-4">
                    <input 
                      type="text" 
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-2xl font-bold text-center outline-none focus:ring-4 focus:ring-blue-100"
                      autoFocus
                    />
                    <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest">
                      Salvar Alteração
                    </button>
                  </form>
                </div>
              </div>
            )}

            {!activeEstablishment ? (
              <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center">
                <p className="text-gray-400 font-bold text-sm">Configure um estabelecimento primeiro.</p>
              </div>
            ) : loadingReports ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Carregando...</p>
              </div>
            ) : paginatedReports.length > 0 ? (
              <>
                {/* Paginação Superior */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-2 px-2 pb-2">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 bg-white border border-gray-100 rounded-xl text-gray-400 disabled:opacity-30 active:scale-90 transition-all shadow-sm shrink-0"
                    >
                      <ArrowDownCircle className="w-5 h-5 rotate-90" />
                    </button>
                    
                    <div className="flex-1 flex gap-1.5 overflow-x-auto no-scrollbar py-1 justify-center">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`min-w-8 h-8 flex items-center justify-center rounded-xl text-xs font-black transition-all shrink-0 ${
                            currentPage === page
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 ring-2 ring-blue-100'
                              : 'bg-white text-gray-400 border border-gray-100 hover:border-blue-200'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 bg-white border border-gray-100 rounded-xl text-gray-400 disabled:opacity-30 active:scale-90 transition-all shadow-sm shrink-0"
                    >
                      <ArrowDownCircle className="w-5 h-5 -rotate-90" />
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  {paginatedReports.map((item, idx) => (
                    <div key={item.ID_Único || idx} className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-2xl ${item.Tipo === 'Venda' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                          {item.Tipo === 'Venda' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-lg font-black text-gray-900">R$ {parseFloat(item.Valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{item.Data} • {item.Pagamento}</p>
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                        item.Status === 'Pago' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.Status === 'Pago' ? 'Concluída' : (item.Status || 'Pendente')}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-1">
                      {item.Status !== 'Pago' ? (
                        <button 
                          onClick={() => handleDarBaixa(item)}
                          className="flex-1 bg-green-600 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1 active:scale-95 transition-all"
                        >
                          <Check className="w-3 h-3" /> Dar Baixa
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleUndoBaixa(item)}
                          className="flex-1 bg-gray-900 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1 active:scale-95 transition-all"
                        >
                          <History className="w-3 h-3" /> Desfazer Baixa
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          setEditingSale(item);
                          setEditValue(item.Valor.toString());
                        }}
                        className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:text-blue-600 active:scale-95 transition-all"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteSale(item.ID_Único)}
                        className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:text-red-600 active:scale-95 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center gap-2 px-2 pt-2 pb-4">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 bg-white border border-gray-100 rounded-xl text-gray-400 disabled:opacity-30 active:scale-90 transition-all shadow-sm shrink-0"
                  >
                    <ArrowDownCircle className="w-5 h-5 rotate-90" />
                  </button>
                  
                  <div className="flex-1 flex gap-1.5 overflow-x-auto no-scrollbar py-1 justify-center">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`min-w-8 h-8 flex items-center justify-center rounded-xl text-xs font-black transition-all shrink-0 ${
                          currentPage === page
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 ring-2 ring-blue-100'
                            : 'bg-white text-gray-400 border border-gray-100 hover:border-blue-200'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 bg-white border border-gray-100 rounded-xl text-gray-400 disabled:opacity-30 active:scale-90 transition-all shadow-sm shrink-0"
                  >
                    <ArrowDownCircle className="w-5 h-5 -rotate-90" />
                  </button>
                </div>
              )}
              </>
            ) : (
              <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center">
                <p className="text-gray-400 font-bold text-sm">Nenhuma transação encontrada com estes filtros.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB: RELATORIOS (ESTATÍSTICAS) */}
        {activeTab === 'relatorios' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Seletor de Estabelecimento e Mês */}
            <div className="px-2 grid grid-cols-1 gap-3">
              <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Estabelecimento</label>
                    <div className="relative">
                      <select
                        value={activeEstablishmentId || ''}
                        onChange={(e) => selectEstablishment(e.target.value)}
                        className="w-full p-2.5 pr-8 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none text-xs font-bold text-gray-900 appearance-none transition-all"
                      >
                        {establishments.map((est) => (
                          <option key={est.id} value={est.id}>
                            {est.name.toUpperCase()}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronDown className="w-3 h-3 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Mês de Referência</label>
                    <input 
                      type="month" 
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none text-xs font-bold text-gray-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-2 px-2">
              <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" /> Relatórios
                </h2>
              </div>
              <button 
                onClick={() => fetchReports()} 
                className="text-blue-600 text-[10px] font-black uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors" 
                disabled={!activeEstablishment || loadingReports}
              >
                {loadingReports ? 'Carregando...' : 'Atualizar'}
              </button>
            </div>

            {!activeEstablishment ? (
              <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center">
                <p className="text-gray-400 font-bold text-sm">Configure um estabelecimento primeiro.</p>
              </div>
            ) : loadingReports ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Calculando...</p>
              </div>
            ) : reports.length > 0 ? (
              <div className="space-y-4">
                {/* Cards de Resumo */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                      <ArrowUpCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                      {paymentFilter !== 'Todos' ? `Vendas (${paymentFilter})` : 'Total Vendas'}
                    </p>
                    <p className="text-xl font-black text-green-600">
                      R$ {filteredReports.filter(r => r.Tipo === 'Venda').reduce((acc, r) => acc + r.Valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    {paymentFilter !== 'Todos' && (
                      <p className="text-[8px] font-bold text-gray-400 mt-1 uppercase">
                        Total Geral: R$ {reports.filter(r => r.Tipo === 'Venda').reduce((acc, r) => acc + r.Valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                  <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                      <ArrowDownCircle className="w-10 h-10 text-red-600" />
                    </div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                      {paymentFilter !== 'Todos' ? `Gastos (${paymentFilter})` : 'Total Gastos'}
                    </p>
                    <p className="text-xl font-black text-red-600">
                      R$ {filteredReports.filter(r => r.Tipo === 'Gasto').reduce((acc, r) => acc + r.Valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    {paymentFilter !== 'Todos' && (
                      <p className="text-[8px] font-bold text-gray-400 mt-1 uppercase">
                        Total Geral: R$ {reports.filter(r => r.Tipo === 'Gasto').reduce((acc, r) => acc + r.Valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Filtros nos Relatórios */}
                <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Filtrar por Pagamento</label>
                    {paymentFilter !== 'Todos' && (
                      <button onClick={() => setPaymentFilter('Todos')} className="text-[8px] font-black text-blue-600 uppercase">Limpar</button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {['Todos', 'Dinheiro', 'Pix', 'Cartão'].map(p => (
                      <button
                        key={p}
                        onClick={() => {
                          setPaymentFilter(p);
                          setCurrentPage(1);
                        }}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all ${
                          paymentFilter === p ? 'bg-blue-600 text-white shadow-md scale-105' : 'bg-gray-50 text-gray-500 border border-gray-100'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  
                  {/* Busca e Ordenação nos Relatórios */}
                  <div className="grid grid-cols-1 gap-2 pt-2 border-t border-gray-50">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Pesquisar valor..."
                        value={searchValue}
                        onChange={(e) => {
                          setSearchValue(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Resumo por Pagamento Detalhado */}
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resumo por Tipo</p>
                    <DollarSign className="w-3 h-3 text-blue-600" />
                  </div>
                  <div className="space-y-3">
                    {Array.from(new Set(filteredReports.filter(r => r.Tipo === 'Venda').map(r => {
                      if (r.Pagamento?.includes('Crédito')) return 'Crédito';
                      if (r.Pagamento?.includes('Débito')) return 'Débito';
                      return r.Pagamento || 'Outros';
                    }))).sort().map(methodType => {
                      const total = filteredReports
                        .filter(r => {
                          if (methodType === 'Crédito') return r.Tipo === 'Venda' && r.Pagamento?.includes('Crédito');
                          if (methodType === 'Débito') return r.Tipo === 'Venda' && r.Pagamento?.includes('Débito');
                          return r.Tipo === 'Venda' && r.Pagamento === methodType;
                        })
                        .reduce((acc, r) => acc + r.Valor, 0);
                      
                      return (
                        <div key={methodType} className="flex justify-between items-center group">
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-blue-400 rounded-full group-hover:scale-150 transition-transform" />
                            <span className="text-[10px] font-bold text-gray-600 uppercase">{methodType}</span>
                          </div>
                          <span className="text-xs font-black text-gray-900">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      );
                    })}
                    
                    {/* Linha de Total Filtrado */}
                    <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between items-center">
                      <span className="text-[10px] font-black text-blue-600 uppercase">Total Filtrado</span>
                      <span className="text-sm font-black text-blue-600">
                        R$ {filteredReports.filter(r => r.Tipo === 'Venda').reduce((acc, r) => acc + r.Valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lista de Transações Filtradas */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Transações {paymentFilter !== 'Todos' ? `(${paymentFilter})` : ''}</p>
                    <span className="text-[8px] font-black text-gray-400 uppercase">{filteredReports.length} itens</span>
                  </div>
                  <div className="divide-y divide-gray-50 max-h-100 overflow-y-auto no-scrollbar">
                    {paginatedReports.length > 0 ? paginatedReports.map((item, idx) => (
                      <div key={idx} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                        <div>
                          <p className="text-sm font-black text-gray-800">R$ {item.Valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase">{item.Data} • {item.Pagamento}</p>
                        </div>
                        <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${
                          item.Tipo === 'Venda' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                        }`}>
                          {item.Tipo}
                        </span>
                      </div>
                    )) : (
                      <div className="p-8 text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Nenhum resultado</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Paginação no Relatório */}
                  {totalPages > 1 && (
                    <div className="p-4 bg-gray-50/50 border-t border-gray-50 flex flex-col gap-3">
                      <div className="flex justify-center gap-1 overflow-x-auto no-scrollbar py-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => {
                              setCurrentPage(page);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={`min-w-8 h-8 rounded-lg text-[10px] font-black transition-all ${
                              currentPage === page 
                                ? 'bg-blue-600 text-white shadow-md scale-110' 
                                : 'bg-white text-gray-400 border border-gray-100 hover:border-blue-200'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center">
                <p className="text-gray-400 font-bold text-sm">Nenhum dado para gerar relatório.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB: CONFIGURACOES */}
        {activeTab === 'configuracoes' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Configuração de Diretório Global */}
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-900/5 border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gray-100 p-2 rounded-2xl">
                  <Settings2 className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Diretório Base</h2>
                  <p className="text-xs text-gray-500">Onde as pastas serão criadas</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Caminho da Pasta (Ex: C:\MeusDados)</label>
                    <button
                      onClick={handleScanDirectories}
                      disabled={loading || !basePath}
                      className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 disabled:opacity-50"
                    >
                      <History className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                      Sincronizar Pastas
                    </button>
                  </div>
                  <input
                    type="text"
                    value={basePath}
                    onChange={(e) => setBasePath(e.target.value)}
                    onBlur={(e) => updateBasePath(e.target.value)}
                    placeholder="Deixe vazio para usar a pasta do projeto"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none text-xs font-mono text-gray-800"
                  />
                  <p className="text-[9px] text-gray-400 mt-2 italic leading-relaxed">
                    * Digite o caminho completo de onde você quer que a estrutura <code>Empresa/Ano/Mês</code> seja criada.
                  </p>
                </div>
              </div>
            </div>

            {/* Adicionar/Editar Estabelecimento */}
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-900/5 border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`${editingId ? 'bg-amber-100' : 'bg-blue-50'} p-2 rounded-2xl`}>
                    {editingId ? <Pencil className="w-6 h-6 text-amber-600" /> : <Plus className="w-6 h-6 text-blue-600" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{editingId ? 'Editar Local' : 'Novo Local'}</h2>
                    <p className="text-xs text-gray-500">{editingId ? 'Atualize as informações do local' : 'Cadastrar novo estabelecimento'}</p>
                  </div>
                </div>
                {editingId && (
                  <button 
                    onClick={cancelEditing}
                    className="p-2 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Nome da Empresa / Local</label>
                  <input
                    type="text"
                    value={newEstName}
                    onChange={(e) => setNewEstName(e.target.value)}
                    placeholder="Ex: Loja Centro, Quiosque..."
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none text-sm font-bold text-gray-900 placeholder:text-gray-400"
                  />
                  <p className="text-[9px] text-gray-400 mt-1 italic">* O sistema criará pastas organizadas por Ano e Mês para cada empresa.</p>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Métodos de Pagamento Habilitados</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_PAYMENT_METHODS.map((method) => (
                      <button
                        key={method}
                        onClick={() => {
                          if (newEstMethods.includes(method)) {
                            // Não permitir desabilitar todos os métodos
                            if (newEstMethods.length > 1) {
                              setNewEstMethods(newEstMethods.filter(m => m !== method));
                            }
                          } else {
                            setNewEstMethods([...newEstMethods, method]);
                          }
                        }}
                        className={`py-2 px-3 rounded-xl border text-[10px] font-bold transition-all flex items-center justify-between ${
                          newEstMethods.includes(method)
                            ? 'bg-blue-600 text-white border-transparent'
                            : 'bg-gray-50 text-gray-400 border-gray-100'
                        }`}
                      >
                        {method}
                        {newEstMethods.includes(method) ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-gray-400 mt-2 italic">* Selecione quais botões aparecerão na tela de lançamento para este local.</p>
                </div>

                <button
                  onClick={addEstablishment}
                  disabled={!newEstName?.trim()}
                  className={`w-full py-3 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:bg-gray-200 disabled:text-gray-400 ${
                    editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {editingId ? 'Atualizar Estabelecimento' : 'Adicionar Estabelecimento'}
                </button>
              </div>
            </div>

            {/* Lista de Estabelecimentos */}
            {establishments.length > 0 && (
              <div className="bg-white rounded-3xl shadow-xl shadow-gray-900/5 border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gray-100 p-2 rounded-2xl">
                    <Store className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Meus Locais</h2>
                    <p className="text-xs text-gray-500">Gerenciar estabelecimentos cadastrados</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {establishments.map((est) => (
                    <div 
                      key={est.id} 
                      className={`p-4 rounded-2xl border transition-all flex justify-between items-center ${
                        activeEstablishmentId === est.id 
                          ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' 
                          : 'bg-gray-50 border-gray-100'
                      }`}
                    >
                      <div className="flex-1 cursor-pointer" onClick={() => selectEstablishment(est.id)}>
                        <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                          {est.name}
                          {activeEstablishmentId === est.id && <Check className="w-3 h-3 text-blue-600" />}
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono truncate max-w-50">/data/{est.fileName}/...</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => startEditing(est)}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => removeEstablishment(est.id)}
                          className="p-2 text-red-400 hover:text-red-600 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <p className="text-[10px] font-bold text-amber-800 uppercase mb-1">Estrutura de Pastas Inteligente</p>
              <p className="text-[10px] text-amber-700 leading-relaxed">
                Os arquivos são salvos automaticamente em: <br />
                <code>/data/Nome_Empresa/Ano/Mes/vendas.xlsx</code>. <br />
                O sistema cria as pastas novas sozinho a cada mês!
              </p>
            </div>
          </div>
        )}
      </main>

      {/* BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 z-30">
        <div className="max-w-md mx-auto flex justify-between items-center">
          {[
            { id: 'saidas', label: 'Lançar', icon: PlusCircle },
            { id: 'baixas', label: 'Baixas', icon: Check },
            { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
            { id: 'configuracoes', label: 'Ajustes', icon: Settings2 }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 transition-all ${
                activeTab === tab.id ? 'text-blue-600 scale-110' : 'text-gray-400'
              }`}
            >
              <tab.icon className={`w-6 h-6 ${activeTab === tab.id ? 'fill-blue-50' : ''}`} />
              <span className="text-[10px] font-black uppercase tracking-tighter">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
