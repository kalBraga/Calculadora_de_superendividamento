export function processarAnalise(dadosProposta: any, regrasConvenio: any){
     const { tipoOperacao } = dadosProposta;

// =======================================================
// CONVERSÃO E VALIDAÇÃO DAS ENTRADAS
// (evita NaN, texto concatenando em vez de somar e valores negativos)
// =======================================================
const num = (valor: any, campo: string, obrigatorio = false): number => {
    if (valor === undefined || valor === null || valor === "") {
        if (obrigatorio) throw new Error(`Campo obrigatório não informado: ${campo}.`);
        return 0;
    }
    const n = Number(valor);
    if (!Number.isFinite(n) || n < 0) throw new Error(`Valor inválido no campo ${campo}.`);
    return n;
};

const salarioFixo = num(dadosProposta.salarioFixo, "salarioFixo");
const outrosProventos = num(dadosProposta.outrosProventos, "outrosProventos");
const descontosCompulsorios = num(dadosProposta.descontosCompulsorios, "descontosCompulsorios");
const descontosFacultativos = num(dadosProposta.descontosFacultativos, "descontosFacultativos");
const emprestimosAtivos = num(dadosProposta.emprestimosAtivos, "emprestimosAtivos");
const descontoRMC = num(dadosProposta.descontoRMC, "descontoRMC");
const descontoRCC = num(dadosProposta.descontoRCC, "descontoRCC");
const valorNovaParcela = num(dadosProposta.valorNovaParcela, "valorNovaParcela", true);

if (valorNovaParcela <= 0) {
    throw new Error("O valor da nova parcela deve ser maior que zero.");
}

// compara dinheiro em centavos pra não errar por ponto flutuante (ex: 787.6499999 vs 787.65)
const centavos = (valor: number) => Math.round(valor * 100);

// soma do liquido bruto, quanto o cliente realmente recebe 
const rendaBrutaTotal = salarioFixo + outrosProventos;

if (rendaBrutaTotal <= 0) {
    throw new Error("A renda bruta deve ser maior que zero.");
}

const regras = regrasConvenio.regrasCalculo || regrasConvenio;

// =======================================================
// TRAVA DE SEGURANÇA: Validação de Modalidade do Convênio
// =======================================================
const operacoesValidas = ["RMC", "RCC", "EMPRESTIMO", "CONSIGNADO"];
if (!operacoesValidas.includes(tipoOperacao)) {
    throw new Error(`Tipo de operação inválida ou não suportada: "${tipoOperacao}".`);
}

// o "!" pega tanto 0 quanto campo ausente
if (tipoOperacao === "RMC" && !regras.percentualRMC) {
    throw new Error("Este convênio não opera com Cartão RMC. A modalidade está desativada para este órgão.");
}
if (tipoOperacao === "RCC" && !regras.percentualRCC) {
    throw new Error("Este convênio não opera com Cartão RCC. A modalidade está desativada para este órgão.");
}
if ((tipoOperacao === "EMPRESTIMO" || tipoOperacao === "CONSIGNADO") && !regras.percentualEmprestimo) {
    throw new Error("Este convênio não opera com Empréstimo Consignado convencional.");
}

// =====================================
// MARGEM DE SEGURANÇA (Adiantamento)
// =====================================
// Definido antes para poder abater da renda base de cálculo do superendividamento
const pctAdiantamento = regras.percentualAdiantamento ?? 0;
const valorAdiantamentoProjetado = rendaBrutaTotal * pctAdiantamento;

// =====================================================================
// AS BASES DE CÁLCULO PARA MARGEM (Se aparecer algo diferente é aqui)
// =====================================================================
let baseCalculo = 0;

const regraBase = regras.tipoBaseCalculo || "LIQUIDO_COMPULSORIO";

if (regraBase === "BRUTO"){
    baseCalculo = rendaBrutaTotal;
} else if (regraBase === "LIQUIDO_TOTAL"){
    baseCalculo = rendaBrutaTotal - descontosCompulsorios - descontosFacultativos;
} else {
    baseCalculo = rendaBrutaTotal - descontosCompulsorios;
}

// =====================================================================================================
// AS "CAIXINHAS" DE MARGEM (calculadas sobre as bases criadas acima buscando os % no banco de dados)
// ======================================================================================================
const pctEmprestimo = regras.percentualEmprestimo || 0;
const pctRMC =  regras.percentualRMC || 0;
const pctRCC = regras.percentualRCC || 0;

const margemLivreEmprestimo = (baseCalculo * pctEmprestimo) - emprestimosAtivos;
const margemLivreRMC = (baseCalculo * pctRMC) - descontoRMC;
const margemLivreRCC = (baseCalculo * pctRCC) - descontoRCC;

// =======================================================
// Onde o sistema vai saber qual operação vai ser digitada
// (fica aqui em cima porque o teto da parcela precisa da margemAlvo)
// =======================================================
let margemAlvo = 0;
let nomeOperacao = "";

if (tipoOperacao === "RMC") {
    margemAlvo = margemLivreRMC;
    nomeOperacao = "Cartão RMC";
} 
else if (tipoOperacao === "RCC") {
    margemAlvo = margemLivreRCC;
    nomeOperacao = "Cartão RCC";
} 
else {
    // EMPRESTIMO ou CONSIGNADO (o tipo já foi validado no começo da função)
    margemAlvo = margemLivreEmprestimo;
    nomeOperacao = "Empréstimo";
}

// =========================
//  GRAU DE COMPROMETIMENTO
// =========================
const pctGlobalConvenio = pctEmprestimo + pctRMC + pctRCC;

// ==================================
// Regra Superendividamento dinâmico
// ==================================
const pctSuperendividamento = regras.percentualSuperendividamento ?? 0.70;
const rendaBruta = rendaBrutaTotal - valorAdiantamentoProjetado;
if (rendaBruta <= 0) {
    throw new Error("Renda insuficiente para análise após o adiantamento salarial.");
}
const limiteSuperendividamento = Number((rendaBruta * pctSuperendividamento).toFixed(2));

// Ele não é um gasto/desconto, ele apenas reduziu a renda base acima.
const descontosAtuaisParaSuper = descontosCompulsorios +
                                descontosFacultativos +
                                emprestimosAtivos +
                                descontoRMC + 
                                descontoRCC;

// agora soma o comprometimento atual com a nova parcela.
const totalDescontosFuturos = Number((descontosAtuaisParaSuper + valorNovaParcela).toFixed(2));
const grauAtualSuper = (descontosAtuaisParaSuper / rendaBruta) * 100;
const grauFuturoSuper = (totalDescontosFuturos / rendaBruta) * 100;

// ===========================
// Regra do Líquido Mínimo
// ===========================
const minimoExigido = regras.liquidoMinimo ?? 1000;
const liquidoRestante = rendaBruta - totalDescontosFuturos;

// =========================================================================
// CÁLCULO UNIFICADO DOS TETOS (O menor valor entre as regras restritivas)
// =========================================================================
const maxParcelaSuper = limiteSuperendividamento - descontosAtuaisParaSuper;
// Quanto sobra acima dos 1000 reais atuais sem nenhuma parcela nova
const liquidoAtualDisponivel = (rendaBruta - descontosAtuaisParaSuper) - minimoExigido;

// A parcela máxima permitida deve respeitar TODAS as travas simultaneamente
// (superendividamento, líquido mínimo e a margem da própria modalidade)
const parcelaMaximaPermitida = Number(
    Math.max(0, Math.min(maxParcelaSuper, liquidoAtualDisponivel, margemAlvo)).toFixed(2)
);

// Identifica quais regras foram violadas (em centavos)
const violaSuperendividamento = centavos(totalDescontosFuturos) > centavos(limiteSuperendividamento);
const violaLiquidoMinimo = centavos(liquidoRestante) < centavos(minimoExigido);

if (violaSuperendividamento || violaLiquidoMinimo) {
    let motivos: string[] = [];

    if (violaSuperendividamento) {
        motivos.push(`Superendividamento. Servidor já possui ${grauAtualSuper.toFixed(1)}% de endividamento. Com a parcela, ficaria ${grauFuturoSuper.toFixed(1)}%, extrapolando o limite de ${(pctSuperendividamento * 100).toFixed(0)}% do convênio.`);
    }

    if (violaLiquidoMinimo) {
        motivos.push(`Salário Líquido insuficiente. Após descontos, restará R$ ${liquidoRestante.toFixed(2)} (Mínimo: R$ ${minimoExigido.toFixed(2)}).`);
    }

    let mensagemUpsell = "";
    if (parcelaMaximaPermitida > 0) {
        mensagemUpsell = `Para se enquadrar nas regras do convênio e do salário líquido mínimo, o valor máximo de parcela permitido é de R$ ${parcelaMaximaPermitida.toFixed(2)}.`;
    } else {
        mensagemUpsell = `O servidor já atingiu ou ultrapassou os limites operacionais permitidos antes mesmo desta proposta.`;
    }
return {
        resultado: "RECUSADO",
        motivo: `${motivos.join(" ")} ${mensagemUpsell}`,
        margemReversa: 0,
        detalhesMargem: { livreEmprestimo: margemLivreEmprestimo, livreRMC: margemLivreRMC, livreRCC: margemLivreRCC },
        pctGlobalConvenio: Number((pctGlobalConvenio * 100).toFixed(2)),
        pctAdiantamento: Number((pctAdiantamento * 100).toFixed(2)),
        valorAdiantamentoProjetado: Number(valorAdiantamentoProjetado.toFixed(2)),
        grauAtualSuper: Number(grauAtualSuper.toFixed(2)),
        grauFuturoSuper: Number(grauFuturoSuper.toFixed(2)),
        limiteSuperendividamento: Number(limiteSuperendividamento.toFixed(2)),
        upsell: parcelaMaximaPermitida > 0
            ? { disponivel: true, parcelaMaximaPermitida: parcelaMaximaPermitida }
            : { disponivel: false, parcelaMaximaPermitida: 0 }
    };
}

// ==========================================
// Validação da Parcela na Caixinha Dinâmica
// ==========================================
if (centavos(valorNovaParcela) > centavos(margemAlvo)){
    return{
        resultado: "RECUSADO",
        motivo: `Parcela (R$ ${valorNovaParcela.toFixed(2)}) excede a margem de ${nomeOperacao} disponível (R$ ${margemAlvo.toFixed(2)}).`,
        margemReversa: 0,
        detalhesMargem: { livreEmprestimo: margemLivreEmprestimo, livreRMC: margemLivreRMC, livreRCC: margemLivreRCC },
        pctGlobalConvenio: Number((pctGlobalConvenio * 100).toFixed(2)),
        pctAdiantamento: Number((pctAdiantamento * 100).toFixed(2)),
        valorAdiantamentoProjetado: Number(valorAdiantamentoProjetado.toFixed(2)),
        grauAtualSuper: Number(grauAtualSuper.toFixed(2)),
        grauFuturoSuper: Number(grauFuturoSuper.toFixed(2)),
        limiteSuperendividamento: Number(limiteSuperendividamento.toFixed(2)),
        upsell: parcelaMaximaPermitida > 0
            ? { disponivel: true, parcelaMaximaPermitida: parcelaMaximaPermitida }
            : { disponivel: false, parcelaMaximaPermitida: 0 }
    };
}

// Upsell Dinâmico pra converter as recusas 
// usa o teto unificado, e não só a margem da modalidade
const margemReversa = Math.max(0, parcelaMaximaPermitida - valorNovaParcela);
    return{
        resultado: "APROVADO",
        motivo: `Aprovado para ${nomeOperacao}. Comprometimento global da base: ${grauFuturoSuper.toFixed(1)}%.`,
        margemReversa: Number(margemReversa.toFixed(2)),
        detalhesMargem: {
            livreEmprestimo: Number(margemLivreEmprestimo.toFixed(2)),
            livreRMC: Number(margemLivreRMC.toFixed(2)),
            livreRCC: Number(margemLivreRCC.toFixed(2))
        },
        pctGlobalConvenio: Number((pctGlobalConvenio * 100).toFixed(2)),
        pctAdiantamento: Number((pctAdiantamento * 100).toFixed(2)),
        valorAdiantamentoProjetado: Number(valorAdiantamentoProjetado.toFixed(2)),
        grauAtualSuper: Number(grauAtualSuper.toFixed(2)),
        grauFuturoSuper: Number(grauFuturoSuper.toFixed(2)),
        limiteSuperendividamento: Number(limiteSuperendividamento.toFixed(2)),
        upsell: margemReversa > 0
            ? { disponivel: true, parcelaMaximaPermitida: parcelaMaximaPermitida }
            : { disponivel: false, parcelaMaximaPermitida: 0 }
    };
}