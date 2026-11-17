import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { apiFetch } from '../lib/apiFetch';

export default function Dashboard() {
  const [darkMode, setDarkMode] = useState(true);

  // Função para alternar o tema e injetar a classe no HTML global para o Tailwind
  const toggleDarkMode = () => {
    const novoEstado = !darkMode;
    setDarkMode(novoEstado);
    if (novoEstado) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Garante que o HTML inicie sincronizado com o state
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Tipo de Operação e valores relacionados
  const [tipoOperacao, setTipoOperacao] = useState<'EMPRESTIMO' | 'RMC' | 'RCC'>('EMPRESTIMO');
  const [descontosFacultativos, setDescontosFacultativos] = useState<number | ''>('');
  const [emprestimosAtivos, setEmprestimosAtivos] = useState<number | ''>('');
  const [descontoRMC, setDescontoRMC] = useState<number | ''>('');
  const [descontoRCC, setDescontoRCC] = useState<number | ''>('');

  // Dados do Servidor/Cliente
  const [nomeServidor, setNomeServidor] = useState('');

  // Dados Financeiros
  const [salario, setSalario] = useState<number | ''>('');
  const [descontos, setDescontos] = useState<number | ''>('');
  const [novaParcela, setNovaParcela] = useState<number | ''>('');

  // Controles
  const [convenios, setConvenios] = useState<any[]>([]);
  const [convenioSelecionado, setConvenioSelecionado] = useState('');
  const [resultado, setResultado] = useState<any>(null);
  const [historico, setHistorico] = useState<any[]>([]);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);

  // Toggle do Histórico
  const [mostrarHistorico, setMostrarHistorico] = useState(false);

  // 🔍 BUSCANDO O CONVÊNIO SELECIONADO ATUAL PARA LER AS REGRAS DINÂMICAS
  const convenioAtual = convenios.find(c => c.id === convenioSelecionado);
  const percentualAdiantamento = convenioAtual?.regrasCalculo?.percentualAdiantamento ?? 0;
  const possuiAdiantamento = percentualAdiantamento > 0;

  const carregarDadosIniciais = async () => {
    try {
      const resConvenios = await apiFetch('/convenios');
      if (!resConvenios.ok) {
        const erro = await resConvenios.json();
        throw new Error(erro.erro ?? 'Falha ao carregar convênios.');
      }
      const dadosConvenios = await resConvenios.json();
      setConvenios(dadosConvenios);
      
     // Define o convênio inicial apenas se nenhum estiver selecionado
      if (dadosConvenios.length > 0 && !convenioSelecionado) {
        const primeiroVisivel = dadosConvenios.find((c: any) => !c.nomeOrgao.toLowerCase().includes('padrão')) || dadosConvenios[0];
        setConvenioSelecionado(primeiroVisivel.id);
      }

      const resHistorico = await apiFetch('/analises/historico');
      if (!resHistorico.ok) {
        const erro = await resHistorico.json();
        throw new Error(erro.erro ?? 'Falha ao carregar histórico.');
      }
      const dadosHistorico = await resHistorico.json();
      setHistorico(dadosHistorico);

      setErroCarregamento(null);
    } catch (error: any) {
      console.error('Erro ao conectar com a API:', error);
      setErroCarregamento(error.message ?? 'Não foi possível carregar os dados.');
      setConvenios([]);
      setHistorico([]);
    }
  };

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  async function baixarPDF(id: string) {
    try {
      const res = await apiFetch(`/analises/${id}/relatorio`, { 
        method: 'POST' 
      });

      if (!res.ok) {
        const erroTexto = await res.text();
        alert(`Erro ao gerar PDF (${res.status}): ${erroTexto || res.statusText}`);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `laudo-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro de rede ao baixar PDF:', error);
      alert('Erro de conexão ao tentar baixar o PDF.');
    }
  }

  const simularCredito = async (e: React.FormEvent) => {
    e.preventDefault();

    const resposta = await apiFetch('/analises/processar', {
      method: 'POST',
      body: JSON.stringify({
        convenioId: convenioSelecionado,
        nomeCliente: nomeServidor,
        dadosProposta: {
          salarioFixo: Number(salario) || 0,
          outrosProventos: 0,
          descontosCompulsorios: Number(descontos) || 0,
          descontosFacultativos: Number(descontosFacultativos) || 0,
          emprestimosAtivos: Number(emprestimosAtivos) || 0,
          descontoRMC: Number(descontoRMC) || 0,
          descontoRCC: Number(descontoRCC) || 0,
          tipoOperacao: tipoOperacao,
          valorNovaParcela: Number(novaParcela) || 0,
        },
      }),
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      setResultado(null);
      setErroCarregamento(dados.erro ?? 'Falha ao processar a análise.');
      return;
    }

    setResultado(dados);
    carregarDadosIniciais();
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${darkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      
      {/* HEADER INSTITUCIONAL */}
      <header className={`border-b px-6 py-4 flex justify-between items-center shadow-sm transition-colors duration-300 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center space-x-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm border overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <img src="public/favicon.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className={`text-sm font-bold block ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>Calculadora de Análise de Crédito</span>
            <span className={`text-[10px] block -mt-1 font-medium ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>Painel do Analista</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>
            Sessão Ativa
          </span>

          <button 
            onClick={toggleDarkMode}
            className={`p-2.5 rounded-full shadow-md border transition-all duration-200 flex items-center justify-center cursor-pointer ${
              darkMode 
                ? 'bg-gray-900 border-gray-800 text-orange-400 hover:bg-gray-800' 
                : 'bg-white border-gray-200 text-orange-600 hover:bg-gray-100'
            }`}
            title={darkMode ? 'Mudar para Light Mode' : 'Mudar para Dark Mode'}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        
        {/* CARD DA CALCULADORA */}
        <div className={`rounded-2xl shadow-sm border p-8 transition-colors duration-300 ${darkMode ? 'bg-gray-900 border-gray-800 text-gray-100' : 'bg-white border-gray-200 text-gray-900'}`}>
          <div className={`border-b pb-4 mb-6 ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
            <h1 className={`text-xl font-bold tracking-tight ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>Calculadora de Análise de Crédito</h1>
            <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Preencha os dados cadastrais e financeiros do servidor para gerar o laudo de conformidade.</p>
          </div>

          {erroCarregamento && (
            <div className={`mb-6 p-4 rounded-xl border text-xs font-medium flex items-center space-x-2 ${darkMode ? 'bg-red-950/40 border-red-900/50 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
              <span>⚠️</span>
              <span>{erroCarregamento}</span>
            </div>
          )}

          <form onSubmit={simularCredito} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Bloco 1: Identificação */}
              <div className={`space-y-4 p-5 rounded-xl border transition-colors duration-300 ${darkMode ? 'bg-gray-950/50 border-gray-800' : 'bg-gray-50/60 border-gray-100'}`}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 mb-1">1. Identificação do Servidor</h3>
                
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Nome do Servidor *</label>
                  <input 
                    type="text" 
                    value={nomeServidor} 
                    onChange={e => setNomeServidor(e.target.value)} 
                    required 
                    className={`w-full border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition ${darkMode ? 'bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-600' : 'bg-white border-gray-300 text-gray-900'}`} 
                    placeholder="Nome completo" 
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Convênio / Órgão</label>
                  <select 
                    value={convenioSelecionado} 
                    onChange={e => setConvenioSelecionado(e.target.value)} 
                    className={`w-full border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition ${darkMode ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
                  >
                    {convenios
                      .filter(conv => !conv.nomeOrgao.toLowerCase().includes('padrão'))
                      .map(conv => (
                        <option key={conv.id} value={conv.id} className={darkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'}>
                          {conv.nomeOrgao}
                        </option>
                      ))
                    }
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Tipo de Operação</label>
                  <select 
                    value={tipoOperacao} 
                    onChange={e => setTipoOperacao(e.target.value as any)} 
                    className={`w-full border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition ${darkMode ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
                  >
                    <option value="EMPRESTIMO" className={darkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'}>Empréstimo Consignado</option>
                    <option value="RMC" className={darkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'}>Cartão de Crédito (RMC)</option>
                    <option value="RCC" className={darkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'}>Cartão de Benefício (RCC)</option>
                  </select>
                </div>
              </div>

              {/* Bloco 2: Composição Financeira */}
              <div className={`space-y-4 p-5 rounded-xl border transition-colors duration-300 ${darkMode ? 'bg-gray-950/50 border-gray-800' : 'bg-gray-50/60 border-gray-100'}`}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 mb-1">2. Composição Financeira</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Salário Bruto (R$)</label>
                    <input 
                      type="number" 
                      onWheel={(e) => e.currentTarget.blur()}
                      onKeyDown={(e) => { if (['ArrowUp', 'ArrowDown', '-', 'e', 'E'].includes(e.key)) e.preventDefault(); }}
                      value={salario} 
                      onChange={e => setSalario(e.target.value === '' ? '' : Number(e.target.value))} 
                      required 
                      placeholder="0,00"
                      className={`w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition ${darkMode ? 'bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-600' : 'bg-white border-gray-300 text-gray-900'}`} 
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Descontos Obrig. (R$)</label>
                    <input 
                      type="number" 
                      onWheel={(e) => e.currentTarget.blur()}
                      onKeyDown={(e) => { if (['ArrowUp', 'ArrowDown', '-', 'e', 'E'].includes(e.key)) e.preventDefault(); }}
                      value={descontos} 
                      onChange={e => setDescontos(e.target.value === '' ? '' : Number(e.target.value))} 
                      required 
                      placeholder="0,00"
                      className={`w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition ${darkMode ? 'bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-600' : 'bg-white border-gray-300 text-gray-900'}`} 
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Descontos Facult. (R$)</label>
                    <input 
                      type="number" 
                      onWheel={(e) => e.currentTarget.blur()}
                      onKeyDown={(e) => { if (['ArrowUp', 'ArrowDown', '-', 'e', 'E'].includes(e.key)) e.preventDefault(); }}
                      value={descontosFacultativos} 
                      onChange={e => setDescontosFacultativos(e.target.value === '' ? '' : Number(e.target.value))} 
                      placeholder="0,00"
                      className={`w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition ${darkMode ? 'bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-600' : 'bg-white border-gray-300 text-gray-900'}`} 
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Empréstimos Ativos (R$)</label>
                    <input 
                      type="number" 
                      onWheel={(e) => e.currentTarget.blur()}
                      onKeyDown={(e) => { if (['ArrowUp', 'ArrowDown', '-', 'e', 'E'].includes(e.key)) e.preventDefault(); }}
                      value={emprestimosAtivos} 
                      onChange={e => setEmprestimosAtivos(e.target.value === '' ? '' : Number(e.target.value))} 
                      placeholder="0,00"
                      className={`w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition ${darkMode ? 'bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-600' : 'bg-white border-gray-300 text-gray-900'}`} 
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Desconto RMC (R$)</label>
                    <input 
                      type="number" 
                      onWheel={(e) => e.currentTarget.blur()}
                      onKeyDown={(e) => { if (['ArrowUp', 'ArrowDown', '-', 'e', 'E'].includes(e.key)) e.preventDefault(); }}
                      value={descontoRMC} 
                      onChange={e => setDescontoRMC(e.target.value === '' ? '' : Number(e.target.value))} 
                      placeholder="0,00"
                      className={`w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition ${darkMode ? 'bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-600' : 'bg-white border-gray-300 text-gray-900'}`} 
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Desconto RCC (R$)</label>
                    <input 
                      type="number" 
                      onWheel={(e) => e.currentTarget.blur()}
                      onKeyDown={(e) => { if (['ArrowUp', 'ArrowDown', '-', 'e', 'E'].includes(e.key)) e.preventDefault(); }}
                      value={descontoRCC} 
                      onChange={e => setDescontoRCC(e.target.value === '' ? '' : Number(e.target.value))} 
                      placeholder="0,00"
                      className={`w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition ${darkMode ? 'bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-600' : 'bg-white border-gray-300 text-gray-900'}`} 
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Valor da Nova Parcela *</label>
                  <input 
                    type="number" 
                    onWheel={(e) => e.currentTarget.blur()}
                    onKeyDown={(e) => { if (['ArrowUp', 'ArrowDown', '-', 'e', 'E'].includes(e.key)) e.preventDefault(); }}
                    value={novaParcela} 
                    onChange={e => setNovaParcela(e.target.value === '' ? '' : Number(e.target.value))} 
                    required 
                    placeholder="R$ 0,00"
                    className={`w-full border rounded-lg px-3.5 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500 transition ${darkMode ? 'bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-600' : 'bg-white border-gray-300 text-gray-900'}`} 
                  />
                </div>

                {/* CAMPO DE ADIAMENTO SALARIAL (TRAVA DINÂMICA) */}
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Adiantamento Salarial (Margem de Segurança)
                  </label>
                  <input 
                    type="text"
                    disabled={!possuiAdiantamento}
                    value={possuiAdiantamento ? `${percentualAdiantamento * 100}% (Liberado)` : "Não disponível para este convênio"}
                    className={`w-full border rounded-lg px-3.5 py-2 text-sm transition ${
                      !possuiAdiantamento 
                        ? (darkMode ? 'bg-gray-900/40 border-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed')
                        : (darkMode ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900')
                    }`}
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 px-6 rounded-xl transition shadow-md hover:shadow-lg text-sm tracking-wide cursor-pointer"
            >
              Processar Análise Matemática
            </button>
          </form>

          {resultado && (
            <div className={`mt-6 p-5 rounded-xl text-white shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${resultado.laudo?.resultado === 'APROVADO' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
              <div className="space-y-1">
                <span className="text-xs uppercase font-bold tracking-wider opacity-90 block">Laudo de Análise</span>
                <h2 className="text-lg font-bold">Status: {resultado.laudo?.resultado}</h2>
                <p className="text-xs opacity-95">{resultado.laudo?.motivo}</p>
              </div>
              
              <button 
                onClick={() => {
                  const idAnalise = resultado.registroId;
                  if (!idAnalise) {
                    alert('Erro: ID da análise não encontrado.');
                    return;
                  }
                  baixarPDF(idAnalise);
                }}
                className="bg-white text-gray-800 hover:bg-gray-100 px-4 py-2.5 rounded-lg text-xs font-bold transition shadow shrink-0 cursor-pointer"
              >
                📄 Baixar Laudo Oficial (PDF)
              </button>
            </div>
          )}
        </div>

        {/* SEÇÃO RETRÁTIL DO HISTÓRICO */}
        <div className={`rounded-2xl shadow-sm border overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
          <button
            type="button"
            onClick={() => setMostrarHistorico(!mostrarHistorico)}
            className={`w-full flex items-center justify-between p-5 transition border-b text-left cursor-pointer ${darkMode ? 'bg-gray-800/40 hover:bg-gray-800/80 border-gray-800' : 'bg-gray-50/50 hover:bg-gray-100/60 border-gray-100'}`}
          >
            <span className={`font-bold text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Histórico de Operações Recentes</span>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200/60 text-gray-500'}`}>{mostrarHistorico ? '▲ Ocultar' : '▼ Mostrar Histórico'}</span>
          </button>

          {mostrarHistorico && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className={`border-b ${darkMode ? 'bg-gray-800/80 border-gray-800' : 'bg-gray-50/80 border-gray-100'}`}>
                  <tr>
                    <th className={`p-4 text-left text-[11px] font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>ID do Registro</th>
                    <th className={`p-4 text-left text-[11px] font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Cliente</th>
                    <th className={`p-4 text-left text-[11px] font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Data da Análise</th>
                    <th className={`p-4 text-left text-[11px] font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Status</th>
                    <th className={`p-4 text-left text-[11px] font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Motivo</th>
                    <th className={`p-4 text-right text-[11px] font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Ação</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                  {historico.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={`p-6 text-center text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Nenhuma análise encontrada no histórico.
                      </td>
                    </tr>
                  ) : (
                    historico.map((reg) => {
                      const dataBruta = reg.dataAnalise;
                      const dataFormatada = dataBruta 
                        ? new Date(dataBruta).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) 
                        : 'Data não informada';

                      return (
                        <tr key={reg.id} className={`transition ${darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50/60'}`}>
                          <td className={`p-4 text-xs font-mono ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{reg.id.split('-')[0]}...</td>
                          
                          <td className={`p-4 text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                            {reg.nomeCliente || 'Não informado'}
                          </td>

                          <td className={`p-4 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {dataFormatada}
                          </td>

                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${reg.resultado === 'APROVADO' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'}`}>
                              {reg.resultado}
                            </span>
                          </td>

                          <td className={`p-4 text-xs max-w-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} title={reg.motivoRecusa}>
                            {reg.motivoRecusa || 'Sem observações'}
                          </td>

                          <td className="p-4 text-right">
                            <button 
                              type="button"
                              onClick={() => baixarPDF(reg.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm cursor-pointer border ${
                                darkMode 
                                  ? 'bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700' 
                                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
                              }`}
                            >
                              📄 Baixar PDF
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}