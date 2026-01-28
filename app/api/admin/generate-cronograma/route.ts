import { NextRequest, NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';
import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';

// Configuração de runtime para esta API route
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 segundos

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Interface para item do cronograma
interface CronogramaItem {
  id: string;
  dataInicio: string;
  dataFim: string;
  atividade: string;
  status: 'pendente' | 'em_andamento' | 'concluido';
  observacoes: string;
  ordem: number;
}

// Função para verificar autenticação
function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Função para carregar logo da empresa
function loadCompanyLogo(): string | null {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'images', 'jws-logo.jpeg');
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      return `data:image/jpeg;base64,${logoBuffer.toString('base64')}`;
    }
  } catch (error) {
    console.error('Erro ao carregar logo:', error);
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    console.log('Iniciando geração de cronograma PDF...');

    // Verificar autenticação
    const user = verifyToken(request);
    if (!user) {
      console.log('Erro de autenticação');
      return NextResponse.json(
        { message: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    console.log('Autenticação OK');

    // Processar dados do cronograma
    const { cronograma, titulo } = await request.json();

    if (!cronograma || !Array.isArray(cronograma)) {
      return NextResponse.json(
        { message: 'Dados do cronograma inválidos' },
        { status: 400 }
      );
    }

    console.log('Processando cronograma com', cronograma.length, 'atividades');

    // Carregar logo da empresa
    const companyLogo = loadCompanyLogo();

    // Criar PDF
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const fullHeaderHeight = 40;
    const simpleHeaderHeight = 25;
    const footerHeight = 20;
    let yPosition = margin + fullHeaderHeight;

    // Função para adicionar header completo (primeira página)
    const addFullHeader = () => {
      // Background do header com gradiente visual
      pdf.setFillColor(248, 249, 250);
      pdf.rect(margin, margin - 5, pageWidth - 2 * margin, fullHeaderHeight, 'F');

      // Borda superior colorida (identidade visual)
      pdf.setFillColor(255, 193, 7); // Amarelo JWS
      pdf.rect(margin, margin - 5, pageWidth - 2 * margin, 3, 'F');

      if (companyLogo) {
        // Logo centralizado verticalmente no header
        pdf.addImage(companyLogo, 'JPEG', margin + 8, margin + 3, 28, 22);
      }

      // Seção principal da empresa
      const mainSectionX = margin + 45;

      // Nome da empresa
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(33, 37, 41);
      pdf.text('JWS EMPREITEIRA', mainSectionX, margin + 10);

      // Subtítulo com estilo
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(108, 117, 125);
      pdf.text('Serviços de Manutenção Predial por empreiteira', mainSectionX, margin + 18);

      // Seção de contato organizada em duas linhas
      const contactY1 = margin + 25;
      const contactY2 = margin + 30;
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(73, 80, 87);

      // Primeira linha de contato
      pdf.text('E-mail: jws@empreteira.com', mainSectionX, contactY1);
      pdf.text('Tel: (11) 94167-1819', mainSectionX + 70, contactY1);

      // Segunda linha de contato
      pdf.text('Local: São Paulo, SP', mainSectionX, contactY2);
      pdf.text('Serviços Especializados', mainSectionX + 40, contactY2);

      // Linha decorativa
      pdf.setDrawColor(234, 236, 240);
      pdf.setLineWidth(0.5);
      pdf.line(margin, margin + fullHeaderHeight - 2, pageWidth - margin, margin + fullHeaderHeight - 2);
    };

    // Função para adicionar header simples (páginas subsequentes)
    const addSimpleHeader = () => {
      // Background do header
      pdf.setFillColor(248, 249, 250);
      pdf.rect(margin, margin - 5, pageWidth - 2 * margin, simpleHeaderHeight, 'F');

      // Borda superior
      pdf.setFillColor(255, 193, 7);
      pdf.rect(margin, margin - 5, pageWidth - 2 * margin, 2, 'F');

      // Nome da empresa centralizado
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(33, 37, 41);
      const text = 'JWS EMPREITEIRA - CRONOGRAMA DE OBRA';
      const textWidth = pdf.getTextWidth(text);
      pdf.text(text, (pageWidth - textWidth) / 2, margin + 8);

      // Linha decorativa
      pdf.setDrawColor(234, 236, 240);
      pdf.setLineWidth(0.3);
      pdf.line(margin, margin + simpleHeaderHeight - 2, pageWidth - margin, margin + simpleHeaderHeight - 2);
    };

    // Função para adicionar footer
    const addFooter = () => {
      const footerY = pageHeight - footerHeight + 5;

      // Background do footer
      pdf.setFillColor(248, 249, 250);
      pdf.rect(margin, footerY - 5, pageWidth - 2 * margin, footerHeight, 'F');

      // Linha superior do footer
      pdf.setDrawColor(234, 236, 240);
      pdf.setLineWidth(0.3);
      pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

      // Textos do footer
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(108, 117, 125);

      // Data de geração à esquerda
      const currentDate = new Date().toLocaleDateString('pt-BR');
      pdf.text(`Gerado em: ${currentDate}`, margin, footerY + 2);

      // Número da página à direita
      const pageNum = pdf.getCurrentPageInfo().pageNumber;
      const totalPages = pdf.getNumberOfPages();
      const pageText = `Página ${pageNum} de ${totalPages}`;
      const pageTextWidth = pdf.getTextWidth(pageText);
      pdf.text(pageText, pageWidth - margin - pageTextWidth, footerY + 2);

      // Texto central
      const centerText = 'JWS Empreiteira - Cronograma de Obra';
      const centerTextWidth = pdf.getTextWidth(centerText);
      pdf.text(centerText, (pageWidth - centerTextWidth) / 2, footerY + 2);
    };

    // Função para adicionar texto centralizado
    const addCenteredText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
      pdf.setTextColor(33, 37, 41);

      const textWidth = pdf.getTextWidth(text);
      const centerX = (pageWidth - textWidth) / 2;
      pdf.text(text, centerX, yPosition);
      yPosition += fontSize * 0.6;
    };

    // Função para adicionar texto normal
    const addText = (text: string, fontSize: number = 12, isBold: boolean = false, x: number = margin) => {
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
      pdf.setTextColor(33, 37, 41);

      // Quebrar texto em linhas se necessário
      const maxWidth = pageWidth - 2 * margin;
      const lines = pdf.splitTextToSize(text, maxWidth);

      for (let line of lines) {
        // Verificar se precisa de nova página
        if (yPosition > pageHeight - footerHeight - 30) {
          pdf.addPage();
          addSimpleHeader();
          yPosition = margin + simpleHeaderHeight + 20;
        }

        pdf.text(line, x, yPosition);
        yPosition += fontSize * 0.6;
      }
      yPosition += 5; // Espaço extra entre parágrafos
    };

    // Função para obter cor do status
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'pendente':
          return { r: 255, g: 193, b: 7 }; // Amarelo
        case 'em_andamento':
          return { r: 13, g: 110, b: 253 }; // Azul
        case 'concluido':
          return { r: 25, g: 135, b: 84 }; // Verde
        default:
          return { r: 108, g: 117, b: 125 }; // Cinza
      }
    };

    // Função para obter texto do status
    const getStatusText = (status: string) => {
      switch (status) {
        case 'pendente':
          return 'PENDENTE';
        case 'em_andamento':
          return 'EM ANDAMENTO';
        case 'concluido':
          return 'CONCLUÍDO';
        default:
          return 'INDEFINIDO';
      }
    };

    // Adicionar primeira página
    addFullHeader();
    yPosition = margin + fullHeaderHeight + 20;

    // Título do cronograma
    addCenteredText('CRONOGRAMA DE OBRA', 18, true);
    yPosition += 5;

    if (titulo) {
      addCenteredText(titulo, 14, false);
      yPosition += 5;
    }

    addCenteredText(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 10, false);
    yPosition += 25;

    // Ordenar cronograma por ordem
    const cronogramaOrdenado = [...cronograma].sort((a, b) => a.ordem - b.ordem);

    // Adicionar cada atividade do cronograma
    cronogramaOrdenado.forEach((item: CronogramaItem, index: number) => {
      // Verificar se precisa de nova página
      if (yPosition > pageHeight - footerHeight - 100) {
        pdf.addPage();
        addSimpleHeader();
        yPosition = margin + simpleHeaderHeight + 20;
      }

      // Box para a atividade
      const boxHeight = 50;
      const statusColor = getStatusColor(item.status);

      // Background do box
      pdf.setFillColor(248, 249, 250);
      pdf.rect(margin, yPosition - 10, pageWidth - 2 * margin, boxHeight, 'F');

      // Borda lateral colorida baseada no status
      pdf.setFillColor(statusColor.r, statusColor.g, statusColor.b);
      pdf.rect(margin, yPosition - 10, 5, boxHeight, 'F');

      // Número da atividade
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(33, 37, 41);
      pdf.text(`${item.ordem}.`, margin + 10, yPosition);

      // Título da atividade
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(33, 37, 41);
      const atividadeMaxWidth = pageWidth - margin - 50;
      const atividadeLines = pdf.splitTextToSize(item.atividade, atividadeMaxWidth);
      pdf.text(atividadeLines[0], margin + 25, yPosition);

      // Se o título for muito longo, adicionar "..." 
      if (atividadeLines.length > 1) {
        const truncatedTitle = atividadeLines[0].slice(0, -3) + '...';
        pdf.text(truncatedTitle, margin + 25, yPosition);
      }

      // Status badge
      const statusText = getStatusText(item.status);
      const badgeWidth = pdf.getTextWidth(statusText) + 10;
      const badgeX = pageWidth - margin - badgeWidth - 5;

      // Background do badge
      pdf.setFillColor(statusColor.r, statusColor.g, statusColor.b);
      pdf.rect(badgeX, yPosition - 8, badgeWidth, 12, 'F');

      // Texto do badge
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text(statusText, badgeX + 5, yPosition - 1);

      // Datas
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(73, 80, 87);
      const dataInicio = new Date(item.dataInicio + 'T12:00:00').toLocaleDateString('pt-BR');
      const dataFim = new Date(item.dataFim + 'T12:00:00').toLocaleDateString('pt-BR');
      pdf.text(`Periodo: ${dataInicio} ate ${dataFim}`, margin + 25, yPosition + 12);

      // Observações (se existirem)
      if (item.observacoes && item.observacoes.trim()) {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(108, 117, 125);
        const obsMaxWidth = pageWidth - margin - 30;
        const obsLines = pdf.splitTextToSize(`Obs: ${item.observacoes}`, obsMaxWidth);
        pdf.text(obsLines[0], margin + 25, yPosition + 22);
      }

      yPosition += boxHeight + 10;
    });

    // Adicionar resumo do cronograma
    if (yPosition > pageHeight - footerHeight - 140) {
      pdf.addPage();
      addSimpleHeader();
      yPosition = margin + simpleHeaderHeight + 20;
    }

    yPosition += 20;
    addCenteredText('RESUMO DO CRONOGRAMA', 16, true);
    yPosition += 15;

    // Estatísticas
    const totalAtividades = cronograma.length;
    const pendentes = cronograma.filter((item: CronogramaItem) => item.status === 'pendente').length;
    const emAndamento = cronograma.filter((item: CronogramaItem) => item.status === 'em_andamento').length;
    const concluidas = cronograma.filter((item: CronogramaItem) => item.status === 'concluido').length;
    const percentualConcluido = totalAtividades > 0 ? Math.round((concluidas / totalAtividades) * 100) : 0;

    // Box principal de estatísticas com design melhorado
    const statsY = yPosition;
    const boxWidth = pageWidth - 2 * margin;
    const boxHeight = 85;

    // Background principal do box
    pdf.setFillColor(255, 255, 255);
    pdf.rect(margin, statsY - 5, boxWidth, boxHeight, 'F');

    // Borda do box
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(1);
    pdf.rect(margin, statsY - 5, boxWidth, boxHeight);

    // Borda superior colorida (accent)
    pdf.setFillColor(255, 193, 7); // Amarelo JWS
    pdf.rect(margin, statsY - 5, boxWidth, 4, 'F');

    yPosition = statsY + 10;

    // Título da seção dentro do box
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(33, 37, 41);
    const titleText = 'ESTATISTICAS DO PROJETO';
    const titleWidth = pdf.getTextWidth(titleText);
    pdf.text(titleText, (pageWidth - titleWidth) / 2, yPosition);
    yPosition += 15;

    // Linha separadora
    pdf.setDrawColor(220, 220, 220);
    pdf.setLineWidth(0.5);
    pdf.line(margin + 10, yPosition - 5, pageWidth - margin - 10, yPosition - 5);
    yPosition += 5;

    // Layout em duas colunas para as informações
    const leftColX = margin + 15;
    const rightColX = margin + (boxWidth / 2) + 10;

    // Coluna esquerda
    let leftY = yPosition;

    // Total de atividades (destaque)
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(33, 37, 41);
    pdf.text('TOTAL DE ATIVIDADES', leftColX, leftY);

    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 193, 7); // Amarelo destaque
    pdf.text(`${totalAtividades}`, leftColX + 60, leftY);
    leftY += 20;

    // Progresso (destaque)
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(33, 37, 41);
    pdf.text('PROGRESSO ATUAL', leftColX, leftY);

    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');

    // Cor do progresso baseada no percentual
    if (percentualConcluido === 0) {
      pdf.setTextColor(220, 53, 69); // Vermelho
    } else if (percentualConcluido < 50) {
      pdf.setTextColor(255, 193, 7); // Amarelo
    } else if (percentualConcluido < 100) {
      pdf.setTextColor(13, 110, 253); // Azul
    } else {
      pdf.setTextColor(25, 135, 84); // Verde
    }

    pdf.text(`${percentualConcluido}%`, leftColX + 60, leftY);

    // Coluna direita - Status detalhado
    let rightY = yPosition;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(33, 37, 41);
    pdf.text('STATUS DAS ATIVIDADES:', rightColX, rightY);
    rightY += 12;

    // Pendentes
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(255, 193, 7); // Amarelo
    pdf.text('■', rightColX, rightY);
    pdf.setTextColor(73, 80, 87);
    pdf.text(`Pendentes: ${pendentes}`, rightColX + 8, rightY);
    rightY += 8;

    // Em Andamento
    pdf.setTextColor(13, 110, 253); // Azul
    pdf.text('■', rightColX, rightY);
    pdf.setTextColor(73, 80, 87);
    pdf.text(`Em Andamento: ${emAndamento}`, rightColX + 8, rightY);
    rightY += 8;

    // Concluídas
    pdf.setTextColor(25, 135, 84); // Verde
    pdf.text('■', rightColX, rightY);
    pdf.setTextColor(73, 80, 87);
    pdf.text(`Concluidas: ${concluidas}`, rightColX + 8, rightY);

    // Barra de progresso visual
    if (totalAtividades > 0) {
      const progressBarY = statsY + boxHeight - 20;
      const progressBarWidth = boxWidth - 30;
      const progressBarHeight = 8;
      const progressBarX = margin + 15;

      // Background da barra
      pdf.setFillColor(233, 236, 239);
      pdf.rect(progressBarX, progressBarY, progressBarWidth, progressBarHeight, 'F');

      // Preenchimento da barra baseado no progresso
      if (percentualConcluido > 0) {
        const filledWidth = (progressBarWidth * percentualConcluido) / 100;

        if (percentualConcluido === 100) {
          pdf.setFillColor(25, 135, 84); // Verde
        } else if (percentualConcluido >= 50) {
          pdf.setFillColor(13, 110, 253); // Azul
        } else {
          pdf.setFillColor(255, 193, 7); // Amarelo
        }

        pdf.rect(progressBarX, progressBarY, filledWidth, progressBarHeight, 'F');
      }

      // Borda da barra
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.rect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);

      // Texto da barra de progresso
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(108, 117, 125);
      const progressText = `Barra de Progresso: ${percentualConcluido}% concluido`;
      const progressTextWidth = pdf.getTextWidth(progressText);
      pdf.text(progressText, progressBarX + (progressBarWidth - progressTextWidth) / 2, progressBarY - 3);
    }

    // Adicionar footers em todas as páginas
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      addFooter();
    }

    // Gerar PDF como buffer
    const pdfBuffer = pdf.output('arraybuffer');

    // Retornar PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="cronograma_obra_${Date.now()}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error('Erro ao gerar cronograma PDF:', error);

    return NextResponse.json(
      {
        message: 'Erro interno do servidor',
        details: error.toString(),
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 