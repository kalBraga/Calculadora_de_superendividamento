import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'node:fs';
import path from 'node:path';

export async function gerarRelatorioPDF(registro: any, hash: string) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 (Largura: 595, Altura: 842)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const dados = registro.dadosProposta || {};
  const laudo = registro.laudoCompleto || {};

  // Captura o nome do órgão / convênio (caso o backend venha a injetar ou via join)
  const nomeOrgaoConvenio = registro.nomeOrgao || dados.nomeOrgao || registro.convenioNome || dados.convenioNome || 'NÃO INFORMADO';

  // Paleta de Cores 
  const corLaranja = rgb(0.95, 0.45, 0.10); // #F2721A
  const corCinzaEscuro = rgb(0.2, 0.2, 0.2);
  const corLinha = rgb(0.8, 0.8, 0.8);
  const corFundoCabecalho = rgb(0.97, 0.97, 0.97);

  // --- 1. FAIXA LARANJA NO TOPO ---
  page.drawRectangle({
    x: 0,
    y: 817, 
    width: 595,
    height: 25,
    color: corLaranja,
  });

  // --- 2. CABEÇALHO INSTITUCIONAL & LOGO ---
  page.drawRectangle({
    x: 40,
    y: 730,
    width: 515,
    height: 70,
    borderColor: corLinha,
    borderWidth: 1,
    color: corFundoCabecalho,
  });

  page.drawLine({
    start: { x: 260, y: 730 },
    end: { x: 260, y: 800 },
    thickness: 1,
    color: corLinha,
  });


  // Header
  page.drawText('LAUDO DE ANÁLISE', {
    x: 275,
    y: 778,
    size: 10,
    font: bold,
    color: corCinzaEscuro,
  });
  page.drawText('CRÉDITO CONSIGNADO', {
    x: 275,
    y: 763,
    size: 9,
    font: font,
    color: corCinzaEscuro,
  });
  page.drawText(`CONVÊNIO / ÓRGÃO: ${nomeOrgaoConvenio.toUpperCase()}`, {
    x: 275,
    y: 745,
    size: 9,
    font: bold,
    color: corLaranja,
  });

  // --- 3. RODAPÉ INSTITUCIONAL ---
  page.drawRectangle({
    x: 0,
    y: 0,
    width: 595,
    height: 25,
    color: corLaranja,
  });

  let y = 705;
  const gap = (n = 6) => (y -= n);

  const text = (t: string, size = 9, f = font, color = corCinzaEscuro) => {
    page.drawText(t || '', { x: 40, y, size, font: f, color });
    gap(size + 5);
  };

  const drawWrappedText = (label: string, value: string, size = 9, f = font, color = corCinzaEscuro) => {
    const fullText = `${label}: ${value || ''}`;
    const maxWidth = 515; 
    const words = fullText.split(' ');
    let line = '';

    for (const word of words) {
      const testLine = line + word + ' ';
      const textWidth = f.widthOfTextAtSize(testLine, size);
      if (textWidth > maxWidth && line !== '') {
        page.drawText(line, { x: 40, y, size, font: f, color });
        gap(size + 4);
        line = word + ' ';
      } else {
        line = testLine;
      }
    }
    page.drawText(line, { x: 40, y, size, font: f, color });
    gap(size + 6);
  };

  const linha = () => {
    page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 0.5, color: corLinha });
    gap(10);
  };

  const fmt = (val: number | undefined | null) => (Number(val || 0)).toFixed(2);

  const optionsDate: Intl.DateTimeFormatOptions = { 
    timeZone: 'America/Sao_Paulo', 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  };
  
  const dataBrutaAnalise = registro.dataAnalise || registro.createdAt || Date.now();
  const dataAnaliseOriginal = new Date(dataBrutaAnalise).toLocaleString('pt-BR', optionsDate);
  const dataHoraDownload = new Date().toLocaleString('pt-BR', optionsDate);

  // Cálculos baseados no JSON real recebido
  const salarioBruto = Number(dados.salarioFixo || 1);
  const totalEmprestimosCartoes = Number(dados.emprestimosAtivos || 0) + Number(dados.descontoRMC || 0) + Number(dados.descontoRCC || 0);
  const valorNovaParcela = Number(dados.valorNovaParcela || 0);
  
  const pctMargemAtual = ((totalEmprestimosCartoes / salarioBruto) * 100);
  const pctMargemProjetada = (((totalEmprestimosCartoes + valorNovaParcela) / salarioBruto) * 100);

  // Informações do Cliente
  text(`Cliente / Servidor: ${registro.nomeCliente || 'Não informado'}`, 11, bold);
  text(`Data da Análise Original: ${dataAnaliseOriginal}`);
  linha();

  text('1. Composição Financeira da Proposta', 11, bold);
  text(`Salário Bruto: R$ ${fmt(dados.salarioFixo)}`);
  text(`Descontos Obrigatórios: R$ ${fmt(dados.descontosCompulsorios)}`);
  text(`Descontos Facultativos: R$ ${fmt(dados.descontosFacultativos)}`);
  text(`Empréstimos Ativos: R$ ${fmt(dados.emprestimosAtivos)}`);
  text(`Desconto RMC: R$ ${fmt(dados.descontoRMC)}`);
  text(`Desconto RCC: R$ ${fmt(dados.descontoRCC)}`);
  
  if (laudo.valorAdiantamentoProjetado > 0) {
    text(`Adiantamento Salarial (${laudo.pctAdiantamento}% reservado): R$ ${fmt(laudo.valorAdiantamentoProjetado)}`);
  }

  text(`Tipo de Operação: ${dados.tipoOperacao || 'EMPRESTIMO'}`);
  text(`Valor da Nova Parcela: R$ ${fmt(dados.valorNovaParcela)}`);
  linha();

  text('2. Parâmetros de Avaliação', 11, bold);
  text(`• Comprometimento de Margem do Convênio: ${laudo.pctGlobalConvenio ?? 30}% (Teto Padrão)`);
  text(`• Comprometimento da Margem Atual: ${pctMargemAtual.toFixed(2)}%`);
  text(`• Comprometimento da Margem Projetado (com nova parcela): ${pctMargemProjetada.toFixed(2)}%`);
  text(`• Endividamento Total Atual (Regra de Superendividamento): ${laudo.grauAtualSuper ?? 0}%`);
  text(`• Endividamento Total Projetado com nova parcela: ${laudo.grauFuturoSuper ?? 0}%`);
  text(`• Teto Máximo Permitido (Superendividamento em Reais): R$ ${fmt(laudo.limiteSuperendividamento)} (Limite máximo de comprometimento financeiro)`);
  linha();

  const corResultado = registro.resultado === 'APROVADO' ? rgb(0, 0.5, 0) : rgb(0.8, 0, 0);
