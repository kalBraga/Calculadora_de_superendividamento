import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';

export interface UsuarioToken {
  id: string;
  perfil: 'ADMIN' | 'ANALISTA';
}

function getJwtSecret(): string {
  const SECRET = Bun.env.JWT_SECRET;
  if (!SECRET) throw new Error('JWT_SECRET não definida no .env');
  return SECRET;
}

export const authPlugin = new Elysia({ name: 'auth-plugin' })
  .use(jwt({ name: 'jwt', secret: getJwtSecret(), exp: '8h' }))
  .derive({ as: 'scoped' }, async ({ jwt, headers }) => {
    const authHeader = headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return { usuario: null as UsuarioToken | null };
    }
    const token = authHeader.slice(7);
    const payload = await jwt.verify(token);
    if (!payload) return { usuario: null as UsuarioToken | null };
    return { usuario: payload as unknown as UsuarioToken };
  });

export function requireAuth({ usuario, set }: { usuario: UsuarioToken | null; set: any }) {
  if (!usuario) {
    set.status = 401;
    return { erro: 'Não autenticado. Faça login novamente.' };
  }
}

export function requireAdmin({ usuario, set }: { usuario: UsuarioToken | null; set: any }) {
  if (!usuario) {
    set.status = 401;
    return { erro: 'Não autenticado. Faça login novamente.' };
  }
  if (usuario.perfil !== 'ADMIN') {
    set.status = 403;
    return { erro: 'Acesso restrito a administradores.' };
  }
}