CREATE TABLE "relatorios" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "analise_id" uuid NOT NULL,
    "hash_validacao" varchar(64) NOT NULL,
    "caminho_arquivo" text DEFAULT 'memory-stream' NOT NULL,
    "gerado_em" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "relatorios_hash_validacao_unique" UNIQUE("hash_validacao")
);
--> statement-breakpoint
ALTER TABLE "relatorios" ADD CONSTRAINT "relatorios_analise_id_analises_credito_id_fk" FOREIGN KEY ("analise_id") REFERENCES "public"."analises_credito"("id") ON DELETE no action ON UPDATE no action;