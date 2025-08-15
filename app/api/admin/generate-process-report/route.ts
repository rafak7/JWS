import { NextRequest, NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';
import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';

// Configuração de runtime para esta API route
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 segundos (máximo para plano hobby)

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

interface ProcessImageData {
  serviceId: string;
  serviceName: string;
  comment: string;
  phase: 'antes' | 'durante' | 'depois';
  captureDate: string;
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

// Função para converter imagem para base64
async function imageToBase64(file: any): Promise<string> {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');
    
    // Detectar tipo de imagem baseado nos primeiros bytes
    let mimeType = 'image/jpeg'; // padrão
    if (buffer[0] === 0x89 && buffer[1] === 0x50) {
      mimeType = 'image/png';
    } else if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
      mimeType = 'image/jpeg';
    } else if (buffer[0] === 0x47 && buffer[1] === 0x49) {
      mimeType = 'image/gif';
    }
    
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('Erro ao converter imagem para base64:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Token de acesso inválido' }, { status: 401 });
    }

    const formData = await request.formData();
    
    // Extrair dados básicos
    const workName = formData.get('workName') as string;
    const workDate = formData.get('workDate') as string;
    
    if (!workName) {
      return NextResponse.json({ error: 'Nome da obra é obrigatório' }, { status: 400 });
    }

    // Extrair imagens do processo
    const processImages: { file: Buffer; data: ProcessImageData }[] = [];
    
    for (const [key, value] of Array.from(formData.entries())) {
      if (key.startsWith('processImage_')) {
        const file = value as File;
        const buffer = Buffer.from(await file.arrayBuffer());
        
        // Extrair metadados da imagem
        const serviceId = formData.get(`processImageServiceId_${key.split('_')[1]}`) as string;
        const serviceName = formData.get(`processImageServiceName_${key.split('_')[1]}`) as string;
        const comment = formData.get(`processImageComment_${key.split('_')[1]}`) as string || '';
        const phase = formData.get(`processImagePhase_${key.split('_')[1]}`) as 'antes' | 'durante' | 'depois';
        const captureDate = formData.get(`processImageCaptureDate_${key.split('_')[1]}`) as string || new Date().toISOString().split('T')[0];
        
        processImages.push({
          file: buffer,
          data: {
            serviceId,
            serviceName,
            comment,
            phase,
            captureDate
          }
        });
      }
    }

    if (processImages.length === 0) {
      return NextResponse.json({ error: 'Pelo menos uma imagem é necessária' }, { status: 400 });
    }

    // Criar PDF
    const pdf = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const fullHeaderHeight = 40;
    const simpleHeaderHeight = 25;
    const footerHeight = 20;
    
    // Carregar logo da empresa
    const companyLogo = loadCompanyLogo();
    
    // Função para adicionar header completo (primeira página)
    const addFullHeader = () => {
      // Salvar estado atual
      const currentFontSize = pdf.getFontSize();
      const currentFont = pdf.getFont();
      
      // Background do header
      pdf.setFillColor(248, 249, 250);
      pdf.rect(margin, margin - 5, pageWidth - 2 * margin, fullHeaderHeight, 'F');
      
      // Borda superior colorida
      pdf.setFillColor(255, 193, 7); // Amarelo JWS
      pdf.rect(margin, margin - 5, pageWidth - 2 * margin, 3, 'F');
      
      if (companyLogo) {
        // Logo posicionado corretamente
        pdf.addImage(companyLogo, 'JPEG', margin + 8, margin + 3, 28, 22);
      }
      
      // Seção principal da empresa
      const mainSectionX = margin + 45;
      
      // Nome da empresa
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(33, 37, 41);
      pdf.text('JWS EMPREITEIRA', mainSectionX, margin + 10);
      
      // Subtítulo
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(108, 117, 125);
      pdf.text('Relatório de Processo da Obra', mainSectionX, margin + 18);
      
      // Informações de contato organizadas
      const contactY1 = margin + 25;
      const contactY2 = margin + 30;
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(73, 80, 87);
      
      // Primeira linha: Telefone
      pdf.setFont('helvetica', 'bold');
      pdf.text('Tel:', mainSectionX, contactY1);
      pdf.setFont('helvetica', 'normal');
      pdf.text('(21) 98450-6031', mainSectionX + 12, contactY1);
      
      // Email na mesma linha se couber
      const emailX = mainSectionX + 65;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Email:', emailX, contactY1);
      pdf.setFont('helvetica', 'normal');
      pdf.text('jws.manutencao@gmail.com', emailX + 16, contactY1);
      
      // Segunda linha: CNPJ
      pdf.setFont('helvetica', 'bold');
      pdf.text('CNPJ:', mainSectionX, contactY2);
      pdf.setFont('helvetica', 'normal');
      pdf.text('42.316.144/0001-70', mainSectionX + 16, contactY2);
      
      // Linha separadora
      pdf.setDrawColor(222, 226, 230);
      pdf.setLineWidth(0.5);
      pdf.line(margin + 5, margin + fullHeaderHeight - 5, pageWidth - margin - 5, margin + fullHeaderHeight - 5);
      
      // Restaurar estado anterior
      pdf.setFontSize(currentFontSize);
      pdf.setFont(currentFont.fontName, currentFont.fontStyle);
      pdf.setTextColor(0, 0, 0);
      pdf.setLineWidth(0.2);
    };

    // Função para adicionar header simples (demais páginas)
    const addSimpleHeader = () => {
      // Salvar estado atual
      const currentFontSize = pdf.getFontSize();
      const currentFont = pdf.getFont();
      
      // Background sutil
      pdf.setFillColor(252, 253, 254);
      pdf.rect(margin, margin - 2, pageWidth - 2 * margin, simpleHeaderHeight, 'F');
      
      // Borda superior colorida (mais fina)
      pdf.setFillColor(255, 193, 7); // Amarelo JWS
      pdf.rect(margin, margin - 2, pageWidth - 2 * margin, 2, 'F');
      
      if (companyLogo) {
          // Logo menor e bem posicionado
          pdf.addImage(companyLogo, 'JPEG', margin + 5, margin + 2, 18, 14);
        }
      
      // Nome da empresa com estilo consistente
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(33, 37, 41);
      pdf.text('JWS EMPREITEIRA', margin + 28, margin + 11);
      
      // Subtítulo menor
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(108, 117, 125);
      pdf.text('Relatório de Processo da Obra', margin + 28, margin + 17);
      
      // Linha separadora elegante
      pdf.setDrawColor(222, 226, 230);
      pdf.setLineWidth(0.3);
      pdf.line(margin + 3, margin + simpleHeaderHeight - 2, pageWidth - margin - 3, margin + simpleHeaderHeight - 2);
      
      // Restaurar estado anterior
      pdf.setFontSize(currentFontSize);
      pdf.setFont(currentFont.fontName, currentFont.fontStyle);
      pdf.setTextColor(0, 0, 0);
      pdf.setLineWidth(0.2);
    };

    // Função para adicionar header (escolhe entre completo ou simples)
    const addHeader = (isFirstPage = false) => {
      if (isFirstPage) {
        addFullHeader();
      } else {
        addSimpleHeader();
      }
    };

    // Função para obter altura do header baseada no contexto
    const getHeaderHeight = (isFirstPage = false) => {
      return isFirstPage ? fullHeaderHeight : simpleHeaderHeight;
    };

    // Função para adicionar footer
    const addFooter = () => {
      const footerY = pageHeight - footerHeight;
      
      // Background sutil do footer
      pdf.setFillColor(252, 253, 254);
      pdf.rect(margin, footerY - 2, pageWidth - 2 * margin, footerHeight + 2, 'F');
      
      // Linha separadora elegante
      pdf.setDrawColor(222, 226, 230);
      pdf.setLineWidth(0.3);
      pdf.line(margin + 3, footerY, pageWidth - margin - 3, footerY);
      
      // Adicionar texto do footer
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(108, 117, 125);
      
      // Número da página (direita)
      const pageNumber = pdf.getCurrentPageInfo().pageNumber;
      const pageText = `Página ${pageNumber}`;
      const pageTextWidth = pdf.getTextWidth(pageText);
      pdf.text(pageText, pageWidth - margin - pageTextWidth - 5, footerY + 8);
      
      // Nome da empresa (centro)
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(73, 80, 87);
      const companyText = 'JWS EMPREITEIRA';
      const companyTextWidth = pdf.getTextWidth(companyText);
      pdf.text(companyText, (pageWidth - companyTextWidth) / 2, footerY + 8);
      
      // Data de geração (esquerda)
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(108, 117, 125);
      const currentDate = new Date().toLocaleDateString('pt-BR');
      pdf.text(`Gerado em: ${currentDate}`, margin + 5, footerY + 8);
      
      // Resetar estado
      pdf.setTextColor(0, 0, 0);
      pdf.setLineWidth(0.2);
    };

    // Organizar imagens por fase
    const imagesByPhase = {
      antes: processImages.filter(img => img.data.phase === 'antes'),
      durante: processImages.filter(img => img.data.phase === 'durante'),
      depois: processImages.filter(img => img.data.phase === 'depois')
    } as const;

    const phaseLabels: Record<string, string> = {
      antes: 'ANTES',
      durante: 'DURANTE', 
      depois: 'DEPOIS'
    } as const;

    let isFirstPage = true;
    let yPosition = 0;
    let hasAddedRegistroTitle = false;

    // Processar cada fase
    for (const [phase, images] of Object.entries(imagesByPhase)) {
      if (images.length === 0) continue;

      if (!isFirstPage) {
        pdf.addPage();
      }
      
      addHeader(isFirstPage);
      yPosition = margin + getHeaderHeight(isFirstPage) + 10;
      
      // Informações da obra (apenas na primeira página)
      if (isFirstPage) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(33, 37, 41);
        pdf.text(`Obra: ${workName}`, margin, yPosition);
        yPosition += 7;
        pdf.text(`Data: ${new Date(workDate).toLocaleDateString('pt-BR')}`, margin, yPosition);
        yPosition += 7;
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(108, 117, 125);
        pdf.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, margin, yPosition);
        
        yPosition += 20;
        
        // Título "Registro Fotográfico" (apenas uma vez)
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(33, 37, 41);
        pdf.text('Registro Fotográfico', pageWidth / 2, yPosition, { align: 'center' });
        
        // Linha decorativa abaixo do título
        pdf.setDrawColor(255, 193, 7);
        pdf.setLineWidth(1);
        const lineWidth = 60;
        pdf.line((pageWidth - lineWidth) / 2, yPosition + 3, (pageWidth + lineWidth) / 2, yPosition + 3);
        
        yPosition += 15;
        hasAddedRegistroTitle = true;
      }
      
      isFirstPage = false;
      
      // Título da fase
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(33, 37, 41);
      pdf.text(`FASE: ${phaseLabels[phase]}`, pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 15;

      // Processar imagens da fase
      for (let i = 0; i < images.length; i++) {
        const imageData = images[i];
        
        // Verificar se precisa de nova página (considerando espaço para imagem + texto)
        if (yPosition > pageHeight - 120) {
          addFooter();
          pdf.addPage();
          addHeader(false);
          yPosition = margin + getHeaderHeight(false) + 10;
          
          // Repetir título da fase na nova página
          pdf.setFontSize(14);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(33, 37, 41);
          pdf.text(`FASE: ${phaseLabels[phase]} (continuação)`, pageWidth / 2, yPosition, { align: 'center' });
          yPosition += 15;
        }

        try {
          // Adicionar título da imagem com data de captura
          const captureDate = new Date(imageData.data.captureDate).toLocaleDateString('pt-BR');
          pdf.setFontSize(14);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${phaseLabels[phase]} - Imagem ${i + 1}`, pageWidth / 2, yPosition, { align: 'center' });
          yPosition += 8;
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(108, 117, 125);
          pdf.text(`Data da foto: ${captureDate}`, pageWidth / 2, yPosition, { align: 'center' });
          pdf.setTextColor(33, 37, 41);
          yPosition += 10;

          // Converter e adicionar imagem
          const imageFile = new File([imageData.file], 'image.jpg', { type: 'image/jpeg' });
          const imageBase64 = await imageToBase64(imageFile);
          
          // Calcular dimensões da imagem (máximo 120mm de largura, 80mm de altura)
          const maxWidth = 120;
          const maxHeight = 80;
          const imageX = (pageWidth - maxWidth) / 2;
          
          pdf.addImage(imageBase64, 'JPEG', imageX, yPosition, maxWidth, maxHeight);
          yPosition += maxHeight + 10;

          // Adicionar comentário se existir
          if (imageData.data.comment) {
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            const commentLines = pdf.splitTextToSize(`Comentário: ${imageData.data.comment}`, pageWidth - 2 * margin);
            pdf.text(commentLines, margin, yPosition);
            yPosition += commentLines.length * 5 + 10;
          } else {
            yPosition += 10;
          }

          // Espaço entre imagens
          yPosition += 10;

        } catch (error) {
          console.error('Erro ao processar imagem:', error);
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`Erro ao carregar ${phaseLabels[phase]} - Imagem ${i + 1}`, pageWidth / 2, yPosition, { align: 'center' });
          yPosition += 20;
        }
      }

      addFooter();
    }

    // Se não há imagens, adicionar página informativa
    if (Object.values(imagesByPhase).every(images => images.length === 0)) {
      addHeader(true);
      yPosition = margin + getHeaderHeight(true) + 10;
      
      // Informações da obra
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(33, 37, 41);
      pdf.text(`Obra: ${workName}`, margin, yPosition);
      yPosition += 7;
      pdf.text(`Data: ${new Date(workDate).toLocaleDateString('pt-BR')}`, margin, yPosition);
      yPosition += 7;
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(108, 117, 125);
      pdf.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, margin, yPosition);
      
      yPosition += 30;
      
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(33, 37, 41);
      pdf.text('Nenhuma imagem foi adicionada ao relatório de processo.', pageWidth / 2, yPosition, { align: 'center' });
      addFooter();
    }

    // Gerar PDF como buffer
    const pdfBuffer = pdf.output('arraybuffer');

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Processo_da_Obra_${workName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Erro ao gerar relatório de processo:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao gerar relatório' },
      { status: 500 }
    );
  }
}