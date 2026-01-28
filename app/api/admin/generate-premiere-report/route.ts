import { NextRequest, NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';
import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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

// Helper para formatar data sem sofrer com timezones (evita o problema de D-1)
function formatDateSafe(dateString: string): string {
  if (!dateString) return '';
  // Pega apenas a parte da data YYYY-MM-DD
  const cleanDate = dateString.split('T')[0];
  const parts = cleanDate.split('-');

  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }

  // Fallback se o formato não for YYYY-MM-DD
  // Adiciona T12:00:00 para tentar evitar problemas de fuso se for apenas data
  try {
    if (dateString.length === 10 && dateString.includes('-')) {
      return new Date(dateString + 'T12:00:00').toLocaleDateString('pt-BR');
    }
    return new Date(dateString).toLocaleDateString('pt-BR');
  } catch (e) {
    return dateString;
  }
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
      console.log('Serviços recebidos do frontend:', servicesData.length);
      console.log('IDs dos serviços:', servicesData.map((s: any) => ({ id: s.id, name: s.name })));

      // Verificar e avisar sobre serviços duplicados
      const serviceIds = servicesData.map((s: any) => s.id);
      const uniqueServiceIds = new Set(serviceIds);
      if (serviceIds.length !== uniqueServiceIds.size) {
        console.warn('AVISO: Serviços duplicados detectados no array de serviços!');
        console.warn('Total de serviços:', serviceIds.length, 'Serviços únicos:', uniqueServiceIds.size);
      }
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

        // Converter imagem para base64 imediatamente
        const base64Image = await imageToBase64(value);

        // Obter nome do arquivo para ordenação
        const fileName = (value as any).name || `image-${imageIndex}`;

        console.log(`Processando imagem ${imageIndex}: fileName="${fileName}", serviceId="${serviceId}", serviceName="${service?.name || 'NÃO ENCONTRADO'}"`);

        if (!service) {
          console.warn(`AVISO: Serviço não encontrado para serviceId="${serviceId}" (imagem: ${fileName})`);
        }

        images.push({
          image: base64Image,
          fileName: fileName,
          serviceId: serviceId,
          serviceName: service?.name || 'Serviço',
          comment: comment,
          serviceStartDate: service?.startDate,
          serviceEndDate: service?.endDate
        });
      }
    }

    console.log('Total de imagens processadas:', images.length);

    // Processar imagem de resultado separada
    const resultImage = formData.get('resultImage');

    // Processar imagem do termo de serviço
    const termsOfServiceImage = formData.get('termsOfServiceImage');
    let termsOfServiceBase64 = null;
    if (termsOfServiceImage && typeof termsOfServiceImage === 'object' && 'arrayBuffer' in termsOfServiceImage) {
      termsOfServiceBase64 = await imageToBase64(termsOfServiceImage);
      console.log('Imagem do termo de serviço processada');
    }

    // Processar considerações finais
    const finalConsiderations = formData.get('finalConsiderations') as string || '';

    // Processar localização
    const workLocation = formData.get('location') as string || 'Local da Obra';

    // Carregar logos
    const companyLogo = loadCompanyLogo();
    const premiereLogo = loadPremiereLogo();

    // Gerar senha aleatória forte para o proprietário (bloqueio de edição)
    const ownerPassword = crypto.randomBytes(16).toString('hex');

    // Criar PDF em orientação horizontal
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      encryption: {
        userPermissions: ["print"],
        ownerPassword: ownerPassword,
        userPassword: "" // Abrir sem senha
      }
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const fullHeaderHeight = 40;
    const simpleHeaderHeight = 25;
    const footerHeight = 20;
    let yPosition = margin + fullHeaderHeight;

    // Função para criar o degradê branco-azul (Premiere)
    const createWhiteToBlueGradient = () => {
      const gradientSteps = 30;
      const stepHeight = pageHeight / gradientSteps;

      for (let i = 0; i < gradientSteps; i++) {
        // Interpolação de cores do branco (255, 255, 255) ao azul Premiere (70, 130, 180)
        const ratio = i / (gradientSteps - 1);
        const r = Math.round(255 - (255 - 70) * ratio);
        const g = Math.round(255 - (255 - 130) * ratio);
        const b = Math.round(255 - (255 - 180) * ratio);

        pdf.setFillColor(r, g, b);
        pdf.rect(0, i * stepHeight, pageWidth, stepHeight + 1, 'F');
      }
    };

    // Função para desenhar o cabeçalho padrão
    const drawHeader = () => {
      // Header azul Premiere
      pdf.setFillColor(70, 130, 180);
      pdf.rect(0, 0, pageWidth, 40, 'F');

      // Logo da Premiere no header
      if (premiereLogo) {
        const logoSize = 25;
        const logoX = 15;
        const logoY = 7.5;
        pdf.addImage(premiereLogo, 'PNG', logoX, logoY, logoSize, logoSize);
      }

      // Nome da empresa Premiere centralizado
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      const companyName = 'PREMIERE CONSTRUÇÃO CIVIL';
      const companyNameWidth = pdf.getTextWidth(companyName);
      pdf.text(companyName, (pageWidth - companyNameWidth) / 2, 22);

      // Informações de contato à direita
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      // CNPJ
      pdf.text('CNPJ: 29.224.254 0001-75', pageWidth - 15, 14, { align: 'right' });
      // Email
      pdf.text('Email: premiere@premiereconst.com.br', pageWidth - 15, 20, { align: 'right' });
      // Tel
      pdf.text('Tel: 11 98464-7093', pageWidth - 15, 26, { align: 'right' });
    };

    // Função para criar página de capa do Diário de Obra
    const addCoverPage = () => {
      // Criar fundo degradê do branco ao azul Premiere
      createWhiteToBlueGradient();

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

      // Fundo branco limpo
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      // Desenhar cabeçalho padrão
      drawHeader();

      // Título principal do relatório
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0); // Cor preta consistente
      const mainTitle = reportName || 'Relatório Diário de Obras';

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

      // Linha separadora (cor complementar ou cinza)
      pdf.setLineWidth(3);
      pdf.setDrawColor(100, 100, 100); // Cinza escuro
      pdf.line(50, separatorYPos, pageWidth - 50, separatorYPos);

      // Informações do relatório organizadas
      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);

      let yPos = separatorYPos + 25;

      // Data
      pdf.setFont('helvetica', 'bold');
      pdf.text('Período:', 50, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(dateRange, 50, yPos + 8);
      yPos += 22;

      // Local da Obra (apenas se preenchido)
      if (location) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Local da Obra:', 50, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.text(location, 50, yPos + 8);
        yPos += 22;
      }

      // Descrição (se houver)
      if (reportDescription) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Descrição:', 50, yPos);
        pdf.setFont('helvetica', 'normal');

        const descLines = pdf.splitTextToSize(reportDescription, pageWidth - 100);
        pdf.text(descLines, 50, yPos + 8);
      }

      // Reset de estilos
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.2);
      pdf.setTextColor(0, 0, 0);
    };

    // Função para adicionar página de conteúdo com atividades
    const addContentPage = (services: any[]) => {
      pdf.addPage();

      // Fundo branco limpo
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      // Desenhar cabeçalho padrão
      drawHeader();

      // Título da seção
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      const sectionTitle = 'Descrição das Atividades';
      const sectionTitleWidth = pdf.getTextWidth(sectionTitle);
      pdf.text(sectionTitle, (pageWidth - sectionTitleWidth) / 2, 55);

      // Linha separadora
      pdf.setLineWidth(2);
      pdf.setDrawColor(100, 100, 100);
      pdf.line(50, 62, pageWidth - 50, 62);

      let yPos = 80;

      // Seção de atividades - apenas se houver serviços cadastrados
      if (services && services.length > 0) {
        // Lista de atividades baseada nos serviços
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0); // Cor preta consistente

        services.forEach((service: any, index: number) => {
          if (service.name) {
            pdf.text(`• ${service.name}`, 50, yPos);
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

    // Função para adicionar 2 fotos por página
    const add2PhotosPage = async (photos: any[], startIndex: number, globalImageOffset: number) => {
      pdf.addPage();

      // Fundo branco limpo
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      // Desenhar cabeçalho padrão
      drawHeader();

      // Título da página de fotos
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      const pageTitle = 'Registro Fotográfico';
      const titleWidth = pdf.getTextWidth(pageTitle);
      pdf.text(pageTitle, (pageWidth - titleWidth) / 2, 55);

      // Linha separadora
      pdf.setLineWidth(2);
      pdf.setDrawColor(100, 100, 100);
      pdf.line(50, 62, pageWidth - 50, 62);

      // Adicionar nome do serviço e observações como cabeçalho centralizado acima das fotos
      let yOffset = 0;
      if (photos[startIndex] && photos[startIndex].serviceName) {
        // Nome do serviço como título principal centralizado
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        const serviceTitle = `Serviço: ${photos[startIndex].serviceName}`;
        const serviceTitleWidth = pdf.getTextWidth(serviceTitle);
        const serviceTitleX = (pageWidth - serviceTitleWidth) / 2;
        pdf.text(serviceTitle, serviceTitleX, 75);

        yOffset = 10; // Espaço reduzido para mover imagens para cima
      }

      // Margens otimizadas para orientação horizontal
      const margin = 20;
      const spacing = 15;
      const padding = 8;

      // Calcular posições para 2 fotos lado a lado
      const availableWidth = pageWidth - 2 * margin - spacing;

      // Calcular espaço necessário para legendas e comentários
      let maxCommentLines = 0;
      for (let i = 0; i < 2 && startIndex + i < photos.length; i++) {
        const photo = photos[startIndex + i];
        if (photo && photo.comment) {
          const commentLines = pdf.splitTextToSize(photo.comment, (availableWidth / 2) - 2 * padding);
          maxCommentLines = Math.max(maxCommentLines, commentLines.length);
        }
      }

      // Espaço necessário para legendas
      const legendSpace = 8 + 10 + 12 + (maxCommentLines * 10) + 20;

      const availableHeight = pageHeight - 2 * margin - 60 - legendSpace;

      const maxPhotoWidth = availableWidth / 2;
      const maxPhotoHeight = availableHeight;

      // Verificar se temos imagens para processar
      if (startIndex >= photos.length) {
        return;
      }

      // Adicionar as fotos
      for (let i = 0; i < 2 && startIndex + i < photos.length; i++) {
        const photo = photos[startIndex + i];

        if (!photo || !photo.image) {
          continue;
        }

        // Calcular dimensões mantendo proporção
        let photoWidth = maxPhotoWidth;
        let photoHeight = maxPhotoHeight;

        // Usar proporção 3:2 para melhor aproveitamento do espaço
        const aspectRatio = 3 / 2;

        if (maxPhotoWidth / maxPhotoHeight > aspectRatio) {
          photoHeight = maxPhotoHeight;
          photoWidth = photoHeight * aspectRatio;
        } else {
          photoWidth = maxPhotoWidth;
          photoHeight = photoWidth / aspectRatio;
        }

        // Garantir tamanho mínimo
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

        // Verificar se ainda há espaço suficiente na página
        const photoBottomY = 85 + yOffset + photoHeight;
        const maxAllowedY = pageHeight - margin - legendSpace;

        if (photoBottomY > maxAllowedY) {
          const availablePhotoHeight = maxAllowedY - (85 + yOffset);
          if (availablePhotoHeight > minHeight) {
            photoHeight = availablePhotoHeight;
            photoWidth = photoHeight * aspectRatio;
          }
        }

        // Calcular posição da foto
        const x = margin + i * (maxPhotoWidth + spacing);
        const y = 75 + yOffset;

        // Centralizar a foto no espaço disponível
        const centeredX = x + (maxPhotoWidth - photoWidth) / 2;
        const centeredY = y;

        try {
          // Adicionar sombra suave
          pdf.setFillColor(220, 220, 220);
          pdf.roundedRect(centeredX + 2, centeredY + 2, photoWidth, photoHeight, 3, 3, 'F');

          // Adicionar borda branca
          pdf.setFillColor(255, 255, 255);
          pdf.setDrawColor(240, 240, 240);
          pdf.setLineWidth(0.5);
          pdf.roundedRect(centeredX, centeredY, photoWidth, photoHeight, 3, 3, 'FD');

          // Adicionar borda azul fina (Premiere Blue)
          pdf.setDrawColor(70, 130, 180);
          pdf.setLineWidth(0.2);
          pdf.roundedRect(centeredX + 1, centeredY + 1, photoWidth - 2, photoHeight - 2, 2, 2, 'S');

          // Adicionar a foto com alias único baseado no offset global
          const globalImageIndex = globalImageOffset + startIndex + i;
          pdf.addImage(
            photo.image,
            'JPEG',
            centeredX + padding,
            centeredY + padding,
            photoWidth - 2 * padding,
            photoHeight - 2 * padding,
            `img-${globalImageIndex}`,  // Alias único em todo o PDF
            'MEDIUM'
          );

          // Legenda da foto
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(0, 0, 0);
          const photoNum = startIndex + i + 1;
          let legendY = centeredY + photoHeight + 8;

          // Centralizar número da foto
          const photoLabel = `Foto ${photoNum}`;
          const photoLabelWidth = pdf.getTextWidth(photoLabel);
          const photoLabelX = centeredX + (photoWidth - photoLabelWidth) / 2;
          pdf.text(photoLabel, photoLabelX, legendY);

          legendY += 12;

          // Adicionar data se disponível
          let photoDateText = '';
          if (photo.serviceStartDate || photo.serviceEndDate) {
            if (photo.serviceStartDate && photo.serviceEndDate) {
              const startDate = formatDateSafe(photo.serviceStartDate);
              const endDate = formatDateSafe(photo.serviceEndDate);
              if (photo.serviceStartDate === photo.serviceEndDate) {
                photoDateText = `Data: ${startDate}`;
              } else {
                photoDateText = `Período: ${startDate} a ${endDate}`;
              }
            } else if (photo.serviceStartDate) {
              photoDateText = `Data de início: ${formatDateSafe(photo.serviceStartDate)}`;
            } else if (photo.serviceEndDate) {
              photoDateText = `Data de término: ${formatDateSafe(photo.serviceEndDate)}`;
            }
          }

          if (photoDateText) {
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(9);
            const dateTextWidth = pdf.getTextWidth(photoDateText);
            const dateTextX = centeredX + (photoWidth - dateTextWidth) / 2;
            pdf.text(photoDateText, dateTextX, legendY);
            legendY += 10;
          }

          // Adicionar comentário da foto se existir
          if (photo.comment) {
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(9);
            pdf.setTextColor(0, 0, 0);

            const maxCommentWidth = photoWidth - 2 * padding;
            const commentLines = pdf.splitTextToSize(photo.comment, maxCommentWidth);

            commentLines.forEach((line: string, lineIndex: number) => {
              const lineWidth = pdf.getTextWidth(line);
              const lineX = centeredX + (photoWidth - lineWidth) / 2;
              pdf.text(line, lineX, legendY + (lineIndex * 10));
            });
          }
        } catch (error) {
          console.error(`Erro ao adicionar imagem ${startIndex + i + 1}:`, error);

          // Placeholder em caso de erro
          pdf.setFillColor(240, 240, 240);
          pdf.rect(centeredX + padding, centeredY + padding, photoWidth - 2 * padding, photoHeight - 2 * padding, 'F');

          pdf.setFontSize(12);
          pdf.setTextColor(100, 100, 100);
          pdf.text('Erro ao carregar imagem', centeredX + photoWidth / 2 - 40, centeredY + photoHeight / 2);
        }
      }
    };

    // Função para adicionar página do termo de serviço
    const addTermsOfServicePage = (termsImage: string) => {
      pdf.addPage();

      // Fundo branco limpo
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      // Definir margens para a imagem
      const margin = 10; // Margem de 10mm em cada lado
      const maxWidth = pageWidth - (2 * margin);
      const maxHeight = pageHeight - (2 * margin);

      try {
        // Obter dimensões da imagem original
        const imgProps = pdf.getImageProperties(termsImage);
        const imgWidth = imgProps.width;
        const imgHeight = imgProps.height;
        const imgRatio = imgWidth / imgHeight;

        // Calcular dimensões mantendo a proporção
        let finalWidth = maxWidth;
        let finalHeight = finalWidth / imgRatio;

        // Se a altura calculada for maior que o máximo permitido, ajustar pela altura
        if (finalHeight > maxHeight) {
          finalHeight = maxHeight;
          finalWidth = finalHeight * imgRatio;
        }

        // Centralizar a imagem na página
        const imageX = (pageWidth - finalWidth) / 2;
        const imageY = (pageHeight - finalHeight) / 2;

        // Adicionar borda azul Premiere fina ao redor da imagem
        pdf.setDrawColor(70, 130, 180); // Azul Premiere
        pdf.setLineWidth(1.5);
        pdf.rect(imageX - 2, imageY - 2, finalWidth + 4, finalHeight + 4, 'S');

        // Adicionar a imagem do termo de serviço mantendo proporção
        pdf.addImage(
          termsImage,
          'JPEG',
          imageX,
          imageY,
          finalWidth,
          finalHeight,
          'terms-of-service',
          'MEDIUM'
        );

        console.log(`Página do termo de serviço adicionada: ${finalWidth.toFixed(2)}mm x ${finalHeight.toFixed(2)}mm (proporção mantida)`);
      } catch (error) {
        console.error('Erro ao adicionar imagem do termo de serviço:', error);

        // Placeholder em caso de erro
        const errorBoxWidth = 200;
        const errorBoxHeight = 100;
        const errorX = (pageWidth - errorBoxWidth) / 2;
        const errorY = (pageHeight - errorBoxHeight) / 2;

        pdf.setFillColor(240, 240, 240);
        pdf.rect(errorX, errorY, errorBoxWidth, errorBoxHeight, 'F');

        pdf.setFontSize(14);
        pdf.setTextColor(100, 100, 100);
        pdf.text('Erro ao carregar termo de serviço', pageWidth / 2, pageHeight / 2, { align: 'center' });
      }

      // Reset de estilos
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.2);
      pdf.setTextColor(0, 0, 0);
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
            const d = date.getDate().toString().padStart(2, '0');
            const m = (date.getMonth() + 1).toString().padStart(2, '0');
            return `${d}/${m}`;
          };

          /* 
             NOTE: We iterate over Date objects here to find min/max.
             The + 'T12:00:00' hack is used above to ensure we don't shift day due to timezone.
             We keep using the calculated Date objects but could use our helper if we just had one date.
             For min/max, we need to compare values.
          */

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

    console.log('Criando página de conteúdo...');
    addContentPage(servicesData);

    // Processar imagens por serviço (cada serviço em páginas separadas)
    if (images.length > 0) {
      console.log(`Processando ${images.length} imagens organizadas por serviço...`);

      // PRIMEIRO: Desduplicar serviços antes de agrupar imagens
      const uniqueServices: any[] = [];
      const seenServiceIds = new Set<string>();

      for (const service of servicesData) {
        if (!seenServiceIds.has(service.id)) {
          uniqueServices.push(service);
          seenServiceIds.add(service.id);
        } else {
          console.warn(`AVISO: Serviço duplicado removido - ID: "${service.id}", Nome: "${service.name}"`);
        }
      }

      console.log(`Serviços únicos após desduplicação: ${uniqueServices.length}`);

      // SEGUNDO: Organizar imagens por serviço
      const imagesByService: { [key: string]: any[] } = {};

      for (const image of images) {
        if (!imagesByService[image.serviceId]) {
          imagesByService[image.serviceId] = [];
        }
        imagesByService[image.serviceId].push(image);
      }

      // Log do agrupamento de imagens
      console.log('Imagens agrupadas por serviço:');
      for (const [serviceId, imgs] of Object.entries(imagesByService)) {
        const serviceName = uniqueServices.find(s => s.id === serviceId)?.name || 'DESCONHECIDO';
        console.log(`  - Serviço "${serviceName}" (ID: ${serviceId}): ${imgs.length} imagens`);
      }

      // TERCEIRO: Processar cada serviço separadamente
      let globalImageIndex = 0;  // Contador global para aliases únicos de imagens

      for (const service of uniqueServices) {
        const serviceImages = imagesByService[service.id] || [];

        if (serviceImages.length > 0) {
          console.log(`Processando serviço "${service.name}" (ID: ${service.id}) com ${serviceImages.length} imagens...`);
          console.log(`  Offset global de imagens: ${globalImageIndex}`);

          // Ordenar imagens por nome do arquivo
          serviceImages.sort((a: any, b: any) => {
            const nameA = a.fileName || '';
            const nameB = b.fileName || '';
            return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
          });

          // Log dos nomes de arquivo ordenados
          console.log(`  Ordem das imagens: ${serviceImages.map((img: any) => img.fileName).join(', ')}`);

          // Processar imagens do serviço em grupos de 2 (estilo Mark1)
          for (let i = 0; i < serviceImages.length; i += 2) {
            console.log(`Criando página de fotos do serviço "${service.name}" - página ${Math.floor(i / 2) + 1}...`);
            await add2PhotosPage(serviceImages, i, globalImageIndex);
          }

          // Incrementar o contador global pelo número de imagens processadas
          globalImageIndex += serviceImages.length;
        }
      }
    } else {
      console.log('Nenhuma imagem para processar');
    }

    // Adicionar página do termo de serviço se fornecida
    if (termsOfServiceBase64) {
      console.log('Adicionando página do termo de serviço...');
      addTermsOfServicePage(termsOfServiceBase64);
    }

    console.log('PDF gerado com sucesso');

    // Retornar PDF
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

    return new NextResponse(new Uint8Array(pdfBuffer), {
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