import { db } from './db';
import { convenios, usuarios, analisesCredito, relatorios, logsAuditoria } from './schema';
import { eq } from 'drizzle-orm';

async function runSeed() {
    if (process.env.NODE_ENV === "production") {
        throw new Error("Seed bloqueado em produção: ele apaga análises, relatórios e logs.");
    }

    // Credenciais vindas do .env (nunca fixas no código)
    const {
        SEED_ADMIN_EMAIL,
        SEED_ADMIN_PASSWORD,
        SEED_ADMIN_PALAVRA,
        SEED_ANALISTA_EMAIL,
        SEED_ANALISTA_PASSWORD,
        SEED_ANALISTA_PALAVRA,
    } = process.env;

    if (!SEED_ADMIN_EMAIL || !SEED_ADMIN_PASSWORD || !SEED_ADMIN_PALAVRA ||
        !SEED_ANALISTA_EMAIL || !SEED_ANALISTA_PASSWORD || !SEED_ANALISTA_PALAVRA) {
        throw new Error("Defina as variáveis SEED_ADMIN_* e SEED_ANALISTA_* no arquivo .env");
    }

        const jaTemAnalises = await db.select({ id: analisesCredito.id }).from(analisesCredito).limit(1);
        if (jaTemAnalises.length > 0 && !process.argv.includes("--force")) {
    throw new Error("O banco já tem análises. Rode com --force se quiser apagar tudo e recriar.");
}

    console.log("Limpando banco de dados...");
    
    // 1. Limpeza em cascata respeitando todas as dependências (Foreign Keys)
    await db.delete(logsAuditoria);       // Depende de usuarios
    await db.delete(relatorios);          // Depende de analises_credito
    await db.delete(analisesCredito);    // Depende de convenios e usuarios
    await db.delete(convenios);           // Depende de usuarios

    const senhaAdminHash = await Bun.password.hash(SEED_ADMIN_PASSWORD, { algorithm: "bcrypt", cost: 6 });
    const palavraAdminHash = await Bun.password.hash(SEED_ADMIN_PALAVRA, { algorithm: "bcrypt", cost: 6 });

    const senhaAnalistaHash = await Bun.password.hash(SEED_ANALISTA_PASSWORD, { algorithm: "bcrypt", cost: 6 });
    const palavraAnalistaHash = await Bun.password.hash(SEED_ANALISTA_PALAVRA, { algorithm: "bcrypt", cost: 6 });


    // Insere o Administrador
    await db.insert(usuarios).values({
        nome: "Administrador Master",
        email: SEED_ADMIN_EMAIL,
        senhaHash: senhaAdminHash,
        palavraSegurancaHash: palavraAdminHash,
        perfil: "ADMIN",
        ativo: true
    }).onConflictDoNothing({ target: usuarios.email });

    await db.insert(usuarios).values({
        nome: "Analista A",
        email: SEED_ANALISTA_EMAIL,
        senhaHash: senhaAnalistaHash,
        palavraSegurancaHash: palavraAnalistaHash,
        perfil: "ANALISTA",
        ativo: true
    }).onConflictDoNothing({ target: usuarios.email });

    

    // Busca o usuário no banco para garantir que temos o objeto e o ID correto para os convênios
        const [usuarioTeste] = await db.select().from(usuarios).where(eq(usuarios.email, SEED_ANALISTA_EMAIL));

    if (!usuarioTeste) {
        throw new Error("Falha ao recuperar o usuário de teste. Abortando seed.");
    } 

    console.log("Cadastrando Convênios com Motor Dinâmico...");
    await db.insert(convenios).values([
        {
            nomeOrgao: "Prefeitura Municipal de Marília",  
            criadoPor: usuarioTeste.id,         
            regrasCalculo: {
                tipoBaseCalculo: "LIQUIDO_COMPULSORIO",
                percentualEmprestimo: 0.35,
                percentualRMC: 0.10,
                percentualRCC: 0.10,
                percentualAdiantamento: 0,
                percentualSuperendividamento: 0.70 
            }
        },
        {
            nomeOrgao: "Prefeitura Municipal de Araraquara",  
            criadoPor: usuarioTeste.id,         
            regrasCalculo: {
                tipoBaseCalculo: "LIQUIDO_COMPULSORIO",
                percentualEmprestimo: 0.00,
                percentualRMC: 0.10,
                percentualRCC: 0.10,
                percentualAdiantamento: 0,
                percentualSuperendividamento: 0.70 
            }
        },
        {
            nomeOrgao: "Prefeitura Municipal de Jundiaí",  
            criadoPor: usuarioTeste.id,         
            regrasCalculo: {
                tipoBaseCalculo: "LIQUIDO_TOTAL",
                percentualEmprestimo: 0.00,
                percentualRMC: 0.05,
                percentualRCC: 0.00,
                percentualAdiantamento: 0,
                percentualSuperendividamento: 0.70 
            }
        },
        {
            nomeOrgao: "Prefeitura Municipal de Iguatemi",  
            criadoPor: usuarioTeste.id,         
            regrasCalculo: {
                tipoBaseCalculo: "LIQUIDO_TOTAL",
                percentualEmprestimo: 0.00,
                percentualRMC: 0.05,
                percentualRCC: 0.05,
                percentualAdiantamento: 0,
                percentualSuperendividamento: 0.70 
            }
        },
        {
            nomeOrgao: "Prefeitura Municipal de Novo Santo Antônio",  
            criadoPor: usuarioTeste.id,         
            regrasCalculo: {
                tipoBaseCalculo: "LIQUIDO_TOTAL",
                percentualEmprestimo: 0.30,
                percentualRMC: 0.05,
                percentualRCC: 0.10,
                percentualAdiantamento: 0,
                percentualSuperendividamento: 0.70 
            }
        },
        {
            nomeOrgao: "DAAE - Araraquara",  
            criadoPor: usuarioTeste.id,         
            regrasCalculo: {
                tipoBaseCalculo: "LIQUIDO_TOTAL",
                percentualEmprestimo: 0.00,
                percentualRMC: 0.10,
                percentualRCC: 0.10,
                percentualAdiantamento: 0,
                percentualSuperendividamento: 0.70 
            }
        },
        {
            nomeOrgao: "Seroprevi",  
            criadoPor: usuarioTeste.id,         
            regrasCalculo: {
                tipoBaseCalculo: "LIQUIDO_TOTAL",
                percentualEmprestimo: 0.00,
                percentualRMC: 0.10,
                percentualRCC: 0.10,
                percentualAdiantamento: 0,
                percentualSuperendividamento: 0.70 
            }
        },
        {
            nomeOrgao: "Prefeitura Municipal de Mirassol",  
            criadoPor: usuarioTeste.id,         
            regrasCalculo: {
                tipoBaseCalculo: "LIQUIDO_TOTAL",
                percentualEmprestimo: 0.00,
                percentualRMC: 0.05,
                percentualRCC: 0.00,
                percentualAdiantamento: 0,
                percentualSuperendividamento: 0.70 
            }
        },
        {
            nomeOrgao: "Prefeitura Municipal de Ariquemes",  
            criadoPor: usuarioTeste.id,         
            regrasCalculo: {
                tipoBaseCalculo: "LIQUIDO_TOTAL",
                percentualEmprestimo: 0.00,
                percentualRMC: 0.05,
                percentualRCC: 0.05,
                percentualAdiantamento: 0,
                percentualSuperendividamento: 0.70 
            }
        },
        {
            nomeOrgao: "Governo de Goiás",  
            criadoPor: usuarioTeste.id,         
            regrasCalculo: {
                tipoBaseCalculo: "LIQUIDO_TOTAL",
                percentualEmprestimo: 0.00,
                percentualRMC: 0.10,
                percentualRCC: 0.10,
                percentualAdiantamento: 0,
                percentualSuperendividamento: 0.35 
            }
        },
        {
            nomeOrgao: "Prefeitura Municipal de Corumbá",  
            criadoPor: usuarioTeste.id,         
            regrasCalculo: {
                tipoBaseCalculo: "LIQUIDO_TOTAL",
                percentualEmprestimo: 0.00,
                percentualRMC: 0.05,
                percentualRCC: 0.00,
                percentualAdiantamento: 0.20,
                percentualSuperendividamento: 0.70 
            }
        },
        {
            nomeOrgao: "Governo do Paraná",  
            criadoPor: usuarioTeste.id,         
            regrasCalculo: {
                tipoBaseCalculo: "LIQUIDO_COMPULSORIO",
                percentualEmprestimo: 0.00,
                percentualRMC: 0.00,
                percentualRCC: 0.10,
                percentualAdiantamento: 0,
                percentualSuperendividamento: 0.70 
            }
        },
        {
            nomeOrgao: "Prefeitura Municipal de Naviraí",  
            criadoPor: usuarioTeste.id,         
            regrasCalculo: {
                tipoBaseCalculo: "LIQUIDO_TOTAL",
                percentualEmprestimo: 0.30,
                percentualRMC: 0.00,
                percentualRCC: 0.15,
                percentualAdiantamento: 0.25,
                percentualSuperendividamento: 0.70 
            }
        },
        {
            nomeOrgao: "Prefeitura Municipal de Alto Taquari",  
            criadoPor: usuarioTeste.id,         
            regrasCalculo: {
                tipoBaseCalculo: "LIQUIDO_COMPULSORIO",
                percentualEmprestimo: 0.35,
                percentualRMC: 0.05,
                percentualRCC: 0.20,
                percentualAdiantamento: 0,
                percentualSuperendividamento: 0.70 
            }
        },
        {
            nomeOrgao: "Prefeitura Municipal de Castro Alves",  
            criadoPor: usuarioTeste.id,         
            regrasCalculo: {
                tipoBaseCalculo: "LIQUIDO_TOTAL",
                percentualEmprestimo: 0.40,
                percentualRMC: 0.05,
                percentualRCC: 0.00,
                percentualAdiantamento: 0,
                percentualSuperendividamento: 0.70 
            }
        },
        {
            nomeOrgao: "IPREMM - Previdência de Marília",  
            criadoPor: usuarioTeste.id,         
            regrasCalculo: {
                tipoBaseCalculo: "LIQUIDO_COMPULSORIO",
                percentualEmprestimo: 0.35,
                percentualRMC: 0.10,
                percentualRCC: 0.10,
                percentualAdiantamento: 0,
                percentualSuperendividamento: 0.70 
            }
        },
        {
            nomeOrgao: "Governo do Tocantins",  
            criadoPor: usuarioTeste.id,         
            regrasCalculo: {
                tipoBaseCalculo: "LIQUIDO_TOTAL",
                percentualEmprestimo: 0.00,
                percentualRMC: 0.00,
                percentualRCC: 0.10,
                percentualAdiantamento: 0,
                percentualSuperendividamento: 0.70 
            }
        },
        {
            nomeOrgao: "Prefeitura Municipal de Valentim Gentil",  
            criadoPor: usuarioTeste.id,         
            regrasCalculo: {
                tipoBaseCalculo: "LIQUIDO_TOTAL",
                percentualEmprestimo: 0.00,
                percentualRMC: 0.10,
                percentualRCC: 0.00,
                percentualAdiantamento: 0,
                percentualSuperendividamento: 0.70 
            }
        },
        {
            nomeOrgao: "Governo do Rio Grande do Norte",  
            criadoPor: usuarioTeste.id,         
            regrasCalculo: {
                tipoBaseCalculo: "LIQUIDO_TOTAL",
                percentualEmprestimo: 0.00,
                percentualRMC: 0.00,
                percentualRCC: 0.10,
                percentualAdiantamento: 0,
                percentualSuperendividamento: 0.70 
            }
        },
        {
            nomeOrgao: "Prefeitura Municipal de Jacuípe",  
            criadoPor: usuarioTeste.id,         
            regrasCalculo: {
                tipoBaseCalculo: "LIQUIDO_TOTAL",
                percentualEmprestimo: 0.00,
                percentualRMC: 0.35,
                percentualRCC: 0.00,
                percentualAdiantamento: 0,
                percentualSuperendividamento: 0.70 
            }
        }
    ]);

    console.log("Seeds plantados com sucesso! Banco pronto para a operação.");
}

runSeed().catch((err) => {
    console.error("Erro ao plantar os seeds:", err);
    process.exit(1);
});
