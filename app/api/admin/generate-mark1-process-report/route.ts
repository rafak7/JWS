import { NextRequest, NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';
import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Configuração de runtime para esta API route
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 segundos

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
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Limitar tamanho da imagem para evitar problemas de memória
        const maxSize = 1000 * 1024; // 1MB
        let base64 = buffer.toString('base64');

        // Se a imagem for muito grande, reduzir qualidade (simulação simples cortando buffer, ideal seria usar sharp mas estamos em runtime edge/node simples)
        if (buffer.length > maxSize) {
            const compressionRatio = maxSize / buffer.length;
            const reducedBuffer = buffer.subarray(0, Math.floor(buffer.length * compressionRatio));
            base64 = reducedBuffer.toString('base64');
        }

        const mimeType = file.type || 'image/jpeg';
        return `data:${mimeType};base64,${base64}`;
    } catch (error) {
        console.error('Erro ao converter imagem para base64:', error);
        throw new Error('Falha ao processar imagem');
    }
}

export async function POST(req: Request) {
    try {
        const formData = await req.formData();

        // Extrair dados básicos
        const workName = formData.get('workName') as string;
        const workDate = formData.get('workDate') as string;
        const company = formData.get('company') as string || '';
        const address = formData.get('address') as string || '';
        const location = formData.get('location') as string || '';
        const description = formData.get('description') as string || '';

        if (!workName) {
            return NextResponse.json({ error: 'Nome da obra é obrigatório' }, { status: 400 });
        }

        // Processar imagens
        const processImages: { file: any; comment: string; phase: string; captureDate: string }[] = [];

        // Iterar sobre as entradas do formData para encontrar as imagens
        // O formato esperado é processImage_{index}, processImageComment_{index}, etc.
        // Mas o código do frontend atual envia processImage_{index}

        // Vamos varrer um número razoável de índices para garantir
        for (let i = 0; i < 200; i++) {
            const file = formData.get(`processImage_${i}`);
            if (!file) continue; // Se não achar nesse índice, continua procurando (pode haver buracos se deletou)

            // Se passamos de um certo ponto e não achamos mais nada, podemos parar? 
            // O frontend envia índices sequenciais baseados no array, mas vamos garantir.

            const comment = formData.get(`processImageComment_${i}`) as string || '';
            const phase = formData.get(`processImagePhase_${i}`) as string || 'antes';
            const captureDate = formData.get(`processImageCaptureDate_${i}`) as string || '';

            processImages.push({
                file,
                comment,
                phase,
                captureDate
            });
        }

        if (processImages.length === 0) {
            // Tentar o formato antigo/alternativo se o loop acima falhar ou se o frontend enviar de outra forma
            // O frontend atual (visto no page.tsx) parece usar `processImage_${processImageIndex}`
        }

        // Carregar logo
        const mark1Logo = loadMark1Logo();

        // Gerar senha aleatória forte para o proprietário
        const ownerPassword = crypto.randomBytes(16).toString('hex');

        // Criar PDF
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4',
            encryption: {
                userPermissions: ["print"],
                ownerPassword: ownerPassword,
                userPassword: ""
            }
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 20;

        // Função para desenhar o cabeçalho padrão Mark1
        const drawHeader = () => {
            // Header background
            pdf.setFillColor(41, 128, 185);
            pdf.rect(0, 0, pageWidth, 40, 'F');

            // Logo Area
            const logoSize = 25;
            const logoMargin = 10;
            const logoY = (40 - logoSize) / 2;

            // White background for logo
            pdf.setFillColor(255, 255, 255);
            pdf.rect(logoMargin, logoY, logoSize, logoSize, 'F');

            if (mark1Logo) {
                const imgPadding = 2;
                pdf.addImage(mark1Logo, 'JPEG', logoMargin + imgPadding, logoY + imgPadding, logoSize - (imgPadding * 2), logoSize - (imgPadding * 2));
            }

            // Left Info (Email & Site)
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(255, 255, 255);

            const leftInfoX = logoMargin + logoSize + 5;
            pdf.text('administrativo@mark1hvac.com', leftInfoX, logoY + 5);
            pdf.text('https://www.mark1hvac.com', leftInfoX, logoY + logoSize - 2);

            // Right Info (OR & CNPJ)
            const rightInfoX = pageWidth - 10;
            pdf.text('OR: 21 96462-6765 / 99412-7927', rightInfoX, logoY + 5, { align: 'right' });
            pdf.text('CNPJ: 39.171.921/0001-90', rightInfoX, logoY + logoSize - 2, { align: 'right' });

            // Center Title
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            const title = 'MARK1 SOLUÇÕES EM REFRIGERAÇÃO LTDA';
            const titleWidth = pdf.getTextWidth(title);
            pdf.text(title, (pageWidth - titleWidth) / 2, 23);
        };

        // Função para criar página de capa
        const addCoverPage = () => {
            // Degradê
            const gradientSteps = 30;
            const stepHeight = pageHeight / gradientSteps;
            for (let i = 0; i < gradientSteps; i++) {
                const ratio = i / (gradientSteps - 1);
                const r = Math.round(255 - (255) * ratio);
                const g = Math.round(255 - (255) * ratio);
                const b = Math.round(255 - (255 - 128) * ratio);
                pdf.setFillColor(r, g, b);
                pdf.rect(0, i * stepHeight, pageWidth, stepHeight + 1, 'F');
            }

            if (mark1Logo) {
                const logoSize = 80;
                const logoX = (pageWidth - logoSize) / 2;
                const logoY = (pageHeight - logoSize) / 2 - 20;
                pdf.addImage(mark1Logo, 'JPEG', logoX, logoY, logoSize, logoSize);
            }

            pdf.setFontSize(28);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(255, 255, 255);
            const title = 'RELATÓRIO DE PROCESSO DA OBRA';
            const titleWidth = pdf.getTextWidth(title);
            const titleY = (pageHeight / 2) + 35;
            pdf.text(title, (pageWidth - titleWidth) / 2, titleY);
        };

        // Função para criar página de título/info
        const addInfoPage = () => {
            pdf.addPage();
            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');
            drawHeader();

            pdf.setFontSize(24);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(0, 0, 0);
            const mainTitle = workName;

            // Quebra de linha para título longo
            const maxTitleWidth = pageWidth * 0.7;
            const titleLines = pdf.splitTextToSize(mainTitle, maxTitleWidth);

            let titleYPos = 70;
            const lineHeight = 12;

            titleLines.forEach((line: string, index: number) => {
                const lineWidth = pdf.getTextWidth(line);
                pdf.text(line, (pageWidth - lineWidth) / 2, titleYPos + (index * lineHeight));
            });

            const separatorYPos = titleYPos + (titleLines.length * lineHeight) + 15;

            pdf.setLineWidth(3);
            pdf.setDrawColor(128, 0, 128);
            pdf.line(50, separatorYPos, pageWidth - 50, separatorYPos);

            pdf.setFontSize(12);
            pdf.setTextColor(0, 0, 0);
            let yPos = separatorYPos + 25;

            if (company) {
                pdf.setFont('helvetica', 'bold');
                pdf.text('Cliente:', 50, yPos);
                pdf.setFont('helvetica', 'normal');
                pdf.text(company, 80, yPos);
                yPos += 15;
            }

            if (location) {
                pdf.setFont('helvetica', 'bold');
                pdf.text('Local:', 50, yPos);
                pdf.setFont('helvetica', 'normal');
                pdf.text(location, 80, yPos);
                yPos += 15;
            }

            if (address) {
                pdf.setFont('helvetica', 'bold');
                pdf.text('Endereço:', 50, yPos);
                pdf.setFont('helvetica', 'normal');
                pdf.text(address, 80, yPos);
                yPos += 15;
            }

            pdf.setFont('helvetica', 'bold');
            pdf.text('Data:', 50, yPos);
            pdf.setFont('helvetica', 'normal');
            pdf.text(new Date(workDate).toLocaleDateString('pt-BR'), 80, yPos);
        };

        // Função para criar página dedicada à descrição
        const addDescriptionPage = () => {
            if (!description) return;

            pdf.addPage();
            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');
            drawHeader();

            // Título da seção
            pdf.setFontSize(20);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(0, 0, 0);
            const sectionTitle = 'DESCRIÇÃO DO RELATÓRIO';
            const titleWidth = pdf.getTextWidth(sectionTitle);
            pdf.text(sectionTitle, (pageWidth - titleWidth) / 2, 60);

            // Linha separadora
            pdf.setLineWidth(2);
            pdf.setDrawColor(128, 0, 128);
            pdf.line(50, 68, pageWidth - 50, 68);

            // Descrição com espaço adequado
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(0, 0, 0);

            const descWidth = pageWidth - 100; // 50 margin left + 50 margin right
            const descLines = pdf.splitTextToSize(description, descWidth);

            let yPos = 85;
            const lineSpacing = 7;

            descLines.forEach((line: string, index: number) => {
                // Se ultrapassar a página, adicionar nova página
                if (yPos + lineSpacing > pageHeight - 20) {
                    pdf.addPage();
                    pdf.setFillColor(255, 255, 255);
                    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
                    drawHeader();
                    yPos = 55;
                }

                pdf.text(line, 50, yPos);
                yPos += lineSpacing;
            });
        };
        // Função para adicionar página separadora de fase
        const addPhaseSeparator = (phaseName: string) => {
            pdf.addPage();

            // Fundo Azul Mark1
            pdf.setFillColor(41, 128, 185);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');

            // Texto Centralizado
            pdf.setFontSize(40);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(255, 255, 255);

            const text = `FASE: ${phaseName.toUpperCase()}`;
            const textWidth = pdf.getTextWidth(text);
            pdf.text(text, (pageWidth - textWidth) / 2, pageHeight / 2);
        };

        // Função para adicionar fotos (2 por página)
        const addPhotosPage = async (photos: any[], phaseName: string) => {
            for (let i = 0; i < photos.length; i += 2) {
                pdf.addPage();
                pdf.setFillColor(255, 255, 255);
                pdf.rect(0, 0, pageWidth, pageHeight, 'F');
                drawHeader();

                // Título da página
                pdf.setFontSize(16);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(0, 0, 0);
                const pageTitle = `Registro Fotográfico - ${phaseName.toUpperCase()}`;
                const titleWidth = pdf.getTextWidth(pageTitle);
                pdf.text(pageTitle, (pageWidth - titleWidth) / 2, 55);

                pdf.setLineWidth(2);
                pdf.setDrawColor(128, 0, 128);
                pdf.line(50, 62, pageWidth - 50, 62);

                const margin = 20;
                const spacing = 15;
                const padding = 8;
                const availableWidth = pageWidth - 2 * margin - spacing;
                const availableHeight = pageHeight - 2 * margin - 60;
                const maxPhotoWidth = availableWidth / 2;
                const maxPhotoHeight = availableHeight - 40; // Espaço para legendas

                // Processar até 2 fotos
                for (let j = 0; j < 2 && i + j < photos.length; j++) {
                    const photo = photos[i + j];

                    // Converter para base64 se ainda não for
                    let imageBase64 = '';
                    if (typeof photo.file === 'string') {
                        imageBase64 = photo.file;
                    } else {
                        imageBase64 = await imageToBase64(photo.file);
                    }

                    // Calcular dimensões (proporção 3:2)
                    const aspectRatio = 3 / 2;
                    let photoWidth = maxPhotoWidth;
                    let photoHeight = photoWidth / aspectRatio;

                    if (photoHeight > maxPhotoHeight) {
                        photoHeight = maxPhotoHeight;
                        photoWidth = photoHeight * aspectRatio;
                    }

                    const x = margin + j * (maxPhotoWidth + spacing) + (maxPhotoWidth - photoWidth) / 2;
                    const y = 75;

                    try {
                        // Sombra e borda
                        pdf.setFillColor(220, 220, 220);
                        pdf.roundedRect(x + 2, y + 2, photoWidth, photoHeight, 3, 3, 'F');

                        pdf.setFillColor(255, 255, 255);
                        pdf.setDrawColor(0, 0, 128);
                        pdf.setLineWidth(0.2);
                        pdf.roundedRect(x, y, photoWidth, photoHeight, 3, 3, 'FD');

                        pdf.addImage(imageBase64, 'JPEG', x + padding, y + padding, photoWidth - 2 * padding, photoHeight - 2 * padding, undefined, 'MEDIUM');

                        // Legenda
                        let legendY = y + photoHeight + 10;
                        pdf.setFontSize(10);
                        pdf.setFont('helvetica', 'bold');
                        pdf.setTextColor(0, 0, 0);

                        const label = `Foto ${i + j + 1}`;
                        const labelWidth = pdf.getTextWidth(label);
                        pdf.text(label, x + (photoWidth - labelWidth) / 2, legendY);

                        legendY += 5;

                        if (photo.captureDate) {
                            pdf.setFont('helvetica', 'normal');
                            pdf.setFontSize(8);
                            const dateStr = new Date(photo.captureDate).toLocaleDateString('pt-BR');
                            const dateWidth = pdf.getTextWidth(dateStr);
                            pdf.text(dateStr, x + (photoWidth - dateWidth) / 2, legendY + 5);
                            legendY += 10;
                        }

                        if (photo.comment) {
                            pdf.setFont('helvetica', 'normal');
                            pdf.setFontSize(9);
                            const commentLines = pdf.splitTextToSize(photo.comment, photoWidth);
                            commentLines.forEach((line: string, idx: number) => {
                                const lineWidth = pdf.getTextWidth(line);
                                pdf.text(line, x + (photoWidth - lineWidth) / 2, legendY + 5 + (idx * 4));
                            });
                        }

                    } catch (err) {
                        console.error('Erro ao adicionar imagem:', err);
                    }
                }
            }
        };

        // Gerar o relatório
        addCoverPage();
        addInfoPage();
        addDescriptionPage();

        const phases = ['antes', 'durante', 'depois'];
        for (const phase of phases) {
            const phaseImages = processImages.filter(img => img.phase === phase);
            if (phaseImages.length > 0) {
                addPhaseSeparator(phase);
                await addPhotosPage(phaseImages, phase);
            }
        }

        const pdfBuffer = pdf.output('arraybuffer');

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Relatorio_Processo_Mark1_${workName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`,
            },
        });

    } catch (error) {
        console.error('Erro ao gerar relatório Mark1 Processo:', error);
        return NextResponse.json(
            { error: 'Erro interno ao gerar relatório' },
            { status: 500 }
        );
    }
}
