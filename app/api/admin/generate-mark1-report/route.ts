import { NextRequest, NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';
import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';

// Configuração de runtime para esta API route
export const runtime = 'nodejs';
// 60 segundos (máximo para plano hobby)

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

// Função para carregar logo da Mark1
function loadMark1Logo(): string | null {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'images', 'logo-mark1.jpeg');
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      return `data:image/jpeg;base64,${logoBuffer.toString('base64')}`;
    }
  } catch (error) {
    console.error('Erro ao carregar logo da Mark1:', error);
  }
  return null;
}

// Função para converter imagem para base64 com compressão
async function imageToBase64(file: any): Promise<string> {
  try {
    console.log(`Convertendo imagem para base64, tipo: ${file.type}, tamanho: ${file.size} bytes`);
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Limitar tamanho da imagem para evitar problemas de memória
    const maxSize = 1000 * 1024; // 1MB
    let base64 = buffer.toString('base64');
    
    console.log(`Tamanho do buffer original: ${buffer.length} bytes`);
    
    // Se a imagem for muito grande, reduzir qualidade
    if (buffer.length > maxSize) {
      console.log(`Imagem muito grande (${buffer.length} bytes), reduzindo tamanho`);
      // Reduzir para aproximadamente 70% do tamanho original
      const compressionRatio = maxSize / buffer.length;
      const reducedBuffer = buffer.subarray(0, Math.floor(buffer.length * compressionRatio));
      base64 = reducedBuffer.toString('base64');
      console.log(`Tamanho reduzido: ${reducedBuffer.length} bytes`);
    }
    
    const mimeType = file.type || 'image/jpeg';
    const result = `data:${mimeType};base64,${base64}`;
    console.log(`Base64 gerado com sucesso, tamanho final: ${result.length} caracteres`);
    
    return result;
  } catch (error) {
    console.error('Erro ao converter imagem para base64:', error);
    throw new Error('Falha ao processar imagem');
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const services = JSON.parse(formData.get('services') as string);
    const config = JSON.parse(formData.get('config') as string);
    const finalConsiderations = formData.get('finalConsiderations') as string;
    const location = formData.get('location') as string;
    
    console.log('Iniciando geração do relatório Mark1');
    console.log(`Serviços recebidos: ${services.length}`);
    
    // Processar imagens dos serviços
    const serviceImages: any[] = [];
    
    for (let i = 0; i < 100; i++) {
      const imageFile = formData.get(`image_${i}`);
      if (!imageFile) break;
      
      const serviceId = formData.get(`image_${i}_serviceId`) as string;
      const comment = formData.get(`image_${i}_comment`) as string;
      const service = services.find((s: any) => s.id === serviceId);
      
      console.log(`Processando imagem ${i} para serviço ${serviceId}`);
      
      if (service && imageFile instanceof Blob) {
        console.log(`Convertendo imagem ${i} para base64`);
        const imageBase64 = await imageToBase64(imageFile);
        console.log(`Imagem ${i} convertida com sucesso, tamanho: ${imageBase64.length}`);
        
        serviceImages.push({
          image: imageBase64,
          serviceName: service.name,
          serviceId: serviceId,
          comment: comment
        });
      }
    }
    
    console.log(`Total de imagens processadas: ${serviceImages.length}`);

    // Processar fluxogramas
    const flowcharts: any[] = [];
    const flowchartsCount = parseInt(formData.get('flowchartsCount') as string || '0');
    
    console.log(`Processando ${flowchartsCount} fluxogramas`);
    
    for (let i = 0; i < flowchartsCount; i++) {
      const flowchartFile = formData.get(`flowchart_${i}`);
      if (!flowchartFile) continue;
      
      const comment = formData.get(`flowchart_${i}_comment`) as string;
      
      console.log(`Processando fluxograma ${i}`);
      
      if (flowchartFile instanceof Blob) {
        console.log(`Convertendo fluxograma ${i} para base64`);
        const flowchartBase64 = await imageToBase64(flowchartFile);
        console.log(`Fluxograma ${i} convertido com sucesso`);
        
        flowcharts.push({
          image: flowchartBase64,
          comment: comment
        });
      }
    }
    
    console.log(`Total de fluxogramas processados: ${flowcharts.length}`);
    
    // Carregar logo
    const mark1LogoPath = path.join(process.cwd(), 'public/images/logo-mark1.jpeg');
    const mark1Logo = fs.readFileSync(mark1LogoPath).toString('base64');
    
    // Criar PDF
    const { jsPDF } = await import('jspdf');
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

    // Função para criar o degradê branco-azul escuro
    const createWhiteToNavyGradient = () => {
      const gradientSteps = 30;
      const stepHeight = pageHeight / gradientSteps;
      
      for (let i = 0; i < gradientSteps; i++) {
        // Interpolação de cores do branco (255, 255, 255) ao azul escuro (0, 0, 128)
        const ratio = i / (gradientSteps - 1);
        const r = Math.round(255 - (255) * ratio);
        const g = Math.round(255 - (255) * ratio);
        const b = Math.round(255 - (255 - 128) * ratio);
        
        pdf.setFillColor(r, g, b);
        pdf.rect(0, i * stepHeight, pageWidth, stepHeight + 1, 'F');
      }
    };

    // Função para criar página de capa do Diário de Obra
    const addCoverPage = () => {
      // Criar fundo degradê do branco ao azul escuro
      createWhiteToNavyGradient();
      
      // Logo da Mark1 bem centralizada (otimizada para horizontal)
      if (mark1Logo) {
        const logoSize = 80; // Logo um pouco maior para aproveitar o espaço horizontal
        const logoX = (pageWidth - logoSize) / 2;
        const logoY = (pageHeight - logoSize) / 2 - 20; // Centro da página, um pouco para cima
        
        pdf.addImage(mark1Logo, 'JPEG', logoX, logoY, logoSize, logoSize);
      }
      
      // Título principal logo abaixo da logo, centralizado
      pdf.setFontSize(28); // Texto maior para aproveitar o espaço
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      const title = 'MARK1 SOLUÇÕES EM REFRIGERAÇÃO';
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
      
      // Criar fundo degradê do branco ao azul escuro
      createWhiteToNavyGradient();
      
      // Título principal "Diário de Obra" centralizado e maior
      pdf.setFontSize(36);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0); // Preto para melhor legibilidade
      const mainTitle = 'Diário de Obra';
      const mainTitleWidth = pdf.getTextWidth(mainTitle);
      pdf.text(mainTitle, (pageWidth - mainTitleWidth) / 2, pageHeight / 3);

      // Período
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'normal');
      const periodWidth = pdf.getTextWidth(dateRange);
      pdf.text(dateRange, (pageWidth - periodWidth) / 2, pageHeight / 2);

      // Local
      pdf.setFontSize(20);
      const locationText = `Local: ${location}`;
      const locationWidth = pdf.getTextWidth(locationText);
      pdf.text(locationText, (pageWidth - locationWidth) / 2, (pageHeight / 2) + 20);

      // Reset de estilos
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.2);
    };

    // Função para adicionar 2 fotos por página
    const add2PhotosPage = async (photos: any[], startIndex: number) => {
      pdf.addPage();
      
      // Criar fundo degradê do branco ao azul escuro
      createWhiteToNavyGradient();
      
      // Título da página de fotos
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0); // Preto para o título
      const pageTitle = 'Registro Fotográfico';
      const titleWidth = pdf.getTextWidth(pageTitle);
      pdf.text(pageTitle, (pageWidth - titleWidth) / 2, 20);

      // Linha decorativa abaixo do título
      pdf.setDrawColor(0, 0, 128);
      pdf.setLineWidth(0.5);
      pdf.line((pageWidth - titleWidth - 20) / 2, 25, (pageWidth + titleWidth + 20) / 2, 25);
      
      // Margens otimizadas para orientação horizontal
      const margin = 25; // Aumentado para dar mais respiro
      const spacing = 20; // Aumentado para maior separação entre fotos
      const padding = 10; // Padding interno das fotos
      
      // Calcular posições para 2 fotos lado a lado
      const availableWidth = pageWidth - 2 * margin - spacing;
      const availableHeight = pageHeight - 2 * margin - 40; // 40 para título e legenda
      
      const photoWidth = availableWidth / 2;
      const photoHeight = Math.min(availableHeight, photoWidth * 0.75); // Manter proporção sem distorção
      
      // Verificar se temos imagens para processar
      if (startIndex >= photos.length) {
        console.log('Sem imagens para processar nesta página');
        return;
      }
      
      // Adicionar as fotos
      for (let i = 0; i < 2 && startIndex + i < photos.length; i++) {
        const photo = photos[startIndex + i];
        
        if (!photo || !photo.image) {
          console.error(`Imagem ${startIndex + i} não encontrada ou inválida`);
          continue;
        }
        
        // Calcular posição da foto (2 lado a lado)
        const x = margin + i * (photoWidth + spacing);
        const y = 40; // Começar abaixo do título
        
        try {
          console.log(`Adicionando imagem ${startIndex + i + 1} ao PDF`);
          
          // Adicionar sombra suave
          pdf.setFillColor(220, 220, 220);
          pdf.roundedRect(x + 2, y + 2, photoWidth, photoHeight, 3, 3, 'F');
          
          // Adicionar borda branca
          pdf.setFillColor(255, 255, 255);
          pdf.setDrawColor(240, 240, 240);
          pdf.setLineWidth(0.5);
          pdf.roundedRect(x, y, photoWidth, photoHeight, 3, 3, 'FD');
          
          // Adicionar borda azul fina
          pdf.setDrawColor(0, 0, 128);
          pdf.setLineWidth(0.2);
          pdf.roundedRect(x + 1, y + 1, photoWidth - 2, photoHeight - 2, 2, 2, 'S');
          
          // Adicionar a foto com margens internas
          pdf.addImage(
            photo.image, // Já é base64
            'JPEG',
            x + padding,
            y + padding,
            photoWidth - 2 * padding,
            photoHeight - 2 * padding - 20, // Espaço para legenda
            `img-${startIndex + i}`,
            'MEDIUM' // Qualidade média para melhor visualização
          );
          
          // Legenda da foto
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(0, 0, 0); // Preto para legendas
          const photoNum = startIndex + i + 1;
          const legendY = y + photoHeight - 12;
          
          // Adicionar número da foto
          pdf.setFont('helvetica', 'bold');
          pdf.text(`Foto ${photoNum}`, x + padding, legendY);
          
          // Adicionar comentário da foto se existir
          if (photo.comment) {
            pdf.setFont('helvetica', 'normal');
            const commentX = x + padding + pdf.getTextWidth(`Foto ${photoNum}: `);
            
            // Limitar o tamanho do comentário para caber na largura da foto
            const maxWidth = photoWidth - 2 * padding - pdf.getTextWidth(`Foto ${photoNum}: `);
            let comment = photo.comment;
            
            if (pdf.getTextWidth(comment) > maxWidth) {
              comment = comment.substring(0, 20) + '...';
            }
            
            pdf.text(comment, commentX, legendY);
          }
        } catch (error) {
          console.error(`Erro ao adicionar imagem ${startIndex + i + 1}:`, error);
          
          // Adicionar placeholder em caso de erro
          pdf.setFillColor(240, 240, 240);
          pdf.rect(x + padding, y + padding, photoWidth - 2 * padding, photoHeight - 2 * padding - 20, 'F');
          
          pdf.setFontSize(12);
          pdf.setTextColor(100, 100, 100);
          pdf.text('Erro ao carregar imagem', x + photoWidth / 2 - 40, y + photoHeight / 2);
        }
      }
      
      // Nome do serviço no rodapé
      if (photos[startIndex] && photos[startIndex].serviceName) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0); // Preto para o rodapé
        const serviceName = `Serviço: ${photos[startIndex].serviceName}`;
        const serviceWidth = pdf.getTextWidth(serviceName);
        pdf.text(serviceName, (pageWidth - serviceWidth) / 2, pageHeight - 10);
      }
    };

    // Função para adicionar página de fluxogramas
    const addFlowchartsPage = async (flowcharts: any[], startIndex: number, flowchartsPerPage: number = 1) => {
      pdf.addPage();
      
      // Criar fundo degradê do branco ao azul escuro
      createWhiteToNavyGradient();
      
      // Título da página
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0); // Preto para o título
      const pageTitle = 'Fluxogramas';
      const titleWidth = pdf.getTextWidth(pageTitle);
      pdf.text(pageTitle, (pageWidth - titleWidth) / 2, 20);

      // Linha decorativa abaixo do título
      pdf.setDrawColor(0, 0, 128);
      pdf.setLineWidth(0.5);
      pdf.line((pageWidth - titleWidth - 20) / 2, 25, (pageWidth + titleWidth + 20) / 2, 25);
      
      // Margens otimizadas para ocupar a maior parte da página
      const margin = 15;
      
      // Calcular posições para 1 fluxograma por página (ocupando quase toda a página)
      const availableWidth = pageWidth - 2 * margin;
      const availableHeight = pageHeight - 2 * margin - 40; // 40 para título e legenda
      
      // Apenas um fluxograma por página
      if (startIndex < flowcharts.length) {
        const flowchart = flowcharts[startIndex];
        
        // Posição do fluxograma centralizado na página
        const y = 40; // Começar logo abaixo do título
        
        try {
          // Adicionar borda e sombra para o fluxograma
          pdf.setDrawColor(200, 200, 200);
          pdf.setFillColor(255, 255, 255);
          pdf.setLineWidth(0.5);
          pdf.roundedRect(margin, y, availableWidth, availableHeight - 15, 3, 3, 'FD');
          
          // Adicionar o fluxograma
          pdf.addImage(
            flowchart.image,
            'JPEG',
            margin + 10,
            y + 10,
            availableWidth - 20,
            availableHeight - 35,
            `flowchart-${startIndex}`,
            'MEDIUM'
          );
          
          // Adicionar descrição do fluxograma
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(0, 0, 0);
          
          const description = flowchart.comment || `Fluxograma ${startIndex + 1}`;
          const descWidth = pdf.getTextWidth(description);
          pdf.text(description, (pageWidth - descWidth) / 2, pageHeight - 15);
        } catch (error) {
          console.error(`Erro ao adicionar fluxograma ${startIndex + 1}:`, error);
          
          // Adicionar placeholder em caso de erro
          pdf.setFillColor(240, 240, 240);
          pdf.rect(margin + 10, y + 10, availableWidth - 20, availableHeight - 35, 'F');
          
          pdf.setFontSize(14);
          pdf.setTextColor(100, 100, 100);
          const errorText = 'Erro ao carregar fluxograma';
          const errorWidth = pdf.getTextWidth(errorText);
          pdf.text(errorText, (pageWidth - errorWidth) / 2, pageHeight / 2);
        }
      }
    };

    // Determinar range de datas baseado nos serviços
    let dateRange = '';
    if (services.length > 0) {
      const dates = services.filter((s: any) => s.startDate || s.endDate);
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
    addTitlePage(dateRange, location);

    // Processar imagens por serviço (cada serviço em páginas separadas)
    if (serviceImages.length > 0) {
      console.log(`Processando ${serviceImages.length} imagens para o relatório...`);
      
      // Adicionar páginas de fotos (2 por página)
      for (let i = 0; i < serviceImages.length; i += 2) {
        console.log(`Adicionando página com imagens ${i+1} e ${i+2 <= serviceImages.length ? i+2 : '-'}`);
        await add2PhotosPage(serviceImages, i);
      }
    } else {
      console.log('Nenhuma imagem para processar');
    }

    // Adicionar páginas de fluxogramas (se houver)
    if (flowcharts.length > 0) {
      console.log(`Processando ${flowcharts.length} fluxogramas para o relatório...`);
      
      for (let i = 0; i < flowcharts.length; i++) {
        console.log(`Adicionando página com fluxograma ${i+1}`);
        await addFlowchartsPage(flowcharts, i);
      }
    } else {
      console.log('Nenhum fluxograma para processar');
    }

    console.log('PDF gerado com sucesso');

    // Retornar PDF
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));
    
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="diario_obra_mark1.pdf"',
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