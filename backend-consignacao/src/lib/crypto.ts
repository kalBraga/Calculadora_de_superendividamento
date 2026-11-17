// lib/crypto.ts
import { createHmac } from 'crypto';
 
function getSecret(): string {
  const SECRET = process.env.REPORT_SECRET_KEY;
  if (!SECRET) throw new Error('REPORT_SECRET_KEY não definida no .env');
  return SECRET;
}
 
export function gerarHashValidacao(analiseId: string, geradoEm: string) {
  return createHmac('sha256', getSecret())
    .update(`${analiseId}:${geradoEm}`)
    .digest('hex');
}
 
export function validarHash(analiseId: string, geradoEm: string, hash: string) {
  return gerarHashValidacao(analiseId, geradoEm) === hash;
}
 