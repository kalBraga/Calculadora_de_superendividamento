// frontend-consignacao/src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiFetch, registrarHandlerSessaoExpirada } from '../lib/apiFetch';

interface Usuario {
  id: string;
  nome: string;
  perfil: 'ADMIN' | 'ANALISTA';
}

interface AuthContextType {
  usuario: Usuario | null;
  carregando: boolean;
  nomeEtapa2: string | null;
  loginEtapa1: (email: string, senha: string) => Promise<{ sucesso: boolean; erro?: string }>; 
  loginEtapa2: (palavraSeguranca: string) => Promise<{ sucesso: boolean; erro?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [nomeEtapa2, setNomeEtapa2] = useState<string | null>(null);

  // Token temporário da etapa 1: fica em sessionStorage (não localStorage).
  // Diferença chave: sessionStorage sobrevive a um recarregamento de página
  // (importante porque o Vite, em ambientes como Codespaces, às vezes força
  // um reload completo quando a conexão de hot-reload cai) mas some sozinho
  // ao fechar a aba — diferente do localStorage, que persistiria "para sempre".
  const [tokenTemporario, setTokenTemporarioState] = useState<string | null>(
    () => sessionStorage.getItem('tokenTemporario')
  );

  function setTokenTemporario(valor: string | null) {
    if (valor) {
      sessionStorage.setItem('tokenTemporario', valor);
    } else {
      sessionStorage.removeItem('tokenTemporario');
    }
    setTokenTemporarioState(valor);
  }

  // Ao carregar a página (ou dar F5), recupera a sessão completa já salva
  useEffect(() => {
    const usuarioSalvo = localStorage.getItem('usuario');
    const token = localStorage.getItem('token');
    if (usuarioSalvo && token) {
      setUsuario(JSON.parse(usuarioSalvo));
    }

    const nomeSalvo = sessionStorage.getItem('nomeEtapa2');
    if (nomeSalvo) setNomeEtapa2(nomeSalvo);

    setCarregando(false);
  }, []);

  // Registra o callback que o apiFetch chama quando recebe 401
  useEffect(() => {
    registrarHandlerSessaoExpirada(() => {
      setUsuario(null);
    });
  }, []);

  async function loginEtapa1(email: string, senha: string) {
    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, senha }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { sucesso: false, erro: data.erro ?? 'Credenciais inválidas.' };
      }

      setTokenTemporario(data.token);
      sessionStorage.setItem('nomeEtapa2', data.usuario?.nome ?? data.nome);
      setNomeEtapa2(data.usuario?.nome ?? data.nome);
      return { sucesso: true };
    } catch {
      return { sucesso: false, erro: 'Não foi possível conectar ao servidor.' };
    }
  }

  async function loginEtapa2(palavraSeguranca: string) {
    if (!tokenTemporario) {
      return { sucesso: false, erro: 'Sessão de login expirada. Comece novamente.' };
    }

    try {
      // Chamada direta (não via apiFetch): aqui o Authorization precisa ser
      // o tokenTemporario da etapa 1, não o token completo do localStorage.
      const res = await fetch(`${API_URL}/auth/verificar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenTemporario}`,
        },
        body: JSON.stringify({ palavraSeguranca }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { sucesso: false, erro: data.erro ?? 'Palavra de segurança incorreta.' };
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      setUsuario(data.usuario);

      setTokenTemporario(null);
      sessionStorage.removeItem('nomeEtapa2');
      setNomeEtapa2(null);

      return { sucesso: true };
    } catch {
      return { sucesso: false, erro: 'Não foi possível conectar ao servidor.' };
    }
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    sessionStorage.removeItem('tokenTemporario');
    sessionStorage.removeItem('nomeEtapa2');
    setUsuario(null);
    setTokenTemporario(null);
    setNomeEtapa2(null);
  }

  return (
    <AuthContext.Provider
      value={{ usuario, carregando, nomeEtapa2, loginEtapa1, loginEtapa2, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa ser usado dentro de um AuthProvider');
  return context;
}