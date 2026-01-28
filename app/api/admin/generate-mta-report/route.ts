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

// Função para carregar logo da MTA
function loadMtaLogo(): string | null {
    try {
        const logoPath = path.join(process.cwd(), 'public', 'images', 'Logo MTA.jpeg');
        if (fs.existsSync(logoPath)) {
            const logoBuffer = fs.readFileSync(logoPath);
            return `data:image/jpeg;base64,${logoBuffer.toString('base64')}`;
        }
    } catch (error) {
        console.error('Erro ao carregar logo da MTA:', error);
    }
    return null;
}

// Função para carregar imagem de rodapé da MTA
function loadFooterImage(): string | null {
    try {
        const footerPath = path.join(process.cwd(), 'public', 'images', 'timbrado-MTA.jpeg');
        if (fs.existsSync(footerPath)) {
            const footerBuffer = fs.readFileSync(footerPath);
            return `data:image/jpeg;base64,${footerBuffer.toString('base64')}`;
        }
    } catch (error) {
        console.error('Erro ao carregar imagem de rodapé da MTA:', error);
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

    // NOTA: A lógica anterior de reduzir arrayBuffer cortando o final corrompia os arquivos.
    // Remoção da 'compressão' destrutiva. Se for necessário comprimir, deve-se usar uma lib de imagem.

    const mimeType = file.type || 'image/jpeg';
    return `data:${mimeType};base64,${base64}`;
}

// Helper para formatar data
function formatDateSafe(dateString: string): string {
    if (!dateString) return '';
    const cleanDate = dateString.split('T')[0];
    const parts = cleanDate.split('-');

    if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
    }

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
        console.log('Iniciando geração de relatório MTA...');

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
        const reportName = formData.get('reportName') as string || 'Relatório de Obra MTA';
        const reportDescription = formData.get('reportDescription') as string || '';

        let servicesData = [];
        try {
            servicesData = JSON.parse(formData.get('services') as string || '[]');
            console.log('Serviços recebidos do frontend (MTA):', servicesData.length);
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
        } catch (error) {
            console.error('Erro ao processar configurações:', error);
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

                const base64Image = await imageToBase64(value);
                const fileName = (value as any).name || `image-${imageIndex}`;

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
        }

        // Processar considerações finais
        const finalConsiderations = formData.get('finalConsiderations') as string || '';

        // Processar localização
        const workLocation = formData.get('location') as string || 'Local da Obra';

        // Carregar logos
        const companyLogo = loadCompanyLogo();
        const mtaLogo = loadMtaLogo();
        const footerImage = loadFooterImage();

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

        // CORES DO TEMA VERDE MTA
        const THEME_COLOR_R = 39;
        const THEME_COLOR_G = 174;
        const THEME_COLOR_B = 96;

        // Função para criar o degradê branco-verde (MTA)
        const createWhiteToGreenGradient = () => {
            const gradientSteps = 30;
            const stepHeight = pageHeight / gradientSteps;

            for (let i = 0; i < gradientSteps; i++) {
                // Interpolação de cores do branco (255, 255, 255) ao verde MTA
                const ratio = i / (gradientSteps - 1);
                const r = Math.round(255 - (255 - THEME_COLOR_R) * ratio);
                const g = Math.round(255 - (255 - THEME_COLOR_G) * ratio);
                const b = Math.round(255 - (255 - THEME_COLOR_B) * ratio);

                pdf.setFillColor(r, g, b);
                pdf.rect(0, i * stepHeight, pageWidth, stepHeight + 1, 'F');
            }
        };

        // Função para desenhar o cabeçalho padrão
        const drawHeader = () => {
            // Header verde MTA
            pdf.setFillColor(THEME_COLOR_R, THEME_COLOR_G, THEME_COLOR_B);
            pdf.rect(0, 0, pageWidth, 40, 'F');

            // Logo da MTA no header
            if (mtaLogo) {
                const logoSize = 25;
                const logoX = 15;
                const logoY = 7.5;
                pdf.addImage(mtaLogo, 'JPEG', logoX, logoY, logoSize, logoSize);
            }

            // Nome da empresa MTA centralizado
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(255, 255, 255);
            const companyName = 'Mundial Tratamento de Agua LTDA'; // Ajustar conforme necessário
            const companyNameWidth = pdf.getTextWidth(companyName);
            pdf.text(companyName, (pageWidth - companyNameWidth) / 2, 22);

            // Informações de contato à direita (Placeholder MTA)
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            // pdf.text('CNPJ: XX.XXX.XXX/0001-XX', pageWidth - 15, 14, { align: 'right' });
            // pdf.text('Email: contato@mta.com.br', pageWidth - 15, 20, { align: 'right' });
            // pdf.text('Tel: (XX) XXXX-XXXX', pageWidth - 15, 26, { align: 'right' });
        };

        // Função para desenhar o rodapé
        const drawFooter = () => {
            if (footerImage) {
                try {
                    // Manter proporção da imagem do rodapé
                    const imgProps = pdf.getImageProperties(footerImage);
                    const ratio = imgProps.width / imgProps.height;

                    // Definir altura máxima para não poluir
                    const maxFooterHeight = 25;

                    // Calcular largura baseado na altura máxima
                    let footerHeight = maxFooterHeight;
                    let footerWidth = footerHeight * ratio;

                    // Se a largura calculada for maior que a página, limita pela largura
                    if (footerWidth > pageWidth) {
                        footerWidth = pageWidth;
                        footerHeight = footerWidth / ratio;
                    }

                    // Centralizar o rodapé horizontalmente
                    const footerX = (pageWidth - footerWidth) / 2;

                    // Posicionar no final da página
                    const footerY = pageHeight - footerHeight;

                    pdf.addImage(footerImage, 'JPEG', footerX, footerY, footerWidth, footerHeight);
                } catch (e) {
                    console.error('Erro ao desenhar rodapé:', e);
                    // Fallback se falhar cálculo
                    const footerHeight = 25;
                    const footerY = pageHeight - footerHeight;
                    pdf.addImage(footerImage, 'JPEG', 0, footerY, pageWidth, footerHeight);
                }
            }
        };

        // Função para criar página de capa
        const addCoverPage = () => {
            createWhiteToGreenGradient();

            if (mtaLogo) {
                const logoSize = 120; // Aumentado de 80 para 120
                const logoX = (pageWidth - logoSize) / 2;
                const logoY = (pageHeight - logoSize) / 2 - 20;

                pdf.addImage(mtaLogo, 'JPEG', logoX, logoY, logoSize, logoSize);
            }

            pdf.setFontSize(28);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(255, 255, 255);
            const title = 'Mundial Tratamento de Agua LTDA';
            const titleWidth = pdf.getTextWidth(title);
            const titleY = (pageHeight / 2) + 55; // Ajustado posição vertical devido ao logo maior
            pdf.text(title, (pageWidth - titleWidth) / 2, titleY);

            // drawFooter(); // Removido da capa conforme solicitado

            pdf.setTextColor(0, 0, 0);
            pdf.setFillColor(0, 0, 0);
            pdf.setDrawColor(0, 0, 0);
            pdf.setLineWidth(0.2);
        };

        // Função para criar página de título do diário
        const addTitlePage = (dateRange: string, location: string) => {
            pdf.addPage();
            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');
            drawHeader();
            drawFooter();

            pdf.setFontSize(24);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(0, 0, 0);
            const mainTitle = reportName;

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
                        lines.push(currentLine || word);
                        currentLine = (currentLine ? word : '');
                    }
                }
                if (currentLine) lines.push(currentLine);
                return lines;
            };

            const maxTitleWidth = pageWidth * 0.7;
            const titleLines = wrapText(mainTitle, maxTitleWidth);

            let titleYPos = 70;
            const lineHeight = 28;

            titleLines.forEach((line, index) => {
                const lineWidth = pdf.getTextWidth(line);
                const xPos = (pageWidth - lineWidth) / 2;
                pdf.text(line, xPos, titleYPos + (index * lineHeight));
            });

            const separatorYPos = titleYPos + ((titleLines.length - 1) * lineHeight) + 15;

            pdf.setLineWidth(3);
            pdf.setDrawColor(100, 100, 100);
            pdf.line(50, separatorYPos, pageWidth - 50, separatorYPos);

            pdf.setFontSize(11);
            pdf.setTextColor(0, 0, 0);

            let yPos = separatorYPos + 25;

            pdf.setFont('helvetica', 'bold');
            pdf.text('Período:', 50, yPos);
            pdf.setFont('helvetica', 'normal');
            pdf.text(dateRange, 50, yPos + 8);
            yPos += 22;

            if (location) {
                pdf.setFont('helvetica', 'bold');
                pdf.text('Local da Obra:', 50, yPos);
                pdf.setFont('helvetica', 'normal');
                pdf.text(location, 50, yPos + 8);
                yPos += 22;
            }

            if (reportDescription) {
                pdf.setFont('helvetica', 'bold');
                pdf.text('Descrição:', 50, yPos);
                pdf.setFont('helvetica', 'normal');
                const descLines = pdf.splitTextToSize(reportDescription, pageWidth - 100);
                pdf.text(descLines, 50, yPos + 8);
            }

            pdf.setDrawColor(0, 0, 0);
            pdf.setLineWidth(0.2);
        };

        // Função para adicionar página de conteúdo com atividades
        const addContentPage = (services: any[]) => {
            pdf.addPage();
            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');
            drawHeader();
            drawFooter();

            pdf.setFontSize(18);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(0, 0, 0);
            const sectionTitle = 'Descrição das Atividades';
            const sectionTitleWidth = pdf.getTextWidth(sectionTitle);
            pdf.text(sectionTitle, (pageWidth - sectionTitleWidth) / 2, 55);

            pdf.setLineWidth(2);
            pdf.setDrawColor(100, 100, 100);
            pdf.line(50, 62, pageWidth - 50, 62);

            let yPos = 80;

            if (services && services.length > 0) {
                pdf.setFontSize(11);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(0, 0, 0);

                services.forEach((service: any) => {
                    if (service.name) {
                        pdf.text(`• ${service.name}`, 50, yPos);
                        yPos += 12;
                        if (yPos > pageHeight - 50) return;
                    }
                });
            }

            pdf.setDrawColor(0, 0, 0);
            pdf.setLineWidth(0.2);
        };

        // Função para adicionar 1 foto por página
        const addPhotoPage = async (photos: any[], index: number, globalImageIndex: number) => {
            pdf.addPage();
            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');
            drawHeader();
            drawFooter();

            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(0, 0, 0);
            const pageTitle = 'Registro Fotográfico';
            const titleWidth = pdf.getTextWidth(pageTitle);
            // Subir título da página (era 55)
            pdf.text(pageTitle, (pageWidth - titleWidth) / 2, 48);

            pdf.setLineWidth(2);
            pdf.setDrawColor(100, 100, 100);
            // Subir linha (era 62)
            pdf.line(50, 53, pageWidth - 50, 53);

            let yOffset = 0;
            if (photos[index] && photos[index].serviceName) {
                pdf.setFontSize(14);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(0, 0, 0);
                const serviceTitle = `Serviço: ${photos[index].serviceName}`;
                const serviceTitleWidth = pdf.getTextWidth(serviceTitle);
                const serviceTitleX = (pageWidth - serviceTitleWidth) / 2;
                // Subir título do serviço (era 75)
                pdf.text(serviceTitle, serviceTitleX, 62);
                yOffset = 8;
            }

            // Margem reduzida para aumentar área da imagem
            const margin = 10;
            const availableWidth = pageWidth - 2 * margin;

            // Calcular espaço necessário para legenda e comentários
            const photo = photos[index];
            if (!photo || !photo.image) return;

            let commentLines = 0;
            if (photo.comment) {
                const lines = pdf.splitTextToSize(photo.comment, availableWidth);
                commentLines = lines.length;
            }

            // Altura do rodapé para descontar da área útil
            const footerHeight = 25;

            // Calcular espaço exato necessário para metadados
            let metaSpace = 0;

            // Label "Foto X" (sempre existe) -> ~10mm
            metaSpace += 8;

            // Datas (verifica se existe antes de reservar espaço)
            let hasDates = false;
            if ((photo.serviceStartDate || photo.serviceEndDate) && config.includeServiceDates) {
                if (photo.serviceStartDate || photo.serviceEndDate) hasDates = true;
            }
            if (hasDates) metaSpace += 8;

            // Comentários
            if (commentLines > 0) {
                metaSpace += (commentLines * 6) + 4; // Reduzido entrelinha de comentários
            }

            // Espaço reservado total (gap + meta + margem inferior)
            const legendSpace = 5 + metaSpace + 5;

            // Posição inicial Y da imagem (abaixo do header e títulos)
            // Header(40) + Title(13) + Line(2) + Service(approx 9) -> ~64
            // Começar em 66
            const topMargin = 66;

            // Altura disponível para a imagem (PageHeight - Top - Legend - Footer - Margin)
            // Footer começa em PageHeight - 25.
            // Então Available Bottom = PageHeight - 25.
            // Max Image Y = Available Bottom - LegendSpace.
            // Available Height = (PageHeight - 25 - LegendSpace) - TopMargin.

            const availableHeight = pageHeight - footerHeight - legendSpace - topMargin - 5;

            // Maximizar a imagem no espaço disponível
            const maxPhotoWidth = availableWidth;
            // Garantir que a altura mínima seja respeitada para evitar erros
            const maxPhotoHeight = (availableHeight > 10) ? availableHeight : 10;

            let photoWidth = 0;
            let photoHeight = 0;


            try {
                // Obter dimensões reais da imagem para manter proporção correta
                const imgProps = pdf.getImageProperties(photo.image);
                const imgRatio = imgProps.width / imgProps.height;

                // Ajustar dimensões mantendo a proporção
                photoWidth = maxPhotoWidth;
                photoHeight = photoWidth / imgRatio;

                // Se a largura for a limitante, recalcula a altura
                if (photoHeight > maxPhotoHeight) {
                    photoHeight = maxPhotoHeight;
                    photoWidth = photoHeight * imgRatio;
                } else if (photoWidth > maxPhotoWidth) {
                    photoWidth = maxPhotoWidth;
                    photoHeight = photoWidth / imgRatio;
                }

                // Centralizar
                // Centralizar
                const centeredX = (pageWidth - photoWidth) / 2;
                const centeredY = topMargin + (maxPhotoHeight - photoHeight) / 2;
                const padding = 0;

                // Detectar formato da imagem (JPEG, PNG, WEBP)
                let imageFormat = 'JPEG';
                if (photo.image.startsWith('data:image/png')) {
                    imageFormat = 'PNG';
                } else if (photo.image.startsWith('data:image/webp')) {
                    imageFormat = 'WEBP';
                }

                pdf.addImage(photo.image, imageFormat, centeredX, centeredY, photoWidth, photoHeight, `img-${globalImageIndex}`, 'MEDIUM');

                // Borda fina na imagem interna (opcional)
                pdf.setLineWidth(0.2);
                pdf.rect(centeredX, centeredY, photoWidth, photoHeight);

                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(0, 0, 0);

                // Legendas abaixo da imagem (agora posicionadas logo abaixo do espaço reservado visual da imagem ou do fim da imagem)
                let legendY = centeredY + photoHeight + 8;

                // Se centralizamos verticalmente no espaço disponível, legendY pode estar muito "alto" se a imagem for 'baixa' (wide). 
                // Mas normalmente queremos as legendas fixas ou logo abaixo? Logo abaixo é melhor.

                /* ... (código de legenda existente permanece, ajustando apenas Y se necessário) ... */

                // Número da Foto
                const photoNum = index + 1; // Relativo ao serviço? Ou global? O "index" aqui é relativo ao array de fotos do serviço.
                // Se quiser global, teria que passar ou calcular. Vamos usar globalImageIndex + 1
                const photoLabel = `Foto ${globalImageIndex + 1}`;
                const photoLabelWidth = pdf.getTextWidth(photoLabel);
                pdf.text(photoLabel, (pageWidth - photoLabelWidth) / 2, legendY);
                legendY += 12;

                // Datas
                let photoDateText = '';
                if ((photo.serviceStartDate || photo.serviceEndDate) && config.includeServiceDates) {
                    if (photo.serviceStartDate && photo.serviceEndDate) {
                        const startDate = formatDateSafe(photo.serviceStartDate);
                        const endDate = formatDateSafe(photo.serviceEndDate);
                        photoDateText = (startDate === endDate) ? `Data: ${startDate}` : `Período: ${startDate} a ${endDate}`;
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
                    pdf.text(photoDateText, (pageWidth - dateTextWidth) / 2, legendY);
                    legendY += 10;
                }

                if (photo.comment) {
                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(9);
                    pdf.setTextColor(0, 0, 0);
                    const commentLines = pdf.splitTextToSize(photo.comment, photoWidth); // Largura do texto igual a da imagem
                    commentLines.forEach((line: string, lineIndex: number) => {
                        const lineWidth = pdf.getTextWidth(line);
                        pdf.text(line, centeredX + (photoWidth - lineWidth) / 2, legendY + (lineIndex * 10));
                    });
                }
            } catch (error) {
                console.error(`Erro ao adicionar imagem ${globalImageIndex + 1}:`, error);
            }
        };

        // Função para adicionar página do termo de serviço
        const addTermsOfServicePage = (termsImage: string) => {
            pdf.addPage();
            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');

            const margin = 10;
            const maxWidth = pageWidth - (2 * margin);
            const maxHeight = pageHeight - (2 * margin);

            try {
                const imgProps = pdf.getImageProperties(termsImage);
                const imgRatio = imgProps.width / imgProps.height;
                let finalWidth = maxWidth;
                let finalHeight = finalWidth / imgRatio;

                if (finalHeight > maxHeight) {
                    finalHeight = maxHeight;
                    finalWidth = finalHeight * imgRatio;
                }

                const imageX = (pageWidth - finalWidth) / 2;
                const imageY = (pageHeight - finalHeight) / 2;

                pdf.setDrawColor(THEME_COLOR_R, THEME_COLOR_G, THEME_COLOR_B); // Verde MTA
                pdf.setLineWidth(1.5);
                pdf.rect(imageX - 2, imageY - 2, finalWidth + 4, finalHeight + 4, 'S');

                pdf.addImage(termsImage, 'JPEG', imageX, imageY, finalWidth, finalHeight, 'terms-of-service', 'MEDIUM');
            } catch (error) {
                console.error('Erro ao adicionar imagem do termo de serviço:', error);
            }
        };

        // Calcular período das datas
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
                    dateRange = `${formatDate(minDate)} a ${formatDate(maxDate)}`;
                }
            }
        }

        if (!dateRange) {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const formatDate = (date: Date) => date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            dateRange = `${formatDate(today)} a ${formatDate(tomorrow)}`;
        }

        addCoverPage();
        addTitlePage(dateRange, workLocation);
        addContentPage(servicesData);

        if (images.length > 0) {
            const uniqueServices: any[] = [];
            const seenServiceIds = new Set<string>();

            for (const service of servicesData) {
                if (!seenServiceIds.has(service.id)) {
                    uniqueServices.push(service);
                    seenServiceIds.add(service.id);
                }
            }

            const imagesByService: { [key: string]: any[] } = {};
            for (const image of images) {
                if (!imagesByService[image.serviceId]) imagesByService[image.serviceId] = [];
                imagesByService[image.serviceId].push(image);
            }

            let globalImageIndex = 0;
            for (const service of uniqueServices) {
                const serviceImages = imagesByService[service.id] || [];
                if (serviceImages.length > 0) {
                    serviceImages.sort((a: any, b: any) => {
                        const nameA = a.fileName || '';
                        const nameB = b.fileName || '';
                        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
                    });

                    // Loop para 1 foto por página
                    for (let i = 0; i < serviceImages.length; i++) {
                        await addPhotoPage(serviceImages, i, globalImageIndex);
                        globalImageIndex++;
                    }
                }
            }
        }

        if (termsOfServiceBase64) {
            addTermsOfServicePage(termsOfServiceBase64);
        }

        const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

        return new NextResponse(new Uint8Array(pdfBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="diario_obra_mta.pdf"',
                'Content-Length': pdfBuffer.length.toString(),
            },
        });

    } catch (error: any) {
        console.error('Erro interno do servidor:', error);
        return NextResponse.json(
            { message: 'Erro interno do servidor', details: error.message },
            { status: 500 }
        );
    }
}
