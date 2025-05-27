import { NextRequest, NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';
import { jsPDF } from 'jspdf';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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

// Função para converter imagem para base64 com compressão
async function imageToBase64(file: any): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Limitar tamanho da imagem para evitar problemas de memória
  const maxSize = 800 * 1024; // Aumentado de 500KB para 800KB para melhor qualidade
  let base64 = buffer.toString('base64');
  
  // Se a imagem for muito grande, reduzir qualidade mais suavemente
  if (buffer.length > maxSize) {
    // Reduzir para aproximadamente 85% do tamanho original (melhor qualidade)
    const reducedBuffer = buffer.subarray(0, Math.floor(buffer.length * 0.85));
    base64 = reducedBuffer.toString('base64');
  }
  
  const mimeType = file.type || 'image/jpeg';
  return `data:${mimeType};base64,${base64}`;
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { message: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    // Processar FormData
    const formData = await request.formData();
    const clientName = formData.get('clientName') as string;
    const projectName = formData.get('projectName') as string;
    const location = formData.get('location') as string;
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const description = formData.get('description') as string;
    const observations = formData.get('observations') as string;
    const serviceType = formData.get('serviceType') as string;

    // Processar imagens normais
    const images: any[] = [];
    const formDataEntries = Array.from(formData.entries());
    for (const [key, value] of formDataEntries) {
      if (key.startsWith('image_') && value && typeof value === 'object' && 'arrayBuffer' in value) {
        images.push(value);
      }
    }

    // Processar imagem de resultado separada
    const resultImage = formData.get('resultImage');

    // Criar PDF
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // Função para centralizar texto
    const addCenteredText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
      pdf.setFontSize(fontSize);
      if (isBold) {
        pdf.setFont('helvetica', 'bold');
      } else {
        pdf.setFont('helvetica', 'normal');
      }
      
      const textWidth = pdf.getTextWidth(text);
      const x = (pageWidth - textWidth) / 2;
      pdf.text(text, x, yPosition);
      yPosition += fontSize * 0.5 + 5;
      
      // Verificar se precisa de nova página
      if (yPosition > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
    };

    // Função para adicionar texto normal
    const addText = (text: string, fontSize: number = 12, isBold: boolean = false, x: number = margin) => {
      pdf.setFontSize(fontSize);
      if (isBold) {
        pdf.setFont('helvetica', 'bold');
      } else {
        pdf.setFont('helvetica', 'normal');
      }
      
      const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin);
      pdf.text(lines, x, yPosition);
      yPosition += lines.length * (fontSize * 0.4) + 5;
      
      // Verificar se precisa de nova página
      if (yPosition > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
    };

    // Cabeçalho principal
    addCenteredText('JWS EMPREITEIRA', 16, true);
    yPosition += 10;

    // Título do diário
    addCenteredText(`Diário de Obra – ${projectName}`, 14, true);
    yPosition += 5;

    // Subtítulo
    addCenteredText(serviceType || 'Serviços Executados', 12, true);
    yPosition += 5;

    // Período - corrigindo timezone para evitar redução de dia
    const startDateObj = new Date(startDate + 'T12:00:00');
    const endDateObj = new Date(endDate + 'T12:00:00');
    addCenteredText(`Período: ${startDateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a ${endDateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`, 12);
    yPosition += 15;

    // Relatório fotográfico
    addText(`Relatório fotográfico referente à execução da ${serviceType || 'obra'}.`, 12);
    yPosition += 5;

    addText(serviceType || 'Descrição dos serviços executados.', 12, true);
    yPosition += 5;

    // Descrição detalhada
    const detailedDescription = `Serviço realizado entre os dias ${startDateObj.toLocaleDateString('pt-BR')} e ${endDateObj.toLocaleDateString('pt-BR')}. ${description || 'Atividades executadas conforme especificações técnicas.'} ${observations || ''}`;
    addText(detailedDescription, 11);
    yPosition += 15;

    // Adicionar imagens com legendas (máximo 15 imagens para evitar problemas)
    if (images.length > 0) {
      let imageCounter = 1;
      const maxImages = Math.min(images.length, 15); // Limitar a 15 imagens
      
      if (images.length > 15) {
        addText(`Nota: Exibindo as primeiras 15 imagens de ${images.length} total.`, 10);
        yPosition += 10;
      }
      
      for (let i = 0; i < maxImages; i++) {
        const image = images[i];
        try {
          console.log(`Processando imagem ${i + 1} de ${maxImages}`);
          const base64 = await imageToBase64(image);
          
          // Nova página para cada imagem
          pdf.addPage();
          
          // Centralizar verticalmente na página
          const imgWidth = 180; // Aumentado de 150 para 180
          const imgHeight = 140; // Aumentado de 120 para 140
          const titleHeight = 20;
          const totalContentHeight = titleHeight + imgHeight;
          const startY = (pageHeight - totalContentHeight) / 2;
          
          // Resetar posição Y para centralizar
          yPosition = startY;
          
          // Adicionar título da imagem centralizado
          addCenteredText(`${serviceType || 'Serviço'} – Imagem ${imageCounter}`, 12, true);
          yPosition += 10;
          
          // Adicionar imagem centralizada horizontal e verticalmente
          const imgX = (pageWidth - imgWidth) / 2;
          
          // Adicionar imagem com melhor qualidade
          pdf.addImage(base64, 'JPEG', imgX, yPosition, imgWidth, imgHeight, undefined, 'MEDIUM');
          
          imageCounter++;
        } catch (error) {
          console.error(`Erro ao processar imagem ${i + 1}:`, error);
          // Continuar com as próximas imagens mesmo se uma falhar
          pdf.addPage();
          yPosition = margin;
          addText(`Erro ao carregar imagem ${imageCounter}`, 10);
          imageCounter++;
        }
      }
    }

    // Seção de resultado com imagem separada
    if (resultImage && typeof resultImage === 'object' && 'arrayBuffer' in resultImage) {
      try {
        console.log('Processando imagem de resultado');
        const base64 = await imageToBase64(resultImage);
        
        // Nova página para o resultado
        pdf.addPage();
        
        // Centralizar verticalmente na página
        const imgWidth = 180; // Aumentado de 150 para 180
        const imgHeight = 140; // Aumentado de 120 para 140
        const titleHeight = 20;
        const totalContentHeight = titleHeight + imgHeight;
        const startY = (pageHeight - totalContentHeight) / 2;
        
        // Resetar posição Y para centralizar
        yPosition = startY;
        
        addCenteredText('Resultado:', 14, true);
        yPosition += 10;
        
        // Adicionar imagem de resultado centralizada
        const imgX = (pageWidth - imgWidth) / 2;
        
        // Adicionar imagem de resultado com melhor qualidade
        pdf.addImage(base64, 'JPEG', imgX, yPosition, imgWidth, imgHeight, undefined, 'MEDIUM');
      } catch (error) {
        console.error('Erro ao processar imagem de resultado:', error);
      }
    }

    // Informações do projeto no final
    pdf.addPage();
    yPosition = margin + 50; // Espaço do topo
    addText('INFORMAÇÕES DO PROJETO:', 12, true);
    addText(`Cliente: ${clientName}`, 11);
    addText(`Local: ${location}`, 11);
    addText(`Data de execução: ${startDateObj.toLocaleDateString('pt-BR')} a ${endDateObj.toLocaleDateString('pt-BR')}`, 11);

    // Gerar PDF como buffer
    const pdfBuffer = pdf.output('arraybuffer');

    // Retornar PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="diario_obra_${projectName.replace(/\s+/g, '_')}_${startDate}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 