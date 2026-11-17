import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import Login from '../pages/Login';
 
interface Props {
  children: ReactNode;
  somenteAdmin?: boolean;
}
 
export default function RotaProtegida({ children, somenteAdmin = false }: Props) {
  const { usuario, carregando } = useAuth();
 
  // Evita "piscar" a tela de login antes de terminar de checar o localStorage
  if (carregando) return null;
 
  if (!usuario) return <Login />;
 
  if (somenteAdmin && usuario.perfil !== 'ADMIN') {
    return <p style={{ padding: 24 }}>Acesso restrito a administradores.</p>;
  }
 
  return <>{children}</>;
}
 