text(`Resultado da Análise: ${registro.resultado || 'PENDENTE'}`, 12, bold, corResultado);

const tipoOp = dados.tipoOperacao || 'EMPRÉSTIMO';

// Define o parecer técnico dinamicamente com base no resultado real
let parecerPersonalizado = '';

if (registro.resultado === 'APROVADO') {
    parecerPersonalizado = `Aprovado para ${tipoOp}. Comprometimento da margem: ${pctMargemProjetada.toFixed(2)}% | Endividamento total projetado: ${laudo.grauFuturoSuper ?? 0}%.`;
} else {
    // Se for recusado, exibe o motivo detalhado que veio do motor de cálculo
    parecerPersonalizado = registro.motivoRecusa || laudo.motivo || 'Proposta recusada por não atingir os critérios operacionais.';
}

drawWrappedText('Parecer Técnico', parecerPersonalizado, 9, font, corCinzaEscuro);
linha();
  // Auditoria e Rodapé
  y = 45;
  page.drawLine({ start: { x: 40, y: y + 15 }, end: { x: 555, y: y + 15 }, thickness: 0.5, color: corLinha });
  
  page.drawText(`Baixado em: ${dataHoraDownload} | Hash: ${hash || 'N/A'}`, {
    x: 40,
    y,
    size: 7,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}