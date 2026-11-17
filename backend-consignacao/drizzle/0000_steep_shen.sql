CREATE TYPE "public"."perfil" AS ENUM('ADMIN', 'ANALISTA');--> statement-breakpoint
CREATE TYPE "public"."resultado" AS ENUM('APROVADO', 'RECUSADO');--> statement-breakpoint
CREATE TABLE "analises_credito" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analista_id" uuid NOT NULL,
	"convenio_id" uuid NOT NULL,
	"nome_cliente" varchar(88) NOT NULL,
	"dados_proposta" jsonb NOT NULL,
	"resultado" "resultado" NOT NULL,
	"laudo_completo" jsonb NOT NULL,
	"motivo_recusa" text,
	"pdf_gerado" boolean DEFAULT false NOT NULL,
	"data_analise" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "convenios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome_orgao" varchar(255) NOT NULL,
	"regras_calculo" jsonb NOT NULL,
	"criado_por" uuid,
	"atualizado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "logs_auditoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"acao" varchar(255) NOT NULL,
	"tabela_afetada" varchar(255) NOT NULL,
	"registro_afetado_id" varchar(255) NOT NULL,
	"detalhes" text,
	"data_hora" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"senha_hash" varchar(255) NOT NULL,
	"palavra_seguranca_hash" varchar(255) NOT NULL,
	"perfil" "perfil" DEFAULT 'ANALISTA' NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "analises_credito" ADD CONSTRAINT "analises_credito_analista_id_usuarios_id_fk" FOREIGN KEY ("analista_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analises_credito" ADD CONSTRAINT "analises_credito_convenio_id_convenios_id_fk" FOREIGN KEY ("convenio_id") REFERENCES "public"."convenios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "convenios" ADD CONSTRAINT "convenios_criado_por_usuarios_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logs_auditoria" ADD CONSTRAINT "logs_auditoria_admin_id_usuarios_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;