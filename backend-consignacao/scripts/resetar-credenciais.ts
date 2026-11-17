// scripts/resetar-credenciais.ts
// Uso: bun scripts/resetar-credenciais.ts "email@exemplo.com" "novaSenha" "novaPalavraSeguranca"
import { eq } from 'drizzle-orm';
import { db } from '../src/db/db';
import { usuarios } from '../src/db/schema';
import { hashSenha } from '../src/lib/auth';

const [email, novaSenha, novaPalavraSeguranca] = process.argv.slice(2);

if (!email || !novaSenha || !novaPalavraSeguranca) {
  console.error('Uso: bun scripts/resetar-credenciais.ts "email" "novaSenha" "novaPalavraSeguranca"');
  process.exit(1);
}

const senhaHash = await hashSenha(novaSenha);
const palavraSegurancaHash = await hashSenha(novaPalavraSeguranca);

const [atualizado] = await db
  .update(usuarios)
  .set({ senhaHash, palavraSegurancaHash })
  .where(eq(usuarios.email, email))
  .returning();

if (!atualizado) {
  console.error(`Nenhum usuário encontrado com o e-mail: ${email}`);
  process.exit(1);
}

console.log(`Credenciais atualizadas para: ${atualizado.nome} (${atualizado.email})`);
process.exit(0);