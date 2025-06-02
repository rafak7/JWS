import { NextRequest, NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';
import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';

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

    // Processar configurações do relatório
    let config = {
      includeCompanyHeader: true,
      includeServicesList: true,
      includeServiceDates: true,
      includeServiceObservations: true,
      includeImageComments: true,
      includeResultImage: true,
      includePhotographicReport: true,
      includeHeaderFooter: true
    };
    try {
      const configData = formData.get('config');
      if (configData) {
        config = { ...config, ...JSON.parse(configData as string) };
      }
      console.log('Configurações processadas:', config);
    } catch (error) {
      console.error('Erro ao processar configurações:', error);
      // Continuar com configurações padrão
    }

    // Processar imagens com informações do serviço
    console.log('Processando imagens...');
    const images: any[] = [];
    const formDataEntries = Array.from(formData.entries());
    
    for (const [key, value] of formDataEntries) {
      if (key.startsWith('image_') && !key.includes('_serviceId') && !key.includes('_comment') && value && typeof value === 'object' && 'arrayBuffer' in value) {
        const imageIndex = key.replace('image_', '');
        const serviceId = formData.get(`image_${imageIndex}_serviceId`) as string;
        const comment = formData.get(`image_${imageIndex}_comment`) as string || '';
        const service = servicesData.find((s: any) => s.id === serviceId);
        
        images.push({
          file: value,
          serviceId: serviceId,
          serviceName: service?.name || 'Serviço',
          comment: comment
        });
      }
    }
    
    console.log('Total de imagens processadas:', images.length);

    // Processar imagem de resultado separada
    const resultImage = formData.get('resultImage');

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
      // Salvar estado atual
      const currentFontSize = pdf.getFontSize();
      const currentFont = pdf.getFont();
      
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
      
      // Primeira linha: Telefone e Email
      const phoneX = mainSectionX;
      const emailX = mainSectionX + 65;
      
      // Telefone
      pdf.setFont('helvetica', 'bold');
      pdf.text('Tel:', phoneX, contactY1);
      pdf.setFont('helvetica', 'normal');
      pdf.text('(21) 98450-6031', phoneX + 12, contactY1);
      
      // Email (verificar se cabe na página)
      pdf.setFont('helvetica', 'bold');
      pdf.text('Email:', emailX, contactY1);
      pdf.setFont('helvetica', 'normal');
      const emailText = 'jws.manutencao@gmail.com';
      const emailWidth = pdf.getTextWidth(emailText);
      const availableWidth = pageWidth - margin - emailX - 16 - 10; // margem de segurança
      
      if (emailWidth <= availableWidth) {
        pdf.text(emailText, emailX + 16, contactY1);
      } else {
        // Se não couber, colocar na segunda linha
        pdf.text(emailText, phoneX + 80, contactY2);
      }
      
      // Segunda linha: CNPJ
      pdf.setFont('helvetica', 'bold');
      pdf.text('CNPJ:', phoneX, contactY2);
      pdf.setFont('helvetica', 'normal');
      pdf.text('42.316.144/0001-70', phoneX + 16, contactY2);
      
      // Linha separadora elegante
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
      pdf.text('Relatório de Obra', margin + 28, margin + 17);
      
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
      const bottomLimit = config.includeHeaderFooter ? pageHeight - margin - footerHeight : pageHeight - margin;
      if (yPosition > bottomLimit) {
        pdf.addPage();
        if (config.includeHeaderFooter) {
          addHeader();
          yPosition = margin + simpleHeaderHeight;
        } else {
          yPosition = margin;
        }
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
      const bottomLimit = config.includeHeaderFooter ? pageHeight - margin - footerHeight : pageHeight - margin;
      if (yPosition > bottomLimit) {
        pdf.addPage();
        if (config.includeHeaderFooter) {
          addHeader();
          yPosition = margin + simpleHeaderHeight;
        } else {
          yPosition = margin;
        }
      }
    };

    // Não criar página inicial - começar diretamente com os serviços
    let needsInitialPage = false;

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
      let isFirstService = true;
      for (const service of servicesData) {
        const serviceImages = imagesByService.get(service.id) || [];
        
        if (serviceImages.length > 0) {
          console.log(`Processando serviço: ${service.name} com ${serviceImages.length} imagens`);
          
          // Nova página para o cabeçalho do serviço (exceto se for o primeiro serviço e não precisamos de página inicial)
          if (needsInitialPage || !isFirstService) {
            pdf.addPage();
          }
          
          if (config.includeHeaderFooter) {
            addHeader(isFirstService);
            yPosition = margin + (isFirstService ? fullHeaderHeight : simpleHeaderHeight) + 30;
          } else {
            yPosition = margin + 30;
          }
          
          isFirstService = false;
          
          // Cabeçalho do serviço
          if (config.includeCompanyHeader) {
            addCenteredText('JWS EMPREITEIRA', 16, true);
            yPosition += 10;
            
            addCenteredText('Diário de Obra', 14, true);
            yPosition += 10;
          }
          
          // Informações específicas do serviço
          addCenteredText(`${service.name}`, 14, true);
          yPosition += 5;
          
          if (config.includeServiceDates) {
            const serviceStartDate = new Date(service.startDate + 'T12:00:00');
            const serviceEndDate = new Date(service.endDate + 'T12:00:00');
            addCenteredText(`Período: ${serviceStartDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a ${serviceEndDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`, 12);
            yPosition += 15;
          }
          
          if (config.includePhotographicReport) {
            addText(`Relatório fotográfico referente à execução do serviço.`, 12);
          }
          
          // Adicionar observações se existirem
          if (config.includeServiceObservations && service.observations && service.observations.trim()) {
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
              if (config.includeHeaderFooter) {
                addHeader();
              }
              
              // Centralizar verticalmente na página
              const imgWidth = 150;
              const imgHeight = 120;
              const titleHeight = 20;
              const totalContentHeight = titleHeight + imgHeight;
              
              let availableHeight, startY;
              if (config.includeHeaderFooter) {
                availableHeight = pageHeight - simpleHeaderHeight - footerHeight - (2 * margin);
                startY = margin + simpleHeaderHeight + (availableHeight - totalContentHeight) / 2;
              } else {
                availableHeight = pageHeight - (2 * margin);
                startY = margin + (availableHeight - totalContentHeight) / 2;
              }
              
              // Resetar posição Y para centralizar
              yPosition = startY;
              
              // Adicionar título da imagem centralizado
              addCenteredText(`${service.name} – Imagem ${imageCounter}`, 12, true);
              yPosition += 10;
              
              // Adicionar imagem centralizada horizontal e verticalmente
              const imgX = (pageWidth - imgWidth) / 2;
              
              pdf.addImage(base64, 'JPEG', imgX, yPosition, imgWidth, imgHeight);
              yPosition += imgHeight + 10;
              
              // Adicionar comentário da imagem se existir
              if (config.includeImageComments && imageData.comment && imageData.comment.trim()) {
                addCenteredText(imageData.comment, 10);
              }
              
              imageCounter++;
            } catch (error) {
              console.error(`Erro ao processar imagem ${i + 1} do serviço ${service.name}:`, error);
              // Continuar com as próximas imagens mesmo se uma falhar
              pdf.addPage();
              if (config.includeHeaderFooter) {
                addHeader();
                yPosition = margin + simpleHeaderHeight;
              } else {
                yPosition = margin;
              }
              addText(`Erro ao carregar imagem ${imageCounter}`, 10);
              imageCounter++;
            }
          }
        }
      }
    }

    // Seção de resultado com imagem separada
    if (config.includeResultImage && resultImage && typeof resultImage === 'object' && 'arrayBuffer' in resultImage) {
      try {
        console.log('Processando imagem de resultado');
        const base64 = await imageToBase64(resultImage);
        
        // Nova página para o resultado (sempre criar nova página para resultado)
        pdf.addPage();
        if (config.includeHeaderFooter) {
          addHeader();
        }
        
        // Centralizar verticalmente na página
        const imgWidth = 150;
        const imgHeight = 120;
        const titleHeight = 20;
        const totalContentHeight = titleHeight + imgHeight;
        
        let availableHeight, startY;
        if (config.includeHeaderFooter) {
          availableHeight = pageHeight - simpleHeaderHeight - footerHeight - (2 * margin);
          startY = margin + simpleHeaderHeight + (availableHeight - totalContentHeight) / 2;
        } else {
          availableHeight = pageHeight - (2 * margin);
          startY = margin + (availableHeight - totalContentHeight) / 2;
        }
        
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

    // Adicionar footers em todas as páginas se habilitado
    if (config.includeHeaderFooter) {
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        addFooter();
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