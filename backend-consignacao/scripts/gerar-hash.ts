import { hashSenha } from '../src/lib/auth';
const valor = process.argv[2];

if (!valor) {
  console.error('Uso: bun scripts/gerar-hash.ts "valor a ser hasheado"');
  process.exit(1);
}

const hash = await hashSenha(valor);
console.log(hash);