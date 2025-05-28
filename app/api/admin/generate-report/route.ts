import { NextRequest, NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';
import { jsPDF } from 'jspdf';

// Configuração de runtime para esta API route
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 segundos (máximo para plano hobby)

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
  const maxSize = 500 * 1024; // 500KB
  let base64 = buffer.toString('base64');
  
  // Se a imagem for muito grande, reduzir qualidade
  if (buffer.length > maxSize) {
    // Reduzir para aproximadamente 70% do tamanho original
    const reducedBuffer = buffer.subarray(0, Math.floor(buffer.length * 0.7));
    base64 = reducedBuffer.toString('base64');
  }
  
  const mimeType = file.type || 'image/jpeg';
  return `data:${mimeType};base64,${base64}`;
}

export async function POST(request: NextRequest) {
  try {
    console.log('Iniciando geração de relatório...');
    
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

    // Processar FormData
    console.log('Processando FormData...');
    const formData = await request.formData();
    
    console.log('Dados básicos processados');
    
    let servicesData = [];
    try {
      servicesData = JSON.parse(formData.get('services') as string || '[]');
      console.log('Serviços processados:', servicesData.length);
    } catch (error) {
      console.error('Erro ao processar serviços:', error);
      return NextResponse.json(
        { message: 'Erro ao processar dados dos serviços' },
        { status: 400 }
      );
    }

    // Processar imagens com informações do serviço
    console.log('Processando imagens...');
    const images: any[] = [];
    const formDataEntries = Array.from(formData.entries());
    
    for (const [key, value] of formDataEntries) {
      if (key.startsWith('image_') && !key.includes('_serviceId') && value && typeof value === 'object' && 'arrayBuffer' in value) {
        const imageIndex = key.replace('image_', '');
        const serviceId = formData.get(`image_${imageIndex}_serviceId`) as string;
        const service = servicesData.find((s: any) => s.id === serviceId);
        
        images.push({
          file: value,
          serviceId: serviceId,
          serviceName: service?.name || 'Serviço'
        });
      }
    }
    
    console.log('Total de imagens processadas:', images.length);

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

    // Página inicial com resumo geral
    addCenteredText('JWS EMPREITEIRA', 16, true);
    yPosition += 10;

    addCenteredText('Diário de Obra', 14, true);
    yPosition += 10;

    // Lista de serviços na página inicial
    addText('Serviços Executados:', 12, true);
    yPosition += 5;

    servicesData.forEach((service: any, index: number) => {
      const serviceStartDate = new Date(service.startDate + 'T12:00:00');
      const serviceEndDate = new Date(service.endDate + 'T12:00:00');
      addText(`${index + 1}. ${service.name} (${serviceStartDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a ${serviceEndDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})`, 11);
    });

    yPosition += 10;
    addText('Relatório fotográfico referente à execução dos serviços.', 12);
    yPosition += 15;

    // Organizar imagens por serviço e processar cada serviço separadamente
    if (images.length > 0) {
      // Agrupar imagens por serviço
      const imagesByService = new Map();
      
      images.forEach(imageData => {
        if (!imagesByService.has(imageData.serviceId)) {
          imagesByService.set(imageData.serviceId, []);
        }
        imagesByService.get(imageData.serviceId).push(imageData);
      });
      
      console.log(`Processando ${imagesByService.size} serviços com imagens`);
      
      // Processar cada serviço separadamente
      for (const service of servicesData) {
        const serviceImages = imagesByService.get(service.id) || [];
        
        if (serviceImages.length > 0) {
          console.log(`Processando serviço: ${service.name} com ${serviceImages.length} imagens`);
          
          // Nova página para o cabeçalho do serviço
          pdf.addPage();
          yPosition = margin + 50;
          
          // Cabeçalho do serviço
          addCenteredText('JWS EMPREITEIRA', 16, true);
          yPosition += 10;
          
          addCenteredText('Diário de Obra', 14, true);
          yPosition += 10;
          
          // Informações específicas do serviço
          const serviceStartDate = new Date(service.startDate + 'T12:00:00');
          const serviceEndDate = new Date(service.endDate + 'T12:00:00');
          
          addCenteredText(`${service.name}`, 14, true);
          yPosition += 5;
          
          addCenteredText(`Período: ${serviceStartDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a ${serviceEndDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`, 12);
          yPosition += 15;
          
          addText(`Relatório fotográfico referente à execução do serviço.`, 12);
          
          // Adicionar observações se existirem
          if (service.observations && service.observations.trim()) {
            yPosition += 10;
            addText('Observações:', 12, true);
            addText(service.observations, 11);
          }
          
          yPosition += 15;
          
          // Processar imagens do serviço (máximo 20 por serviço)
          const maxImagesPerService = Math.min(serviceImages.length, 20);
          
          if (serviceImages.length > 20) {
            addText(`Nota: Exibindo as primeiras 20 imagens de ${serviceImages.length} total para este serviço.`, 10);
            yPosition += 10;
          }
          
          let imageCounter = 1;
          for (let i = 0; i < maxImagesPerService; i++) {
            const imageData = serviceImages[i];
            try {
              console.log(`Processando imagem ${i + 1} de ${maxImagesPerService} do serviço ${service.name}`);
              const base64 = await imageToBase64(imageData.file);
              
              // Nova página para cada imagem
              pdf.addPage();
              
              // Centralizar verticalmente na página
              const imgWidth = 150;
              const imgHeight = 120;
              const titleHeight = 20;
              const totalContentHeight = titleHeight + imgHeight;
              const startY = (pageHeight - totalContentHeight) / 2;
              
              // Resetar posição Y para centralizar
              yPosition = startY;
              
              // Adicionar título da imagem centralizado
              addCenteredText(`${service.name} – Imagem ${imageCounter}`, 12, true);
              yPosition += 10;
              
              // Adicionar imagem centralizada horizontal e verticalmente
              const imgX = (pageWidth - imgWidth) / 2;
              
              pdf.addImage(base64, 'JPEG', imgX, yPosition, imgWidth, imgHeight);
              
              imageCounter++;
            } catch (error) {
              console.error(`Erro ao processar imagem ${i + 1} do serviço ${service.name}:`, error);
              // Continuar com as próximas imagens mesmo se uma falhar
              pdf.addPage();
              yPosition = margin;
              addText(`Erro ao carregar imagem ${imageCounter}`, 10);
              imageCounter++;
            }
          }
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
        const imgWidth = 150;
        const imgHeight = 120;
        const titleHeight = 20;
        const totalContentHeight = titleHeight + imgHeight;
        const startY = (pageHeight - totalContentHeight) / 2;
        
        // Resetar posição Y para centralizar
        yPosition = startY;
        
        addCenteredText('Resultado:', 14, true);
        yPosition += 10;
        
        // Adicionar imagem de resultado centralizada
        const imgX = (pageWidth - imgWidth) / 2;
        
        pdf.addImage(base64, 'JPEG', imgX, yPosition, imgWidth, imgHeight);
      } catch (error) {
        console.error('Erro ao processar imagem de resultado:', error);
      }
    }

    // Gerar PDF como buffer
    const pdfBuffer = pdf.output('arraybuffer');

    // Retornar PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="relatorio_obra_${Date.now()}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error('Erro ao gerar relatório:', error);
    
    // Retornar erro mais específico
    let errorMessage = 'Erro interno do servidor';
    if (error.message) {
      errorMessage = `Erro: ${error.message}`;
    }
    
    return NextResponse.json(
      { 
        message: errorMessage,
        details: error.toString(),
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 