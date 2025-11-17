'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Trash2, Download, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface PDFFile {
  id: string;
  file: File;
  name: string;
  size: number;
  separationTitle?: string;
}

export function PdfMerger() {
  const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mergedPdfUrl, setMergedPdfUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [introductionTitle, setIntroductionTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = (files: File[]) => {
    const pdfs = files.filter(file => file.type === 'application/pdf');

    if (pdfs.length !== files.length) {
      toast.error('Apenas arquivos PDF são permitidos');
    }

    const newPdfFiles: PDFFile[] = pdfs.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: file.size
    }));

    setPdfFiles(prev => [...prev, ...newPdfFiles]);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    processFiles(files);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    const files = Array.from(event.dataTransfer.files);
    processFiles(files);
  };

  const removeFile = (id: string) => {
    setPdfFiles(prev => prev.filter(file => file.id !== id));
  };

  const clearAllFiles = () => {
    setPdfFiles([]);
    setMergedPdfUrl(null);
    setProgress(0);
    setIntroductionTitle('');
  };

  const updateSeparationTitle = (id: string, title: string) => {
    setPdfFiles(prev => prev.map(file => 
      file.id === id ? { ...file, separationTitle: title } : file
    ));
  };

  const moveFile = (id: string, direction: 'up' | 'down') => {
    setPdfFiles(prev => {
      const index = prev.findIndex(file => file.id === id);
      if (index === -1) return prev;

      const newFiles = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;

      if (targetIndex >= 0 && targetIndex < newFiles.length) {
        [newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]];
      }

      return newFiles;
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const mergePDFs = async () => {
    if (pdfFiles.length === 0) {
      toast.error('Adicione pelo menos um arquivo PDF');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setMergedPdfUrl(null);

    try {
      setProgress(20);

      const formData = new FormData();
      
      // Adicionar título de introdução se preenchido
      if (introductionTitle.trim()) {
        formData.append('introductionTitle', introductionTitle.trim());
      }
      
      // Adicionar PDFs com seus títulos de separação
      pdfFiles.forEach((pdfFile, index) => {
        formData.append(`pdf-${index}`, pdfFile.file);
        if (pdfFile.separationTitle?.trim()) {
          formData.append(`separationTitle-${index}`, pdfFile.separationTitle.trim());
        }
      });

      setProgress(40);

      const response = await fetch('/api/merge-pdfs', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao mesclar PDFs');
      }

      setProgress(80);

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setMergedPdfUrl(url);
      setProgress(100);

      toast.success('PDFs mesclados com sucesso!');
    } catch (error) {
      console.error('Erro ao mesclar PDFs:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao mesclar PDFs. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadMergedPDF = () => {
    if (mergedPdfUrl) {
      const link = document.createElement('a');
      link.href = mergedPdfUrl;
      link.download = 'documento-mesclado.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload de Arquivos
          </CardTitle>
          <CardDescription>
            Selecione os arquivos PDF que deseja mesclar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-blue-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="lg"
              className="mb-4"
            >
              <Upload className="h-4 w-4 mr-2" />
              Selecionar PDFs
            </Button>
            <p className="text-sm text-gray-500">
              {isDragOver 
                ? 'Solte os arquivos aqui' 
                : 'Arraste e solte os arquivos aqui ou clique para selecionar'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Campo de Introdução */}
      {pdfFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Página de Introdução (Opcional)
            </CardTitle>
            <CardDescription>
              Adicione um título para a página inicial do documento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="introduction-title">Título da Página de Introdução</Label>
              <Input
                id="introduction-title"
                placeholder="Ex: Relatório Consolidado - 2024"
                value={introductionTitle}
                onChange={(e) => setIntroductionTitle(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Deixe em branco se não desejar uma página de introdução
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {pdfFiles.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Arquivos Selecionados ({pdfFiles.length})
                </CardTitle>
                <CardDescription>
                  Reordene ou remova arquivos conforme necessário. Adicione títulos de separação opcionais.
                </CardDescription>
              </div>
              <Button
                onClick={clearAllFiles}
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Todos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pdfFiles.map((pdfFile, index) => (
                <div
                  key={pdfFile.id}
                  className="p-4 bg-gray-50 rounded-lg border space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{index + 1}</Badge>
                      <div>
                        <p className="font-medium text-sm">{pdfFile.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(pdfFile.size)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => moveFile(pdfFile.id, 'up')}
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => moveFile(pdfFile.id, 'down')}
                        disabled={index === pdfFiles.length - 1}
                      >
                        ↓
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeFile(pdfFile.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Campo de título de separação */}
                  <div className="space-y-2">
                    <Label htmlFor={`separation-title-${pdfFile.id}`} className="text-sm">
                      Título de Separação (Opcional)
                    </Label>
                    <Input
                      id={`separation-title-${pdfFile.id}`}
                      placeholder="Ex: Relatório de Setembro, Contrato - Cliente X"
                      value={pdfFile.separationTitle || ''}
                      onChange={(e) => updateSeparationTitle(pdfFile.id, e.target.value)}
                    />
                    <p className="text-xs text-gray-500">
                      Deixe em branco se não desejar uma página de separação antes deste PDF
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Adicionar Mais PDFs
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isProcessing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm font-medium">Mesclando PDFs...</span>
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-gray-500 text-center">
                {progress}% concluído
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {mergedPdfUrl && (
        <Card>
          <CardContent className="pt-6">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                PDFs mesclados com sucesso! Clique no botão abaixo para fazer o download.
              </AlertDescription>
            </Alert>
            <div className="mt-4 text-center">
              <Button onClick={downloadMergedPDF} size="lg" className="bg-green-600 hover:bg-green-700">
                <Download className="h-4 w-4 mr-2" />
                Baixar PDF Mesclado
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {pdfFiles.length > 0 && !isProcessing && !mergedPdfUrl && (
        <div className="text-center">
          <Button
            onClick={mergePDFs}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700"
            disabled={pdfFiles.length === 0}
          >
            <FileText className="h-4 w-4 mr-2" />
            Mesclar PDFs
          </Button>
        </div>
      )}
    </div>
  );
}


