// lib/auditoria.ts
import { db } from '../db/db';
import { logsAuditoria } from '../db/schema';

export async function registrarLog(params: {
  adminId: string;
  acao: string;
  tabelaAfetada: string;
  registroAfetadoId: string;
  detalhes?: string;
}) {
  await db.insert(logsAuditoria).values(params);
}