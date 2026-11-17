import { 
  pgTable, 
  uuid, 
  varchar, 
  text, 
  timestamp, 
  boolean, 
  jsonb, 
  pgEnum 
} from 'drizzle-orm/pg-core';

export const perfilEnum = pgEnum('perfil', ['ADMIN', 'ANALISTA']);
export const resultadoEnum = pgEnum('resultado', ['APROVADO', 'RECUSADO']);

export const usuarios = pgTable('usuarios', {
  id: uuid('id').defaultRandom().primaryKey(),
  nome: varchar('nome', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  senhaHash: varchar('senha_hash', { length: 255 }).notNull(),
  palavraSegurancaHash: varchar('palavra_seguranca_hash', { length: 255 }).notNull(),
  perfil: perfilEnum('perfil').default('ANALISTA').notNull(),
  ativo: boolean('ativo').default(true).notNull(),
  criadoEm: timestamp('criado_em').defaultNow().notNull(),
});

export const convenios = pgTable('convenios', {
  id: uuid('id').defaultRandom().primaryKey(),
  nomeOrgao: varchar('nome_orgao', { length: 255 }).notNull(),
  regrasCalculo: jsonb('regras_calculo').notNull(), 
  criadoPor: uuid('criado_por').references(() => usuarios.id),
  atualizadoEm: timestamp('atualizado_em').defaultNow().notNull(),
});

export const analisesCredito = pgTable('analises_credito', {
  id: uuid('id').defaultRandom().primaryKey(),
  analistaId: uuid('analista_id').references(() => usuarios.id).notNull(),
  convenioId: uuid('convenio_id').references(() => convenios.id).notNull(),
  nomeCliente: varchar('nome_cliente', { length: 88 }).notNull(),
  dadosProposta: jsonb('dados_proposta').notNull(), 
  resultado: resultadoEnum('resultado').notNull(),
  laudoCompleto: jsonb('laudo_completo').notNull(),
  motivoRecusa: text('motivo_recusa'),
  pdfGerado: boolean('pdf_gerado').default(false).notNull(),
  dataAnalise: timestamp('data_analise').defaultNow().notNull(),
});

export const logsAuditoria = pgTable('logs_auditoria', {
  id: uuid('id').defaultRandom().primaryKey(),
  adminId: uuid('admin_id').references(() => usuarios.id).notNull(),
  acao: varchar('acao', { length: 255 }).notNull(),
  tabelaAfetada: varchar('tabela_afetada', { length: 255 }).notNull(),
  registroAfetadoId: varchar('registro_afetado_id', { length: 255 }).notNull(),
  detalhes: text('detalhes'),
  dataHora: timestamp('data_hora').defaultNow().notNull(),
});

export const relatorios = pgTable('relatorios', {
  id: uuid('id').defaultRandom().primaryKey(),
  analiseId: uuid('analise_id').references(() => analisesCredito.id).notNull(),
  hashValidacao: varchar('hash_validacao', { length: 64 }).notNull().unique(),
  geradoEm: timestamp('gerado_em').defaultNow().notNull(),
});