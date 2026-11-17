import { Elysia, t } from 'elysia';
import { eq, desc } from 'drizzle-orm';
import { db } from './db/db';
import { convenios, analisesCredito, usuarios, relatorios, logsAuditoria } from './db/schema';
import { processarAnalise } from './calculadora';
import { cors } from '@elysiajs/cors';
import { gerarHashValidacao } from './lib/crypto';
import { gerarRelatorioPDF } from './lib/pdf';
import { registrarLog } from './lib/auditoria';
import { hashSenha, verificarSenha } from './lib/auth';
import { authPlugin, requireAuth, requireAdmin } from './lib/authPlugin';

const app = new Elysia()
    // Configuração de CORS
    .use(cors({
      origin: true, 
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }))
    // Plugin de Autenticação (Garante o tipo do JWT e do usuário)
    .use(authPlugin);

// Agrupando as rotas para manter a inferência de tipos limpa e organizada
app.get('/', () => 'API da RC Card rodando com sucesso!');

app.get('/teste-banco', async () => {
    return { status: 'conectado', convenios: await db.select().from(convenios) }; 
});

// ==========================================
// AUTENTICAÇÃO
// ==========================================

app.post('/auth/login', async ({ body, jwt, set }) => {
    try {
        console.log("-> 1. Chegou requisição:", body.email);
        const { email, senha } = body;

        const [usuario] = await db.select().from(usuarios).where(eq(usuarios.email, email));
        console.log("-> 2. Resultado do banco:", usuario);

        if (!usuario || !usuario.ativo) {
            set.status = 401;
            return { erro: 'Credenciais inválidas.' };
        }

        const senhaValida = await verificarSenha(senha, usuario.senhaHash);
        console.log("-> 3. Senha válida?", senhaValida);

        if (!senhaValida) {
            set.status = 401;
            return { erro: 'Credenciais inválidas.' };
        }

        const token = await jwt.sign({ id: usuario.id, perfil: usuario.perfil });
        console.log("-> 4. Token gerado!");

        return {
            token,
            usuario: { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil }
        };
    } catch (erro) {
        console.error("🔥 ERRO FATAL NO LOGIN:", erro);
        set.status = 500;
        return { erro: 'Erro interno no servidor.' };
    }
}, {
    body: t.Object({
        email: t.String(),
        senha: t.String()
    })
});

app.post('/auth/verificar', async ({ body, headers, jwt, set }) => {
    const authHeader = headers['authorization'];
    const tokenTemporario = authHeader && authHeader.split(' ')[1];

    if (!tokenTemporario) {
        set.status = 401;
        return { erro: 'Token temporário ausente.' };
    }

    const payload = await jwt.verify(tokenTemporario);
    if (!payload) {
        set.status = 401;
        return { erro: 'Token temporário inválido ou expirado.' };
    }

    const { palavraSeguranca } = body as { palavraSeguranca: string };

    const [usuario] = await db.select().from(usuarios).where(eq(usuarios.id, payload.id as string));

    if (!usuario) {
        set.status = 401;
        return { erro: 'Usuário não encontrado.' };
    }

    const palavraValida = await verificarSenha(palavraSeguranca, usuario.palavraSegurancaHash);

    if (!palavraValida) {
        set.status = 401;
        return { erro: 'Palavra de segurança incorreta.' };
    }

    const tokenDefinitivo = await jwt.sign({ id: usuario.id, perfil: usuario.perfil });

    return {
        sucesso: true,
        token: tokenDefinitivo,
        usuario: { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil }
    };
}, {
    body: t.Object({
        palavraSeguranca: t.String()
    })
});

app.post('/auth/registrar', async ({ body, set }) => {
    const { nome, email, senha, palavraSeguranca, perfil } = body;

    const existente = await db.select().from(usuarios).where(eq(usuarios.email, email));
    if (existente.length > 0) {
        set.status = 409;
        return { erro: 'E-mail já cadastrado.' };
    }

    const senhaHash = await hashSenha(senha);
    const palavraSegurancaHash = await hashSenha(palavraSeguranca);

    const [novoUsuario] = await db.insert(usuarios).values({
        nome,
        email,
        senhaHash,
        palavraSegurancaHash,
        perfil: perfil ?? 'ANALISTA'
    }).returning();

    return { sucesso: true, usuarioId: novoUsuario?.id };
}, {
    beforeHandle: [requireAdmin],
    body: t.Object({
        nome: t.String(),
        email: t.String(),
        senha: t.String(),
        palavraSeguranca: t.String(),
        perfil: t.Optional(t.Union([t.Literal('ADMIN'), t.Literal('ANALISTA')]))
    })
});


// ==========================================
// ROTAS DE NEGÓCIO
// ==========================================

app.get('/analises/historico', async () => {
    return await db
        .select()
        .from(analisesCredito)
        .orderBy(desc(analisesCredito.dataAnalise)); 
}, {
    beforeHandle: [requireAuth]
});

