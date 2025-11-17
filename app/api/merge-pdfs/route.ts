import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Função para criar página de separação
async function createSeparationPage(pdf: PDFDocument, title: string) {
  const page = pdf.addPage([595, 842]); // A4 size
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  
  // Calcular posição central
  const textSize = 24;
  const textWidth = font.widthOfTextAtSize(title, textSize);
  const textHeight = font.heightAtSize(textSize);
  
  const x = (page.getWidth() - textWidth) / 2;
  const y = (page.getHeight() - textHeight) / 2;
  
  // Adicionar título centralizado
  page.drawText(title, {
    x,
    y,
    size: textSize,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  // Adicionar linha decorativa abaixo do título
  const lineY = y - 20;
  const lineWidth = textWidth + 40;
  const lineX = (page.getWidth() - lineWidth) / 2;
  
  page.drawLine({
    start: { x: lineX, y: lineY },
    end: { x: lineX + lineWidth, y: lineY },
    thickness: 2,
    color: rgb(0.3, 0.3, 0.3),
  });
  
  return page;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract introduction title
    const introductionTitle = formData.get('introductionTitle') as string;
    
    // Extract PDF files and their separation titles
    const pdfFiles: { file: File; separationTitle?: string }[] = [];
    let index = 0;
    
    while (formData.has(`pdf-${index}`)) {
      const file = formData.get(`pdf-${index}`) as File;
      const separationTitle = formData.get(`separationTitle-${index}`) as string;
      
      if (file && file.type === 'application/pdf') {
        pdfFiles.push({
          file,
          separationTitle: separationTitle || undefined
        });
      }
      index++;
    }

    if (pdfFiles.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum arquivo PDF válido encontrado' },
        { status: 400 }
      );
    }

    // Create a new PDF document
    const mergedPdf = await PDFDocument.create();

    // Add introduction page if title is provided
    if (introductionTitle && introductionTitle.trim()) {
      await createSeparationPage(mergedPdf, introductionTitle.trim());
    }

    // Process each PDF file in order
    for (let i = 0; i < pdfFiles.length; i++) {
      const { file, separationTitle } = pdfFiles[i];
      
      // Add separation page if title is provided
      if (separationTitle && separationTitle.trim()) {
        await createSeparationPage(mergedPdf, separationTitle.trim());
      }
      
      const arrayBuffer = await file.arrayBuffer();
      
      try {
        // Load the PDF
        const pdf = await PDFDocument.load(arrayBuffer);
        
        // Copy all pages from the current PDF to the merged PDF
        const pageIndices = pdf.getPageIndices();
        const copiedPages = await mergedPdf.copyPages(pdf, pageIndices);
        
        // Add each page to the merged PDF
        copiedPages.forEach((page) => {
          mergedPdf.addPage(page);
        });
      } catch (error) {
        console.error(`Erro ao processar arquivo ${file.name}:`, error);
        // Continue with other files even if one fails
      }
    }

    // Generate the final PDF
    const pdfBytes = await mergedPdf.save();

    // Return the merged PDF as a response
    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="documento-mesclado.pdf"',
        'Content-Length': pdfBytes.length.toString(),
      },
    });

  } catch (error) {
    console.error('Erro ao mesclar PDFs:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao mesclar PDFs' },
      { status: 500 }
    );
  }
}

