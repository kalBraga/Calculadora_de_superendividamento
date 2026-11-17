const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

let onSessaoExpirada: (() => void) | null = null;

export function registrarHandlerSessaoExpirada(handler: () => void) {
  onSessaoExpirada = handler;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
 
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
 
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
 
  if (response.status === 401) {
    // Sessão inválida ou expirada: limpa e avisa o AuthContext.
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    onSessaoExpirada?.();
  }
 
  return response;
}
 