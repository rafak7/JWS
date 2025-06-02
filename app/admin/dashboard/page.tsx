'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  LogOut, 
  FileText, 
  Download, 
  Calendar,
  Camera,
  Plus,
  Trash2,
  X
} from 'lucide-react';

interface ImageData {
  file: File;
  comment: string;
}

interface ServiceData {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  observations: string;
  images: ImageData[];
}

interface ReportConfig {
  includeCompanyHeader: boolean;
  includeServicesList: boolean;
  includeServiceDates: boolean;
  includeServiceObservations: boolean;
  includeImageComments: boolean;
  includeResultImage: boolean;
  includePhotographicReport: boolean;
  includeHeaderFooter: boolean;
  includeFinalConsiderations: boolean;
}

interface ReportData {
  services: ServiceData[];
  resultImage: File | null;
  config: ReportConfig;
  finalConsiderations: string;
}

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData>({
    services: [{ 
      id: '1', 
      name: '', 
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      observations: '',
      images: [] 
    }],
    resultImage: null,
    config: {
      includeCompanyHeader: true,
      includeServicesList: true,
      includeServiceDates: true,
      includeServiceObservations: true,
      includeImageComments: true,
      includeResultImage: true,
      includePhotographicReport: true,
      includeHeaderFooter: true,
      includeFinalConsiderations: true
    },
    finalConsiderations: ''
  });
  const [activeServiceId, setActiveServiceId] = useState('1');
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
    } else {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    router.push('/admin/login');
  };

  // Funções para gerenciar serviços
  const addService = () => {
    const newId = Date.now().toString();
    setReportData(prev => ({
      ...prev,
      services: [...prev.services, { 
        id: newId, 
        name: '', 
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        observations: '',
        images: [] 
      }]
    }));
    setActiveServiceId(newId);
  };

  const removeService = (serviceId: string) => {
    if (reportData.services.length <= 1) return;
    
    const newServices = reportData.services.filter(service => service.id !== serviceId);
    setReportData(prev => ({
      ...prev,
      services: newServices
    }));
    
    if (activeServiceId === serviceId) {
      setActiveServiceId(newServices[0].id);
    }
  };

  const updateServiceName = (serviceId: string, name: string) => {
    setReportData(prev => ({
      ...prev,
      services: prev.services.map(service => 
        service.id === serviceId 
          ? { ...service, name }
          : service
      )
    }));
  };

  const updateServiceStartDate = (serviceId: string, startDate: string) => {
    setReportData(prev => ({
      ...prev,
      services: prev.services.map(service => 
        service.id === serviceId 
          ? { ...service, startDate }
          : service
      )
    }));
  };

  const updateServiceEndDate = (serviceId: string, endDate: string) => {
    setReportData(prev => ({
      ...prev,
      services: prev.services.map(service => 
        service.id === serviceId 
          ? { ...service, endDate }
          : service
      )
    }));
  };

  const updateServiceObservations = (serviceId: string, observations: string) => {
    setReportData(prev => ({
      ...prev,
      services: prev.services.map(service => 
        service.id === serviceId 
          ? { ...service, observations }
          : service
      )
    }));
  };

  // Funções para gerenciar imagens
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newImages = files.map(file => ({ file, comment: '' }));
    setReportData(prev => ({
      ...prev,
      services: prev.services.map(service => 
        service.id === activeServiceId 
          ? { ...service, images: [...service.images, ...newImages] }
          : service
      )
    }));
  };

  const removeImage = (serviceId: string, index: number) => {
    setReportData(prev => ({
      ...prev,
      services: prev.services.map(service => 
        service.id === serviceId 
          ? { ...service, images: service.images.filter((_, i) => i !== index) }
          : service
      )
    }));
  };

  const removeAllImagesFromService = (serviceId: string) => {
    setReportData(prev => ({
      ...prev,
      services: prev.services.map(service => 
        service.id === serviceId 
          ? { ...service, images: [] }
          : service
      )
    }));
  };

  const updateImageComment = (serviceId: string, imageIndex: number, comment: string) => {
    setReportData(prev => ({
      ...prev,
      services: prev.services.map(service => 
        service.id === serviceId 
          ? { 
              ...service, 
              images: service.images.map((img, index) => 
                index === imageIndex 
                  ? { ...img, comment }
                  : img
              )
            }
          : service
      )
    }));
  };

  const updateConfig = (key: keyof ReportConfig, value: boolean) => {
    setReportData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [key]: value
      }
    }));
  };

  const updateFinalConsiderations = (text: string) => {
    setReportData(prev => ({
      ...prev,
      finalConsiderations: text
    }));
  };

  // Funções para imagem de resultado
  const handleResultImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setReportData(prev => ({
      ...prev,
      resultImage: file
    }));
  };

  const removeResultImage = () => {
    setReportData(prev => ({
      ...prev,
      resultImage: null
    }));
  };

  // Funções auxiliares
  const getActiveService = () => {
    return reportData.services.find(service => service.id === activeServiceId) || reportData.services[0];
  };

  const getTotalImages = () => {
    return reportData.services.reduce((total, service) => total + service.images.length, 0);
  };

  const generatePDF = async () => {
    setLoading(true);
    setMessage('');

    // Verificar se todos os serviços têm nome
    const servicesWithoutName = reportData.services.filter(service => !service.name.trim());
    if (servicesWithoutName.length > 0) {
      setMessage('Por favor, preencha o nome de todos os serviços.');
      setLoading(false);
      return;
    }

    // Verificar se todos os serviços têm datas (apenas se as datas estiverem habilitadas)
    if (reportData.config.includeServiceDates) {
      const servicesWithoutDates = reportData.services.filter(service => !service.startDate || !service.endDate);
      if (servicesWithoutDates.length > 0) {
        setMessage('Por favor, preencha as datas de todos os serviços.');
        setLoading(false);
        return;
      }
    }

    // Verificar se as datas finais são posteriores às iniciais em cada serviço (apenas se as datas estiverem habilitadas)
    if (reportData.config.includeServiceDates) {
      const servicesWithInvalidDates = reportData.services.filter(service => 
        new Date(service.endDate) < new Date(service.startDate)
      );
      if (servicesWithInvalidDates.length > 0) {
        setMessage('A data final deve ser posterior à data inicial em todos os serviços.');
        setLoading(false);
        return;
      }
    }

    // Verificar se há imagens em pelo menos um serviço
    const totalImages = getTotalImages();
    if (totalImages === 0) {
      setMessage('Por favor, adicione pelo menos uma imagem em algum serviço.');
      setLoading(false);
      return;
    }

    // Verificar se algum serviço tem mais de 20 imagens
    const serviceWithTooManyImages = reportData.services.find(service => service.images.length > 20);
    if (serviceWithTooManyImages) {
      setMessage(`O serviço "${serviceWithTooManyImages.name}" tem mais de 20 imagens. Máximo 20 por serviço.`);
      setLoading(false);
      return;
    }

    setMessage(`Processando ${totalImages} imagem(ns) de ${reportData.services.length} serviço(s)...`);

    try {
      console.log('Iniciando criação do FormData...');
      const formData = new FormData();
      
      // Adicionar dados dos serviços
      formData.append('services', JSON.stringify(reportData.services.map(service => ({
        id: service.id,
        name: service.name,
        startDate: service.startDate,
        endDate: service.endDate,
        observations: service.observations
      }))));
      
      // Adicionar configurações do relatório
      formData.append('config', JSON.stringify(reportData.config));
      
      // Adicionar considerações finais
      formData.append('finalConsiderations', reportData.finalConsiderations);
      
      // Adicionar imagens de todos os serviços
      let imageIndex = 0;
      reportData.services.forEach((service) => {
        service.images.forEach((imageData) => {
          formData.append(`image_${imageIndex}`, imageData.file);
          formData.append(`image_${imageIndex}_serviceId`, service.id);
          formData.append(`image_${imageIndex}_comment`, imageData.comment);
          imageIndex++;
        });
      });

      // Adicionar imagem de resultado se existir
      if (reportData.resultImage) {
        formData.append('resultImage', reportData.resultImage);
        console.log('Imagem de resultado adicionada');
      }

      console.log('FormData criado, enviando requisição...');

      // Verificar se o token existe
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setMessage('Token de autenticação não encontrado. Faça login novamente.');
        setLoading(false);
        return;
      }

      // Aumentar timeout para muitas imagens
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutos

      console.log('Enviando requisição para:', '/api/admin/generate-report');
      console.log('Token presente:', !!token);

      const response = await fetch('/api/admin/generate-report', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('Resposta recebida:', response.status, response.statusText);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio_obra_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setMessage('Relatório gerado com sucesso!');
      } else {
        let errorMessage = 'Erro ao gerar relatório';
        try {
          const error = await response.json();
          errorMessage = error.message || error.details || errorMessage;
          console.error('Erro detalhado da API:', error);
        } catch (parseError) {
          console.error('Erro ao parsear resposta de erro:', parseError);
          errorMessage = `Erro HTTP ${response.status}: ${response.statusText}`;
        }
        setMessage(errorMessage);
      }
    } catch (error: any) {
      console.error('Erro capturado:', error);
      
      if (error.name === 'AbortError') {
        setMessage('Timeout: O processamento demorou muito. Tente com menos imagens.');
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setMessage('Erro de conexão: Verifique se o servidor está rodando. Tente recarregar a página.');
      } else {
        setMessage(`Erro ao gerar relatório: ${error.message || 'Erro desconhecido'}`);
      }
      console.error('Erro detalhado:', error);
      console.error('Tipo do erro:', error.name);
      console.error('Stack:', error.stack);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const activeService = getActiveService();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">JWS Admin Dashboard</h1>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Criar Novo Relatório de Obra
              </CardTitle>
              <CardDescription>
                Configure os serviços e adicione imagens para gerar um relatório em PDF
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Seção de Configuração do Relatório */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">Configuração do Relatório</Label>
                  <span className="text-sm text-gray-500">
                    {Object.values(reportData.config).filter(Boolean).length} de {Object.keys(reportData.config).length} elementos ativos
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeCompanyHeader"
                      checked={reportData.config.includeCompanyHeader}
                      onChange={(e) => updateConfig('includeCompanyHeader', e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="includeCompanyHeader" className="text-sm">Cabeçalho da Empresa</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeServicesList"
                      checked={reportData.config.includeServicesList}
                      onChange={(e) => updateConfig('includeServicesList', e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="includeServicesList" className="text-sm">Lista de Serviços</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeServiceDates"
                      checked={reportData.config.includeServiceDates}
                      onChange={(e) => updateConfig('includeServiceDates', e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="includeServiceDates" className="text-sm">Datas dos Serviços</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeServiceObservations"
                      checked={reportData.config.includeServiceObservations}
                      onChange={(e) => updateConfig('includeServiceObservations', e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="includeServiceObservations" className="text-sm">Observações dos Serviços</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeImageComments"
                      checked={reportData.config.includeImageComments}
                      onChange={(e) => updateConfig('includeImageComments', e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="includeImageComments" className="text-sm">Comentários das Imagens</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeResultImage"
                      checked={reportData.config.includeResultImage}
                      onChange={(e) => updateConfig('includeResultImage', e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="includeResultImage" className="text-sm">Imagem de Resultado</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includePhotographicReport"
                      checked={reportData.config.includePhotographicReport}
                      onChange={(e) => updateConfig('includePhotographicReport', e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="includePhotographicReport" className="text-sm">Texto &quot;Relatório Fotográfico&quot;</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeHeaderFooter"
                      checked={reportData.config.includeHeaderFooter}
                      onChange={(e) => updateConfig('includeHeaderFooter', e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="includeHeaderFooter" className="text-sm">Header e Footer com Logo</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeFinalConsiderations"
                      checked={reportData.config.includeFinalConsiderations}
                      onChange={(e) => updateConfig('includeFinalConsiderations', e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="includeFinalConsiderations" className="text-sm">Considerações Finais</Label>
                  </div>
                </div>
                
                {Object.values(reportData.config).filter(Boolean).length < 3 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-700">
                      ⚠️ Atenção: Poucas opções estão ativas. Verifique se o relatório terá o conteúdo necessário.
                    </p>
                  </div>
                )}
              </div>

              {/* Seção de Serviços */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-lg font-semibold">Serviços ({reportData.services.length})</Label>
                  <Button onClick={addService} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Serviço
                  </Button>
                </div>

                {/* Abas dos Serviços */}
                <div className="border rounded-lg">
                  <div className="flex border-b overflow-x-auto">
                    {reportData.services.map((service, index) => (
                      <div key={service.id} className="flex items-center">
                        <button
                          onClick={() => setActiveServiceId(service.id)}
                          className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                            activeServiceId === service.id
                              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          Serviço {index + 1}
                          {service.images.length > 0 && (
                            <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                              {service.images.length}
                            </span>
                          )}
                        </button>
                        {reportData.services.length > 1 && (
                          <button
                            onClick={() => removeService(service.id)}
                            className="p-1 text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Conteúdo do Serviço Ativo */}
                  <div className="p-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`service-name-${activeServiceId}`}>Nome do Serviço</Label>
                      <Input
                        id={`service-name-${activeServiceId}`}
                        placeholder="Ex: Limpeza das janelas e o ACM"
                        value={activeService.name}
                        onChange={(e) => updateServiceName(activeServiceId, e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`service-start-${activeServiceId}`} className={!reportData.config.includeServiceDates ? 'text-gray-400' : ''}>
                          Data Inicial do Serviço
                          {!reportData.config.includeServiceDates && <span className="text-xs text-red-500 ml-2">(Desabilitado na configuração)</span>}
                        </Label>
                        <div className="relative">
                          <Calendar className={`absolute left-3 top-3 h-4 w-4 ${!reportData.config.includeServiceDates ? 'text-gray-300' : 'text-gray-400'}`} />
                          <Input
                            id={`service-start-${activeServiceId}`}
                            type="date"
                            value={activeService.startDate}
                            onChange={(e) => updateServiceStartDate(activeServiceId, e.target.value)}
                            disabled={!reportData.config.includeServiceDates}
                            className={`pl-10 ${!reportData.config.includeServiceDates ? 'bg-gray-100 text-gray-400' : ''}`}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`service-end-${activeServiceId}`} className={!reportData.config.includeServiceDates ? 'text-gray-400' : ''}>
                          Data Final do Serviço
                          {!reportData.config.includeServiceDates && <span className="text-xs text-red-500 ml-2">(Desabilitado na configuração)</span>}
                        </Label>
                        <div className="relative">
                          <Calendar className={`absolute left-3 top-3 h-4 w-4 ${!reportData.config.includeServiceDates ? 'text-gray-300' : 'text-gray-400'}`} />
                          <Input
                            id={`service-end-${activeServiceId}`}
                            type="date"
                            value={activeService.endDate}
                            onChange={(e) => updateServiceEndDate(activeServiceId, e.target.value)}
                            disabled={!reportData.config.includeServiceDates}
                            className={`pl-10 ${!reportData.config.includeServiceDates ? 'bg-gray-100 text-gray-400' : ''}`}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`service-observations-${activeServiceId}`} className={!reportData.config.includeServiceObservations ? 'text-gray-400' : ''}>
                        Observações (Opcional)
                        {!reportData.config.includeServiceObservations && <span className="text-xs text-red-500 ml-2">(Desabilitado na configuração)</span>}
                      </Label>
                      <Textarea
                        id={`service-observations-${activeServiceId}`}
                        placeholder={reportData.config.includeServiceObservations ? "Observações específicas sobre este serviço..." : "Observações desabilitadas na configuração"}
                        value={activeService.observations}
                        onChange={(e) => updateServiceObservations(activeServiceId, e.target.value)}
                        disabled={!reportData.config.includeServiceObservations}
                        rows={3}
                        className={!reportData.config.includeServiceObservations ? 'bg-gray-100 text-gray-400' : ''}
                      />
                    </div>

                    {/* Upload de Imagens do Serviço */}
                    <div className="space-y-4">
                      <Label>
                        Imagens do Serviço (Máximo 20 por serviço)
                        {!reportData.config.includeImageComments && (
                          <span className="text-xs text-orange-500 ml-2">(Comentários desabilitados)</span>
                        )}
                      </Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                        <div className="text-center">
                          <Camera className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="mt-4">
                            <Label htmlFor={`images-${activeServiceId}`} className="cursor-pointer">
                              <span className="mt-2 block text-sm font-medium text-gray-900">
                                Clique para adicionar imagens
                              </span>
                              <Input
                                id={`images-${activeServiceId}`}
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                              />
                            </Label>
                          </div>
                        </div>
                      </div>

                      {activeService.images.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              {activeService.images.length} imagem(ns) selecionada(s)
                              {activeService.images.length > 20 && (
                                <span className="text-red-600 ml-2">
                                  (Máximo 20 imagens por serviço)
                                </span>
                              )}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeAllImagesFromService(activeServiceId)}
                            >
                              Remover Todas
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                            {activeService.images.map((imageData, index) => (
                              <div key={index} className="space-y-2">
                                <div className="relative">
                                  <img
                                    src={URL.createObjectURL(imageData.file)}
                                    alt={`Imagem ${index + 1}`}
                                    className={`w-full h-24 object-cover rounded-lg ${
                                      index >= 20 ? 'opacity-50' : ''
                                    }`}
                                  />
                                  {index >= 20 && (
                                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                                      <span className="text-white text-xs">Não incluída</span>
                                    </div>
                                  )}
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="absolute top-1 right-1 h-5 w-5 p-0"
                                    onClick={() => removeImage(activeServiceId, index)}
                                  >
                                    <Trash2 className="h-2 w-2" />
                                  </Button>
                                  <span className="absolute bottom-1 left-1 bg-black bg-opacity-70 text-white text-xs px-1 rounded">
                                    {index + 1}
                                  </span>
                                </div>
                                <Input
                                  placeholder={reportData.config.includeImageComments ? "Comentário da imagem (opcional)" : "Comentários desabilitados na configuração"}
                                  value={imageData.comment}
                                  onChange={(e) => updateImageComment(activeServiceId, index, e.target.value)}
                                  disabled={!reportData.config.includeImageComments}
                                  className={`text-xs ${!reportData.config.includeImageComments ? 'bg-gray-100 text-gray-400' : ''}`}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção de Considerações Finais */}
              {reportData.config.includeFinalConsiderations && (
              <div className="space-y-4">
                <Label htmlFor="finalConsiderations" className="text-lg font-semibold">
                  Considerações Finais
                </Label>
                <Textarea
                  id="finalConsiderations"
                  placeholder="Digite as considerações finais do relatório..."
                  value={reportData.finalConsiderations}
                  onChange={(e) => updateFinalConsiderations(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500">
                  Este texto aparecerá na seção final do relatório PDF
                </p>
              </div>
              )}

              {/* Seção da Imagem de Resultado */}
              {reportData.config.includeResultImage && (
              <div className="space-y-4">
                <Label>Imagem de Resultado (Opcional)</Label>
                <div className="border-2 border-dashed border-green-300 rounded-lg p-6 bg-green-50">
                  <div className="text-center">
                    <Camera className="mx-auto h-12 w-12 text-green-400" />
                    <div className="mt-4">
                      <Label htmlFor="resultImage" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-green-900">
                          Clique para adicionar imagem de resultado
                        </span>
                        <Input
                          id="resultImage"
                          type="file"
                          accept="image/*"
                          onChange={handleResultImageUpload}
                          className="hidden"
                        />
                      </Label>
                    </div>
                    <p className="text-xs text-green-600 mt-2">
                      Esta imagem aparecerá na seção &quot;Resultado&quot; do PDF
                    </p>
                  </div>
                </div>

                {reportData.resultImage && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-600 font-medium">
                        Imagem de resultado selecionada
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={removeResultImage}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remover
                      </Button>
                    </div>
                    <div className="relative inline-block">
                      <img
                        src={URL.createObjectURL(reportData.resultImage)}
                        alt="Imagem de resultado"
                        className="w-32 h-24 object-cover rounded-lg border-2 border-green-200"
                      />
                      <div className="absolute bottom-1 left-1 bg-green-600 text-white text-xs px-2 py-1 rounded">
                        Resultado
                      </div>
                    </div>
                  </div>
                )}
              </div>
              )}

              {message && (
                <Alert className={message.includes('Erro') || message.includes('Máximo') ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'}>
                  <AlertDescription className={message.includes('Erro') || message.includes('Máximo') ? 'text-red-700' : 'text-blue-700'}>
                    {message}
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={generatePDF}
                disabled={loading}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                {loading ? 'Gerando PDF...' : 'Gerar Relatório PDF'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
} 