app.get('/convenios', async () => await db.select().from(convenios), {
    beforeHandle: [requireAuth]
});

app.get('/logs', async () => await db.select().from(logsAuditoria), {
    beforeHandle: [requireAdmin]
});

app.post('/analises/processar', async ({ body, usuario, set }) => {
    try {
        const analistaId = usuario!.id;
        const { nomeCliente, convenioId, dadosProposta } = body;

        const [convenio] = await db.select().from(convenios).where(eq(convenios.id, convenioId));
        
        if (!convenio) {
            set.status = 404;
            return { erro: 'Convênio não encontrado.' };
        }
        
        const analise = processarAnalise(dadosProposta, convenio.regrasCalculo as any);

        const [registro] = await db.insert(analisesCredito).values({
            analistaId: analistaId,
            convenioId: convenioId,
            nomeCliente: nomeCliente,
            dadosProposta: dadosProposta,
            laudoCompleto: analise,
            resultado: analise.resultado as "APROVADO" | "RECUSADO",
            motivoRecusa: analise.motivo,
            pdfGerado: false
        }).returning();

        await registrarLog({
            adminId: analistaId,
            acao: 'PROCESSAR_ANALISE',
            tabelaAfetada: 'analises_credito',
            registroAfetadoId: registro!.id,
            detalhes: `Análise processada para ${nomeCliente}: ${analise.resultado}`,
        });

        return { sucesso: true, registroId: registro?.id, laudo: analise };

    } catch (error: any) {
        console.error("Erro ao processar análise:", error);
        
        set.status = 400;
        
        const mensagemErro = error.message || 'Falha interna ao processar a análise';

        return { 
            erro: mensagemErro,
            mensagem: mensagemErro,
            message: mensagemErro
        };
    }
}, { 
    beforeHandle: [requireAuth],
    body: t.Object({
        convenioId: t.String(),
        nomeCliente: t.String(),
        dadosProposta: t.Object({
            salarioFixo: t.Number(),
            outrosProventos: t.Optional(t.Number()),
            descontosCompulsorios: t.Number(),
            descontosFacultativos: t.Optional(t.Number()),
            emprestimosAtivos: t.Optional(t.Number()),
            descontoRMC: t.Optional(t.Number()), 
            descontoRCC: t.Optional(t.Number()), 
            tipoOperacao: t.Union([
                t.Literal('EMPRESTIMO'),
                t.Literal('RMC'),
                t.Literal('RCC')  
            ]), 
            valorNovaParcela: t.Number(),        
        })
    })
});

app.post('/analises/:id/relatorio', async ({ params, usuario, set }) => {
    // 1. Busca a análise fazendo LEFT JOIN com a tabela de convênios para trazer o 'nomeOrgao'
    const [analiseComOrgao] = await db
        .select({
            id: analisesCredito.id,
            analistaId: analisesCredito.analistaId,
            convenioId: analisesCredito.convenioId,
            nomeCliente: analisesCredito.nomeCliente,
            dadosProposta: analisesCredito.dadosProposta,
            resultado: analisesCredito.resultado,
            laudoCompleto: analisesCredito.laudoCompleto,
            motivoRecusa: analisesCredito.motivoRecusa,
            pdfGerado: analisesCredito.pdfGerado,
            dataAnalise: analisesCredito.dataAnalise,
            nomeOrgao: convenios.nomeOrgao, // <-- Traz o nome diretamente da tabela convenios
        })
        .from(analisesCredito)
        .leftJoin(convenios, eq(analisesCredito.convenioId, convenios.id))
        .where(eq(analisesCredito.id, params.id))
        .limit(1);

    if (!analiseComOrgao) {
        set.status = 404;
        return { erro: 'Análise não encontrada.' };
    }

    const geradoEm = new Date().toISOString();
    const hash = gerarHashValidacao(analiseComOrgao.id, geradoEm);
    
    // 2. Passa o objeto completo contendo o 'nomeOrgao' para a função do PDF
    const pdfBytes = await gerarRelatorioPDF(analiseComOrgao, hash);

    const [registroRelatorio] = await db.insert(relatorios).values({
        analiseId: analiseComOrgao.id,
        hashValidacao: hash,
    }).returning();

    await db.update(analisesCredito).set({ pdfGerado: true }).where(eq(analisesCredito.id, analiseComOrgao.id));

    await registrarLog({
        adminId: usuario!.id,
        acao: 'GERAR_RELATORIO_PDF',
        tabelaAfetada: 'relatorios',
        registroAfetadoId: registroRelatorio!.id,
        detalhes: `Relatório gerado com hash ${hash}`,
    });

    return new Response(pdfBytes, {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="laudo-${analiseComOrgao.id}.pdf"`,
        },
    });
}, {
    beforeHandle: [requireAuth],
    params: t.Object({ id: t.String() })
});

app.listen({
    port: 3000,
    hostname: '0.0.0.0'
});

console.log(`Servidor operando na porta ${app.server?.port}`);