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
    const services = JSON.parse(formData.get('services') as string || '[]');
    const config = JSON.parse(formData.get('config') as string || '{}');
    const finalConsiderations = formData.get('finalConsiderations') as string || '';
    const location = formData.get('location') as string || '';
    const company = formData.get('company') as string || '';
    const address = formData.get('address') as string || '';
    const date = formData.get('date') as string || new Date().toISOString().split('T')[0];
    const startTime = formData.get('startTime') as string || '08:00';
    const endTime = formData.get('endTime') as string || '17:00';
    
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
          comment: comment,
          serviceObservations: service.observations || ''
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
    const addTitlePage = (dateRange: string, location: string, company: string, address: string, date: string, startTime: string, endTime: string) => {
      pdf.addPage();
      
      // Fundo branco limpo
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      
      // Header azul com informações da empresa
      pdf.setFillColor(41, 128, 185);
      pdf.rect(0, 0, pageWidth, 40, 'F');
      
      // Logo da Mark1 no header
      if (mark1Logo) {
        const logoSize = 25;
        const logoX = 15;
        const logoY = 7.5;
        pdf.addImage(mark1Logo, 'JPEG', logoX, logoY, logoSize, logoSize);
      }
      
      // Informações da empresa no header
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(255, 255, 255);
      
      // Informações da empresa (apenas se fornecidas)
      if (company) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        const companyNameWidth = pdf.getTextWidth(company);
        pdf.text(company, (pageWidth - companyNameWidth) / 2, 25);
      }
      
      // Nome da empresa padrão se não houver empresa definida
      const companyName = company || 'MARK1 SOLUÇÕES EM REFRIGERAÇÃO LTDA';
      const companyNameWidth = pdf.getTextWidth(companyName);
      pdf.text(companyName, (pageWidth - companyNameWidth) / 2, 32);
      
      // Título principal do relatório
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0); // Cor preta consistente
      const mainTitle = 'Relatório Diário de Obras';
      
      // Função para quebrar texto em múltiplas linhas
      const wrapText = (text: string, maxWidth: number) => {
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';
        
        for (let i = 0; i < words.length; i++) {
          const word = words[i];
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const testWidth = pdf.getTextWidth(testLine);
          
          if (testWidth <= maxWidth) {
            currentLine = testLine;
          } else {
            if (currentLine) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              // Palavra muito longa, adiciona mesmo assim
              lines.push(word);
              currentLine = '';
            }
          }
        }
        
        if (currentLine) {
          lines.push(currentLine);
        }
        
        return lines;
      };
      
      // Quebrar o título se necessário (largura máxima: 70% da página)
      const maxTitleWidth = pageWidth * 0.7;
      const titleLines = wrapText(mainTitle, maxTitleWidth);
      
      // Renderizar o título (centralizado)
      let titleYPos = 70;
      const lineHeight = 28; // Espaçamento entre linhas
      
      titleLines.forEach((line, index) => {
        const lineWidth = pdf.getTextWidth(line);
        const xPos = (pageWidth - lineWidth) / 2;
        pdf.text(line, xPos, titleYPos + (index * lineHeight));
      });
      
      // Ajustar posição da linha separadora baseada no número de linhas do título
      const separatorYPos = titleYPos + ((titleLines.length - 1) * lineHeight) + 15;
      
      // Linha separadora roxa
      pdf.setLineWidth(3);
      pdf.setDrawColor(128, 0, 128); // Roxo
      pdf.line(50, separatorYPos, pageWidth - 50, separatorYPos);
      
      // Informações do relatório organizadas
      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);
      
      let yPos = separatorYPos + 25;
      
      // Empresa/Cliente (apenas se preenchido)
      if (company) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Empresa / Cliente:', 50, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.text(company, 50, yPos + 8);
        yPos += 22;
      }
      
      // Endereço (apenas se preenchido)
      if (address) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Endereço:', 50, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.text(address, 50, yPos + 8);
        yPos += 22;
      }
      
      // Data
      pdf.setFont('helvetica', 'bold');
      pdf.text('Data:', 50, yPos);
      pdf.setFont('helvetica', 'normal');
      const formattedDate = new Date(date).toLocaleDateString('pt-BR');
      pdf.text(formattedDate, 50, yPos + 8);
      yPos += 22;
      
      // Horários
      pdf.setFont('helvetica', 'bold');
      pdf.text('Horário de Início:', 50, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(startTime, 50, yPos + 8);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Horário de Término:', 200, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(endTime, 200, yPos + 8);
      yPos += 22;
      
      // Local da Obra (apenas se preenchido)
      if (location) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Local da Obra:', 50, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.text(location, 50, yPos + 8);
      }
      
      // Reset de estilos
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.2);
      pdf.setTextColor(0, 0, 0);
    };

    // Função para adicionar 2 fotos por página
    const add2PhotosPage = async (photos: any[], startIndex: number) => {
      pdf.addPage();
      
      // Fundo branco limpo
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      
      // Header azul com informações da empresa (mesmo padrão)
      pdf.setFillColor(41, 128, 185);
      pdf.rect(0, 0, pageWidth, 40, 'F');
      
      // Logo da Mark1 no header
      if (mark1Logo) {
        const logoSize = 25;
        const logoX = 15;
        const logoY = 7.5;
        pdf.addImage(mark1Logo, 'JPEG', logoX, logoY, logoSize, logoSize);
      }
      
      // Informações da empresa no header
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(255, 255, 255);
      
      // Informações da empresa (apenas se fornecidas)
      if (company) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        const companyNameWidth = pdf.getTextWidth(company);
        pdf.text(company, (pageWidth - companyNameWidth) / 2, 25);
      }
      
      // Nome da empresa padrão se não houver empresa definida
      const companyName = company || 'MARK1 SOLUÇÕES EM REFRIGERAÇÃO LTDA';
      const companyNameWidth = pdf.getTextWidth(companyName);
      pdf.text(companyName, (pageWidth - companyNameWidth) / 2, 32);
      
      // Título da página de fotos
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0); // Cor preta consistente
      const pageTitle = 'Registro Fotográfico';
      const titleWidth = pdf.getTextWidth(pageTitle);
      pdf.text(pageTitle, (pageWidth - titleWidth) / 2, 60);

      // Linha separadora roxa
      pdf.setLineWidth(2);
      pdf.setDrawColor(128, 0, 128);
      pdf.line(50, 70, pageWidth - 50, 70);
      
      // Adicionar observações do serviço se existirem
      let yOffset = 0;
      if (photos[startIndex] && photos[startIndex].serviceObservations) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('Descrição do Serviço:', 50, 85);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        const observationsLines = pdf.splitTextToSize(photos[startIndex].serviceObservations, pageWidth - 100);
        
        observationsLines.forEach((line: string, index: number) => {
          pdf.text(line, 50, 100 + (index * 12));
        });
        
        yOffset = observationsLines.length * 12 + 20;
      }
      
      // Margens otimizadas para orientação horizontal
      const margin = 20;
      const spacing = 15;
      const padding = 8;
      
      // Calcular posições para 2 fotos lado a lado (ajustado para o novo header e observações)
      const availableWidth = pageWidth - 2 * margin - spacing;
      const availableHeight = pageHeight - 2 * margin - 60 - yOffset; // 60 para header e título + yOffset para observações
      
      const maxPhotoWidth = availableWidth / 2;
      const maxPhotoHeight = availableHeight - 20; // Espaço para legenda
      
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
        
        // Calcular dimensões mantendo proporção (usando proporção otimizada)
        let photoWidth = maxPhotoWidth;
        let photoHeight = maxPhotoHeight;
        
        // Usar proporção 3:2 para melhor aproveitamento do espaço
        const aspectRatio = 3/2;
        
        if (maxPhotoWidth / maxPhotoHeight > aspectRatio) {
          // Espaço disponível é mais largo que 3:2, limitar pela altura
          photoHeight = maxPhotoHeight;
          photoWidth = photoHeight * aspectRatio;
        } else {
          // Espaço disponível é mais alto que 3:2, limitar pela largura
          photoWidth = maxPhotoWidth;
          photoHeight = photoWidth / aspectRatio;
        }
        
        // Garantir tamanho mínimo para boa visualização
        const minWidth = 120;
        const minHeight = 80;
        
        if (photoWidth < minWidth) {
          photoWidth = minWidth;
          photoHeight = photoWidth / aspectRatio;
        }
        
        if (photoHeight < minHeight) {
          photoHeight = minHeight;
          photoWidth = photoHeight * aspectRatio;
        }
        
        // Calcular posição da foto (2 lado a lado)
        const x = margin + i * (maxPhotoWidth + spacing);
        const y = 85 + yOffset; // Começar abaixo do header, título e observações
        
        // Centralizar a foto no espaço disponível
        const centeredX = x + (maxPhotoWidth - photoWidth) / 2;
        const centeredY = y + (maxPhotoHeight - photoHeight) / 2;
        
        try {
          console.log(`Adicionando imagem ${startIndex + i + 1} ao PDF`);
          
          // Adicionar sombra suave
          pdf.setFillColor(220, 220, 220);
          pdf.roundedRect(centeredX + 2, centeredY + 2, photoWidth, photoHeight, 3, 3, 'F');
          
          // Adicionar borda branca
          pdf.setFillColor(255, 255, 255);
          pdf.setDrawColor(240, 240, 240);
          pdf.setLineWidth(0.5);
          pdf.roundedRect(centeredX, centeredY, photoWidth, photoHeight, 3, 3, 'FD');
          
          // Adicionar borda azul fina
          pdf.setDrawColor(0, 0, 128);
          pdf.setLineWidth(0.2);
          pdf.roundedRect(centeredX + 1, centeredY + 1, photoWidth - 2, photoHeight - 2, 2, 2, 'S');
          
          // Adicionar a foto com margens internas
          pdf.addImage(
            photo.image, // Já é base64
            'JPEG',
            centeredX + padding,
            centeredY + padding,
            photoWidth - 2 * padding,
            photoHeight - 2 * padding,
            `img-${startIndex + i}`,
            'MEDIUM' // Qualidade média para melhor visualização
          );
          
          // Legenda da foto
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(0, 0, 0); // Preto para todas as legendas
          const photoNum = startIndex + i + 1;
          const legendY = centeredY + photoHeight + 8;
          
          // Centralizar número da foto
          const photoLabel = `Foto ${photoNum}`;
          const photoLabelWidth = pdf.getTextWidth(photoLabel);
          const photoLabelX = centeredX + (photoWidth - photoLabelWidth) / 2;
          pdf.text(photoLabel, photoLabelX, legendY);
          
          // Adicionar comentário da foto se existir (centralizado abaixo)
          if (photo.comment) {
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(0, 0, 0); // Manter preto para comentários
            
            // Quebrar o comentário em múltiplas linhas se necessário
            const maxCommentWidth = photoWidth - 2 * padding;
            const commentLines = pdf.splitTextToSize(photo.comment, maxCommentWidth);
            
            // Centralizar cada linha do comentário
            commentLines.forEach((line: string, lineIndex: number) => {
              const lineWidth = pdf.getTextWidth(line);
              const lineX = centeredX + (photoWidth - lineWidth) / 2;
              pdf.text(line, lineX, legendY + 12 + (lineIndex * 10));
            });
          }
        } catch (error) {
          console.error(`Erro ao adicionar imagem ${startIndex + i + 1}:`, error);
          
          // Adicionar placeholder em caso de erro
          pdf.setFillColor(240, 240, 240);
          pdf.rect(centeredX + padding, centeredY + padding, photoWidth - 2 * padding, photoHeight - 2 * padding, 'F');
          
          pdf.setFontSize(12);
          pdf.setTextColor(100, 100, 100);
          pdf.text('Erro ao carregar imagem', centeredX + photoWidth / 2 - 40, centeredY + photoHeight / 2);
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
      
      // Fundo branco limpo
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      
      // Header azul com informações da empresa (mesmo padrão)
      pdf.setFillColor(41, 128, 185);
      pdf.rect(0, 0, pageWidth, 40, 'F');
      
      // Logo da Mark1 no header
      if (mark1Logo) {
        const logoSize = 25;
        const logoX = 15;
        const logoY = 7.5;
        pdf.addImage(mark1Logo, 'JPEG', logoX, logoY, logoSize, logoSize);
      }
      
      // Informações da empresa no header
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(255, 255, 255);
      
      // Informações da empresa (apenas se fornecidas)
      if (company) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        const companyNameWidth = pdf.getTextWidth(company);
        pdf.text(company, (pageWidth - companyNameWidth) / 2, 25);
      }
      
      // Nome da empresa padrão se não houver empresa definida
      const companyName = company || 'MARK1 SOLUÇÕES EM REFRIGERAÇÃO LTDA';
      const companyNameWidth = pdf.getTextWidth(companyName);
      pdf.text(companyName, (pageWidth - companyNameWidth) / 2, 32);
      
      // Título da página
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0); // Cor preta consistente
      const pageTitle = 'Fluxogramas';
      const titleWidth = pdf.getTextWidth(pageTitle);
      pdf.text(pageTitle, (pageWidth - titleWidth) / 2, 60);

      // Linha separadora roxa
      pdf.setLineWidth(2);
      pdf.setDrawColor(128, 0, 128);
      pdf.line(50, 70, pageWidth - 50, 70);
      
      // Margens otimizadas para ocupar a maior parte da página
      const margin = 15;
      
      // Calcular posições para 1 fluxograma por página (ajustado para o novo header)
      const availableWidth = pageWidth - 2 * margin;
      const availableHeight = pageHeight - 2 * margin - 80; // 80 para header e título
      
      // Apenas um fluxograma por página
      if (startIndex < flowcharts.length) {
        const flowchart = flowcharts[startIndex];
        
        // Posição do fluxograma centralizado na página
        const y = 85; // Começar abaixo do header e título
        
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

    // Função para adicionar página de conteúdo com atividades
    const addContentPage = (services: any[], serviceImages: any[]) => {
      pdf.addPage();
      
      // Fundo branco limpo
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      
      // Header azul com informações da empresa (mesmo padrão)
      pdf.setFillColor(41, 128, 185);
      pdf.rect(0, 0, pageWidth, 40, 'F');
      
      // Logo da Mark1 no header
      if (mark1Logo) {
        const logoSize = 25;
        const logoX = 15;
        const logoY = 7.5;
        pdf.addImage(mark1Logo, 'JPEG', logoX, logoY, logoSize, logoSize);
      }
      
      // Informações da empresa no header
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(255, 255, 255);
      
      // Informações da empresa (apenas se fornecidas)
      if (company) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        const companyNameWidth = pdf.getTextWidth(company);
        pdf.text(company, (pageWidth - companyNameWidth) / 2, 25);
      }
      
      // Nome da empresa padrão se não houver empresa definida
      const companyName = company || 'MARK1 SOLUÇÕES EM REFRIGERAÇÃO LTDA';
      const companyNameWidth = pdf.getTextWidth(companyName);
      pdf.text(companyName, (pageWidth - companyNameWidth) / 2, 32);
      
      // Título da seção
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0); // Cor preta consistente
      const sectionTitle = 'Relatório Diário de Obras';
      const sectionTitleWidth = pdf.getTextWidth(sectionTitle);
      pdf.text(sectionTitle, (pageWidth - sectionTitleWidth) / 2, 65);
      
      // Linha separadora roxa
      pdf.setLineWidth(2);
      pdf.setDrawColor(128, 0, 128);
      pdf.line(50, 75, pageWidth - 50, 75);
      
      // Informações básicas do relatório
      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);
      
      let yPos = 95;
      
      // Empresa / Cliente (apenas se preenchido)
      pdf.setFont('helvetica', 'bold');
      if (company) {
        pdf.text(`Empresa / Cliente: ${company}`, 50, yPos);
        yPos += 10;
      }
      
      // Endereço (apenas se preenchido)
      if (address) {
        pdf.text(`Endereço: ${address}`, 50, yPos);
        yPos += 10;
      }
      
      // Data
      const formattedDate = new Date(date).toLocaleDateString('pt-BR');
      pdf.text(`Data: ${formattedDate}`, 50, yPos);
      yPos += 10;
      
      // Horários
      pdf.text(`Horário de Início: ${startTime}`, 50, yPos);
      pdf.text(`Horário de Término: ${endTime}`, 200, yPos);
      yPos += 20;
      
      // Seção de atividades - apenas se houver serviços cadastrados
      if (services && services.length > 0) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0); // Cor preta consistente
        pdf.text('Descrição das atividades:', 50, yPos);
        yPos += 20;
        
        // Lista de atividades baseada nos serviços
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0); // Cor preta consistente
        
        services.forEach((service: any, index: number) => {
          if (service.name) {
            pdf.text(`• ${service.name}`, 70, yPos);
            yPos += 12;
            
            // Verificar se há espaço na página
            if (yPos > pageHeight - 50) {
              return; // Parar se não houver espaço
            }
          }
        });
      }
      
      // Reset de estilos
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.2);
      pdf.setTextColor(0, 0, 0);
    };

    // Criar páginas do diário de obra
    console.log('Criando capa do diário...');
    addCoverPage();

    console.log('Criando página de título...');
    addTitlePage(dateRange, location, company, address, date, startTime, endTime);
    
    console.log('Criando página de conteúdo...');
    addContentPage(services, serviceImages);

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