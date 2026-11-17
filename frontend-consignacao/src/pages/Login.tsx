import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { Sun, Moon } from 'lucide-react'; // Ícones para o botão

export default function Login() {
  const { loginEtapa1, loginEtapa2, nomeEtapa2 } = useAuth();
  const navigate = useNavigate();

  const [etapa, setEtapa] = useState(1);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [palavraSeguranca, setPalavraSeguranca] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Estado do Dark/Light Mode (padrão escuro como você curtiu)
  const [darkMode, setDarkMode] = useState(true);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);

    // Chamada simplificada sem o token do reCAPTCHA
    const resultado = await loginEtapa1(email, senha);

    setEnviando(false);
    if (!resultado.sucesso) {
      setErro(resultado.erro ?? 'Não foi possível entrar.');
      return;
    }
    setEtapa(2); // Avança para pedir a palavra de segurança
  };

  const handleVerificacao = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);

    const resultado = await loginEtapa2(palavraSeguranca);

    setEnviando(false);
    if (!resultado.sucesso) {
      setErro(resultado.erro ?? 'Palavra de segurança incorreta.');
      return;
    }
    navigate('/dashboard'); // Redireciona para o simulador
  };

  return (
    <div className={`min-h-screen w-full flex font-sans overflow-hidden relative transition-colors duration-300 ${darkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      
      {/* BOTÃO DE TROCA DE TEMA (DARK/LIGHT) NO CANTINHO */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className={`absolute top-5 right-5 z-50 p-2.5 rounded-full shadow-md border transition-all duration-200 flex items-center justify-center ${
          darkMode 
            ? 'bg-gray-900 border-gray-800 text-orange-400 hover:bg-gray-800' 
            : 'bg-white border-gray-200 text-orange-600 hover:bg-gray-100'
        }`}
        title={darkMode ? 'Mudar para Light Mode' : 'Mudar para Dark Mode'}
      >
        {darkMode ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Estilos CSS Inline para Animações (Bolhas dinâmicas + Brilho estilo Ultron) */}
      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(110vh) scale(0.6) translateX(0);
            opacity: 0;
          }
          20% {
            opacity: 0.8;
          }
          50% {
            transform: translateY(50vh) scale(1) translateX(15px);
            opacity: 0.5;
          }
          80% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(-20vh) scale(1.3) translateX(-15px);
            opacity: 0;
          }
        }

        @keyframes ultronPulse {
          0% {
            opacity: 0.05;
            transform: scale(1);
          }
          50% {
            opacity: 0.35;
            filter: drop-shadow(0 0 12px rgba(249, 115, 22, 0.8));
          }
          100% {
            opacity: 0.05;
            transform: scale(1);
          }
        }

        .bubble-anim {
          animation: floatUp infinite linear;
        }

        .ultron-line {
          animation: ultronPulse 4s infinite ease-in-out;
        }
      `}</style>

      {/* ---------------- ETAPA 1: TELA DIVIDIDA COM GRID E BRILHO ULTRON ---------------- */}
      {etapa === 1 ? (
        <div className="w-full flex min-h-screen">
          {/* Lado Esquerdo: Formulário */}
          <div className={`w-full lg:w-[480px] flex flex-col justify-between p-6 sm:p-10 shadow-2xl z-10 transition-colors duration-300 overflow-y-auto ${darkMode ? 'bg-gray-900 text-gray-100 border-r border-gray-800' : 'bg-white text-gray-900'}`}>
            <div className="flex flex-col items-center space-y-2 pt-2">
              <div className="w-14 h-14 rounded-full bg-orange-600 flex items-center justify-center shadow-md border-2 border-orange-500">
                <span className="text-white font-extrabold text-lg tracking-tight">CAC</span>
              </div>
              <div className="text-center">
                <h1 className={`text-xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>Calculadora de Análise de Crédito</h1>
                <p className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Acesso Restrito ao Analista</p>
              </div>
            </div>

            <div className="my-auto py-4">
              <form className="space-y-3" onSubmit={handleLogin}>
                <div className="pb-1">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-orange-600">Identificação</h2>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>E-mail</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition ${
                      darkMode 
                        ? 'bg-gray-950 border-gray-700 text-white placeholder-gray-600 focus:bg-gray-900' 
                        : 'bg-gray-50 border-gray-300 text-gray-900 focus:bg-white'
                    }`}
                    placeholder="analista@gmail.com"
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Senha</label>
                  <input
                    type="password"
                    required
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className={`w-full border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition ${
                      darkMode 
                        ? 'bg-gray-950 border-gray-700 text-white placeholder-gray-600 focus:bg-gray-900' 
                        : 'bg-gray-50 border-gray-300 text-gray-900 focus:bg-white'
                    }`}
                    placeholder="••••••••"
                  />
                </div>

                {erro && (
                  <div className={`p-2.5 rounded-lg border text-xs font-medium ${darkMode ? 'bg-red-950/50 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {erro}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={enviando}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 px-4 rounded-xl transition shadow-md hover:shadow-lg text-sm tracking-wide disabled:opacity-60 mt-2"
                >
                  {enviando ? 'Verificando...' : 'Entrar'}
                </button>
              </form>
            </div>

            <div className="text-center pt-2">
              <span className={`text-[11px] font-medium ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Kauã Braga © 2026
              </span>
            </div>
          </div>

          {/* Lado Direito: Painel Gráfico */}
          <div className={`hidden lg:flex flex-1 relative items-center justify-center p-12 overflow-hidden border-l transition-colors duration-300 ${
            darkMode 
              ? 'bg-gradient-to-br from-gray-900 via-gray-950 to-orange-950/40 border-gray-800/60' 
              : 'bg-gradient-to-br from-gray-100 via-gray-200 to-orange-100/50 border-gray-300'
          }`}>
            
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <svg className={`w-full h-full ${darkMode ? 'opacity-30' : 'opacity-20'}`} xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
                <defs>
                  <pattern id="tech-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 50" fill="none" stroke={darkMode ? "rgba(249, 115, 22, 0.25)" : "rgba(249, 115, 22, 0.35)"} strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#tech-grid)" />
              </svg>

              <div className="absolute top-1/4 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-orange-500 to-transparent ultron-line" style={{ animationDelay: '0s' }}></div>
              <div className="absolute top-2/3 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-orange-400 to-transparent ultron-line" style={{ animationDelay: '2s' }}></div>
              <div className="absolute top-0 left-1/3 w-[2px] h-full bg-gradient-to-b from-transparent via-orange-500 to-transparent ultron-line" style={{ animationDelay: '1s' }}></div>
              <div className="absolute top-0 left-2/3 w-[2px] h-full bg-gradient-to-b from-transparent via-orange-400 to-transparent ultron-line" style={{ animationDelay: '3s' }}></div>
            </div>

            <div className="relative z-10 text-center space-y-4 max-w-lg">
              <div className="inline-block px-3 py-1 bg-orange-500/15 border border-orange-500/30 rounded-full text-orange-600 dark:text-orange-400 text-xs font-semibold tracking-widest uppercase mb-2 shadow-lg shadow-orange-500/10">
                Portal do Analista
              </div>
              <h2 className={`text-5xl font-black tracking-tight drop-shadow-md ${darkMode ? 'text-white' : 'text-gray-900'}`}>BEM VINDO</h2>
              <p className={`text-base font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Calculadora e regras operacionais</p>
            </div>

            <div className="absolute bottom-8 right-12 z-10 flex items-center space-x-2 text-xs">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Algum problema?</span>
              <a href="#suporte" onClick={(e) => { e.preventDefault(); alert('Contate o suporte técnico interno.'); }} className="text-orange-600 dark:text-orange-400 font-bold hover:underline">
                Entre em contato
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* ---------------- ETAPA 2: TELA CLEAN COM BOLHAS DINÂMICAS ---------------- */
        <div className={`w-full min-h-screen relative flex items-center justify-center p-4 overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-gray-950' : 'bg-gray-100'}`}>

          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute left-[5%] w-20 h-20 rounded-full border-2 border-orange-500/40 bg-orange-500/10 shadow-[0_0_20px_rgba(249,115,22,0.15)] bubble-anim" style={{ animationDuration: '8s', animationDelay: '0s' }}></div>
            <div className="absolute left-[18%] w-12 h-12 rounded-full border border-orange-400/30 bg-orange-500/15 bubble-anim" style={{ animationDuration: '12s', animationDelay: '2s' }}></div>
            <div className="absolute left-[32%] w-28 h-28 rounded-full border-2 border-orange-500/30 bg-orange-600/10 shadow-[0_0_25px_rgba(249,115,22,0.2)] bubble-anim" style={{ animationDuration: '10s', animationDelay: '1s' }}></div>
            <div className="absolute left-[48%] w-16 h-16 rounded-full border border-orange-500/40 bg-orange-400/10 bubble-anim" style={{ animationDuration: '15s', animationDelay: '3s' }}></div>
            <div className="absolute left-[62%] w-36 h-36 rounded-full border-2 border-orange-500/25 bg-orange-500/10 shadow-[0_0_30px_rgba(249,115,22,0.1)] bubble-anim" style={{ animationDuration: '14s', animationDelay: '0.5s' }}></div>
            <div className="absolute left-[78%] w-14 h-14 rounded-full border border-orange-400/30 bg-orange-500/20 bubble-anim" style={{ animationDuration: '9s', animationDelay: '4s' }}></div>
            <div className="absolute left-[90%] w-24 h-24 rounded-full border-2 border-orange-500/35 bg-orange-600/15 shadow-[0_0_20px_rgba(249,115,22,0.15)] bubble-anim" style={{ animationDuration: '11s', animationDelay: '2.5s' }}></div>
          </div>

          <div className={`relative z-10 w-full max-w-lg backdrop-blur-md border rounded-2xl shadow-2xl p-8 sm:p-10 space-y-6 text-center animate-fadeIn transition-colors duration-300 ${
            darkMode 
              ? 'bg-gray-900/85 border-gray-800 text-gray-100' 
              : 'bg-white/90 border-gray-200 text-gray-900 shadow-xl'
          }`}>
            
            <div className="space-y-2">
              <h2 className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Olá, <span className="text-orange-500">{nomeEtapa2 || 'Analista'}</span>
              </h2>
              <p className={`text-xs sm:text-sm max-w-sm mx-auto ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Para prosseguirmos para a calculadora, por gentileza informar a sua palavra de segurança.
              </p>
            </div>

            <form onSubmit={handleVerificacao} className="space-y-4 pt-2">
              <div className="text-left space-y-1">
                <label className={`block text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Palavra de Segurança
                </label>
                <input
                  type="password"
                  required
                  value={palavraSeguranca}
                  onChange={(e) => setPalavraSeguranca(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition shadow-inner text-center tracking-widest ${
                    darkMode 
                      ? 'bg-gray-950/60 border-gray-700 text-white placeholder-gray-600' 
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                  }`}
                  placeholder="••••••••"
                />
              </div>

              {erro && (
                <div className={`p-3 rounded-lg border text-xs font-medium ${darkMode ? 'bg-red-950/50 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  {erro}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEtapa(1)}
                  className={`w-1/3 font-semibold py-3 px-4 rounded-xl transition text-xs border ${
                    darkMode 
                      ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
                  }`}
                >
                  Voltar
                </button>

                <button
                  type="submit"
                  disabled={enviando}
                  className="w-2/3 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-xl transition shadow-lg shadow-orange-900/20 text-xs tracking-wide uppercase disabled:opacity-60"
                >
                  {enviando ? 'Validando...' : 'Validar'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}