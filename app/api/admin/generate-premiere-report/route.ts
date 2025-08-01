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

// Função para carregar logo da Premiere
function loadPremiereLogo(): string | null {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'images', 'logo_premiere.png');
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      return `data:image/png;base64,${logoBuffer.toString('base64')}`;
    }
  } catch (error) {
    console.error('Erro ao carregar logo da Premiere:', error);
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
    console.log('Iniciando geração de relatório Premiere...');
    
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
    
    // Recuperar nome do relatório e descrição
    const reportName = formData.get('reportName') as string || 'Relatório de Obra';
    const reportDescription = formData.get('reportDescription') as string || '';
    
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
      includeHeaderFooter: true,
      includeFinalConsiderations: true
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

    // Processar considerações finais
    const finalConsiderations = formData.get('finalConsiderations') as string || '';

    // Processar localização
    const workLocation = formData.get('location') as string || 'Local da Obra';

    // Carregar logos
    const companyLogo = loadCompanyLogo();
    const premiereLogo = loadPremiereLogo();

    // Criar PDF em orientação horizontal
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const fullHeaderHeight = 40;
    const simpleHeaderHeight = 25;
    const footerHeight = 20;
    let yPosition = margin + fullHeaderHeight;

    // Função para criar página de capa do Diário de Obra
    const addCoverPage = () => {
      // Criar fundo degradê do azul ao branco
      const gradientSteps = 30;
      const stepHeight = pageHeight / gradientSteps;
      
      for (let i = 0; i < gradientSteps; i++) {
        // Interpolação de cores do azul (70, 130, 180) ao branco (255, 255, 255)
        const ratio = i / (gradientSteps - 1);
        const r = Math.round(70 + (255 - 70) * ratio);
        const g = Math.round(130 + (255 - 130) * ratio);
        const b = Math.round(180 + (255 - 180) * ratio);
        
        pdf.setFillColor(r, g, b);
        pdf.rect(0, i * stepHeight, pageWidth, stepHeight + 1, 'F');
      }
      

      
      // Logo da Premiere bem centralizada (otimizada para horizontal)
      if (premiereLogo) {
        const logoSize = 80; // Logo um pouco maior para aproveitar o espaço horizontal
        const logoX = (pageWidth - logoSize) / 2;
        const logoY = (pageHeight - logoSize) / 2 - 20; // Centro da página, um pouco para cima
        
        pdf.addImage(premiereLogo, 'PNG', logoX, logoY, logoSize, logoSize);
      }
      
      // Título principal logo abaixo da logo, centralizado
      pdf.setFontSize(28); // Texto maior para aproveitar o espaço
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      const title = 'PREMIERE CONSTRUÇÃO CIVIL';
      const titleWidth = pdf.getTextWidth(title);
      const titleY = (pageHeight / 2) + 35; // Logo abaixo do centro
      pdf.text(title, (pageWidth - titleWidth) / 2, titleY);
      
      // Reset completo de estilos
      pdf.setTextColor(0, 0, 0);
      pdf.setFillColor(0, 0, 0);
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.2);
    };

    // Função para criar página de título do diário
    const addTitlePage = (dateRange: string, location: string) => {
      pdf.addPage();
      
      // Criar fundo degradê do azul ao branco
      const gradientSteps = 30;
      const stepHeight = pageHeight / gradientSteps;
      
      for (let i = 0; i < gradientSteps; i++) {
        // Interpolação de cores do azul (70, 130, 180) ao branco (255, 255, 255)
        const ratio = i / (gradientSteps - 1);
        const r = Math.round(70 + (255 - 70) * ratio);
        const g = Math.round(130 + (255 - 130) * ratio);
        const b = Math.round(180 + (255 - 180) * ratio);
        
        pdf.setFillColor(r, g, b);
        pdf.rect(0, i * stepHeight, pageWidth, stepHeight + 1, 'F');
      }
      
      // Logo da Premiere centralizada (otimizada para horizontal)
      if (premiereLogo) {
        const logoSize = 60; // Logo maior para página de título horizontal
        const logoX = (pageWidth - logoSize) / 2;
        const logoY = pageHeight / 2 - 75; // Movido mais para cima para dar espaço aos novos campos
        
        pdf.addImage(premiereLogo, 'PNG', logoX, logoY, logoSize, logoSize);
      }
      
      // Nome do relatório personalizado
      pdf.setFontSize(28);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      const reportTitleWidth = pdf.getTextWidth(reportName);
      pdf.text(reportName, (pageWidth - reportTitleWidth) / 2, (pageHeight / 2) - 10);
      
      // Título do diário abaixo do nome do relatório
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      const diaryTitle = `Diário de Obra (${dateRange})`;
      const diaryTitleWidth = pdf.getTextWidth(diaryTitle);
      pdf.text(diaryTitle, (pageWidth - diaryTitleWidth) / 2, (pageHeight / 2) + 10);
      
      // Local
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'normal');
      const locationWidth = pdf.getTextWidth(location);
      pdf.text(location, (pageWidth - locationWidth) / 2, (pageHeight / 2) + 30);
      
      // Descrição do relatório
      if (reportDescription) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'italic');
        
        // Quebra de texto se for muito longo
        const maxWidth = pageWidth - 80;
        const textLines = pdf.splitTextToSize(reportDescription, maxWidth);
        
        // Calcular posição Y baseada no número de linhas
        const lineHeight = 7;
        const descriptionY = (pageHeight / 2) + 50;
        
        pdf.text(textLines, (pageWidth - maxWidth) / 2, descriptionY);
      }
      
      // Reset completo de estilos
      pdf.setTextColor(0, 0, 0);
      pdf.setFillColor(0, 0, 0);
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.2);
    };

               // Função para adicionar 4 fotos em layout 2x2
      const add4PhotosPage = async (photos: any[], startIndex: number, photosPerPage: number = 4) => {
        pdf.addPage();
        
        // Criar fundo degradê do azul ao branco
        // Simulando degradê com múltiplas camadas
        const gradientSteps = 20;
        const stepHeight = pageHeight / gradientSteps;
        
        for (let i = 0; i < gradientSteps; i++) {
          // Interpolação de cores do azul (70, 130, 180) ao branco (255, 255, 255)
          const ratio = i / (gradientSteps - 1);
          const r = Math.round(70 + (255 - 70) * ratio);
          const g = Math.round(130 + (255 - 130) * ratio);
          const b = Math.round(180 + (255 - 180) * ratio);
          
          pdf.setFillColor(r, g, b);
          pdf.rect(0, i * stepHeight, pageWidth, stepHeight + 1, 'F');
        }
        

        
        // Margens otimizadas para orientação horizontal
        const margin = 10;
        const spacing = 8;
        
        // Calcular posições para 4 fotos maiores (2x2) - melhor aproveitamento horizontal
        const availableWidth = pageWidth - 2 * margin - spacing;
        const availableHeight = pageHeight - 2 * margin - spacing - 25; // 25 para legenda
        
        const photoWidth = availableWidth / 2;
        const photoHeight = availableHeight / 2;
        
        // Posições das fotos (bem preenchidas)
        const positions = [
          { x: margin, y: margin }, // Top left
          { x: margin + photoWidth + spacing, y: margin }, // Top right
          { x: margin, y: margin + photoHeight + spacing }, // Bottom left
          { x: margin + photoWidth + spacing, y: margin + photoHeight + spacing } // Bottom right
        ];
        
        // Adicionar fotos
        for (let i = 0; i < Math.min(photosPerPage, photos.length - startIndex); i++) {
          const photo = photos[startIndex + i];
          const pos = positions[i];
          
          if (photo && pos) {
            try {
              const base64Image = await imageToBase64(photo.file);
              
              // Adicionar borda sutil branca nas fotos
              pdf.setFillColor(255, 255, 255);
              pdf.rect(pos.x - 2, pos.y - 2, photoWidth + 4, photoHeight + 4, 'F');
              
              // Adicionar a foto
              pdf.addImage(base64Image, 'JPEG', pos.x, pos.y, photoWidth, photoHeight);
              
              // Adicionar borda fina cinza
              pdf.setDrawColor(200, 200, 200);
              pdf.setLineWidth(0.5);
              pdf.rect(pos.x, pos.y, photoWidth, photoHeight);
              
            } catch (error) {
              console.error(`Erro ao processar foto ${startIndex + i + 1}:`, error);
              // Placeholder para foto com erro
              pdf.setFillColor(245, 245, 245);
              pdf.rect(pos.x, pos.y, photoWidth, photoHeight, 'F');
              
              pdf.setDrawColor(200, 200, 200);
              pdf.setLineWidth(1);
              pdf.rect(pos.x, pos.y, photoWidth, photoHeight);
              
              pdf.setFontSize(12);
              pdf.setTextColor(150, 150, 150);
              const errorText = 'Erro ao carregar foto';
              const errorWidth = pdf.getTextWidth(errorText);
              pdf.text(errorText, pos.x + (photoWidth - errorWidth) / 2, pos.y + photoHeight / 2);
              pdf.setTextColor(0, 0, 0);
            }
          }
        }
        
        // Legenda na parte inferior com degradê
        const legendY = pageHeight - 15;
        
        // Continuar o degradê na área da legenda
        const legendSteps = 5;
        const legendStepHeight = 25 / legendSteps;
        
        for (let i = 0; i < legendSteps; i++) {
          // Continuar a interpolação do degradê na área da legenda
          const baseRatio = (pageHeight - 25 + i * legendStepHeight) / pageHeight;
          const ratio = baseRatio;
          const r = Math.round(70 + (255 - 70) * ratio);
          const g = Math.round(130 + (255 - 130) * ratio);
          const b = Math.round(180 + (255 - 180) * ratio);
          
          pdf.setFillColor(r, g, b);
          pdf.rect(0, pageHeight - 25 + i * legendStepHeight, pageWidth, legendStepHeight + 1, 'F');
        }
        
        pdf.setFontSize(12); // Fonte um pouco maior para orientação horizontal
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0); // Preto
        
        const endIndex = Math.min(startIndex + photosPerPage, photos.length);
        const legendText = `Foto ${startIndex + 1} a ${endIndex}: ${photos[startIndex]?.serviceName || 'Serviços executados'}.`;
        const legendWidth = pdf.getTextWidth(legendText);
        pdf.text(legendText, (pageWidth - legendWidth) / 2, legendY);
        
        // Reset completo de estilos
        pdf.setTextColor(0, 0, 0);
        pdf.setFillColor(0, 0, 0);
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.2);
        pdf.setFont('helvetica', 'normal');
      };

         // Calcular período das datas dos serviços
     let dateRange = '';
     if (servicesData.length > 0) {
       const dates = servicesData.filter((s: any) => s.startDate || s.endDate);
       if (dates.length > 0) {
         const startDates = dates.filter((s: any) => s.startDate).map((s: any) => new Date(s.startDate + 'T12:00:00'));
         const endDates = dates.filter((s: any) => s.endDate).map((s: any) => new Date(s.endDate + 'T12:00:00'));
         
         if (startDates.length > 0 && endDates.length > 0) {
                       const minDate = new Date(Math.min(...startDates.map((d: Date) => d.getTime())));
            const maxDate = new Date(Math.max(...endDates.map((d: Date) => d.getTime())));
           
           const formatDate = (date: Date) => {
             return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
           };
           
           dateRange = `${formatDate(minDate)} a ${formatDate(maxDate)}`;
         }
       }
     }
     
     if (!dateRange) {
       const today = new Date();
       const tomorrow = new Date(today);
       tomorrow.setDate(tomorrow.getDate() + 1);
       
       const formatDate = (date: Date) => {
         return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
       };
       
       dateRange = `${formatDate(today)} a ${formatDate(tomorrow)}`;
     }

           // Criar páginas do diário de obra
      console.log('Criando capa do diário...');
      addCoverPage();

      console.log('Criando página de título...');
      addTitlePage(dateRange, workLocation);

     // Processar imagens por serviço (cada serviço em páginas separadas)
     if (images.length > 0) {
       console.log(`Processando ${images.length} imagens organizadas por serviço...`);
       
       // Organizar imagens por serviço
       const imagesByService: { [key: string]: any[] } = {};
       
       for (const image of images) {
         if (!imagesByService[image.serviceId]) {
           imagesByService[image.serviceId] = [];
         }
         imagesByService[image.serviceId].push(image);
       }
       
       // Processar cada serviço separadamente
       for (const service of servicesData) {
         const serviceImages = imagesByService[service.id] || [];
         
         if (serviceImages.length > 0) {
           console.log(`Processando serviço "${service.name}" com ${serviceImages.length} imagens...`);
           
           // Processar imagens do serviço em grupos de 4
           for (let i = 0; i < serviceImages.length; i += 4) {
             console.log(`Criando página de fotos do serviço "${service.name}" - página ${Math.floor(i / 4) + 1}...`);
             await add4PhotosPage(serviceImages, i, 4);
           }
         }
       }
     } else {
       console.log('Nenhuma imagem para processar');
     }

    console.log('PDF gerado com sucesso');

    // Retornar PDF
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));
    
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="diario_obra_premiere.pdf"',
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error: any) {
    console.error('Erro interno do servidor:', error);
    return NextResponse.json(
      { 
        message: 'Erro interno do servidor',
        details: error.message 
      },
      { status: 500 }
    );
  }
} 