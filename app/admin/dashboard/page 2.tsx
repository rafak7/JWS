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
  X,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit3,
  Save
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

interface PremiereData {
  services: ServiceData[];
  resultImage: File | null;
  config: ReportConfig;
  finalConsiderations: string;
}

interface CronogramaItem {
  id: string;
  dataInicio: string;
  dataFim: string;
  atividade: string;
  status: 'pendente' | 'em_andamento' | 'concluido';
  observacoes: string;
  ordem: number;
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
  const [premiereData, setPremiereData] = useState<PremiereData>({
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
  const [premiereLocation, setPremiereLocation] = useState('Hotel Marupiara');
  const [activeServiceId, setActiveServiceId] = useState('1');
  const [activePremiereServiceId, setActivePremiereServiceId] = useState('1');
  const [message, setMessage] = useState('');
  const [cronograma, setCronograma] = useState<CronogramaItem[]>([]);
  const [editingCronograma, setEditingCronograma] = useState<string | null>(null);
  const router = useRouter();

  // Função para carregar cronogramas do backend
  const loadCronogramas = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) return;

      const response = await fetch('/api/admin/cronograma', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Se houver cronogramas salvos, carregar o mais recente
        if (data.cronogramas && data.cronogramas.length > 0) {
          const latestCronograma = data.cronogramas[data.cronogramas.length - 1];
          setCronograma(latestCronograma.cronograma || []);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar cronogramas:', error);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
    } else {
      setIsAuthenticated(true);
      // Carregar cronogramas salvos
      loadCronogramas();
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

  // Funções para gerenciar cronograma
  const addCronogramaItem = () => {
    const newItem: CronogramaItem = {
      id: Date.now().toString(),
      dataInicio: new Date().toISOString().split('T')[0],
      dataFim: new Date().toISOString().split('T')[0],
      atividade: '',
      status: 'pendente',
      observacoes: '',
      ordem: cronograma.length + 1
    };
    setCronograma(prev => [...prev, newItem]);
  };

  const removeCronogramaItem = (id: string) => {
    setCronograma(prev => prev.filter(item => item.id !== id));
  };

  const updateCronogramaItem = (id: string, field: keyof CronogramaItem, value: string | number) => {
    setCronograma(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const reorderCronograma = (dragIndex: number, hoverIndex: number) => {
    setCronograma(prev => {
      const newItems = [...prev];
      const draggedItem = newItems[dragIndex];
      newItems.splice(dragIndex, 1);
      newItems.splice(hoverIndex, 0, draggedItem);
      return newItems.map((item, index) => ({ ...item, ordem: index + 1 }));
    });
  };

  const getStatusColor = (status: CronogramaItem['status']) => {
    switch (status) {
      case 'pendente':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'em_andamento':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'concluido':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: CronogramaItem['status']) => {
    switch (status) {
      case 'pendente':
        return <Clock className="w-4 h-4" />;
      case 'em_andamento':
        return <AlertCircle className="w-4 h-4" />;
      case 'concluido':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const saveCronograma = async () => {
    try {
      setMessage('Salvando cronograma...');
      // Aqui você pode adicionar a lógica para salvar no backend
      const response = await fetch('/api/admin/cronograma', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ cronograma })
      });

      if (response.ok) {
        setMessage('Cronograma salvo com sucesso!');
      } else {
        setMessage('Erro ao salvar cronograma');
      }
    } catch (error) {
      setMessage('Erro ao salvar cronograma');
    }
  };

  const gerarCronogramaPDF = async () => {
    if (cronograma.length === 0) {
      setMessage('Adicione pelo menos uma atividade ao cronograma antes de gerar o PDF.');
      return;
    }

    try {
      setLoading(true);
      setMessage('Gerando PDF do cronograma...');

      const token = localStorage.getItem('adminToken');
      if (!token) {
        setMessage('Token de autenticação não encontrado. Faça login novamente.');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/generate-cronograma', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          cronograma,
          titulo: 'Cronograma de Obra - Projeto Principal'
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cronograma_obra_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setMessage('Cronograma PDF gerado com sucesso!');
      } else {
        let errorMessage = 'Erro ao gerar cronograma PDF';
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
        } catch (parseError) {
          errorMessage = `Erro HTTP ${response.status}: ${response.statusText}`;
        }
        setMessage(errorMessage);
      }
    } catch (error: any) {
      console.error('Erro ao gerar cronograma PDF:', error);
      setMessage(`Erro ao gerar cronograma PDF: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const preencherExemplo = () => {
    const exemploCronograma: CronogramaItem[] = [
      {
        id: '1',
        dataInicio: '2024-06-23',
        dataFim: '2024-06-25',
        atividade: 'Identificar locais de isolamentos',
        status: 'pendente',
        observacoes: '',
        ordem: 1
      },
      {
        id: '2',
        dataInicio: '2024-06-26',
        dataFim: '2024-06-30',
        atividade: 'Identificar e reparar trincas e buracos existentes no muro lateral',
        status: 'pendente',
        observacoes: '',
        ordem: 2
      },
      {
        id: '3',
        dataInicio: '2024-07-01',
        dataFim: '2024-07-07',
        atividade: 'Alinhamento e reforço estrutural aonde for necessário no muro lateral',
        status: 'pendente',
        observacoes: '',
        ordem: 3
      },
      {
        id: '4',
        dataInicio: '2024-07-08',
        dataFim: '2024-07-10',
        atividade: 'Demolição do muro dos fundos',
        status: 'pendente',
        observacoes: 'Aguardando entrega das placas e pilares',
        ordem: 4
      },
      {
        id: '5',
        dataInicio: '2024-07-11',
        dataFim: '2024-07-12',
        atividade: 'Bota fora',
        status: 'pendente',
        observacoes: '',
        ordem: 5
      },
      {
        id: '6',
        dataInicio: '2024-07-13',
        dataFim: '2024-07-14',
        atividade: 'Limpeza da área demolida',
        status: 'pendente',
        observacoes: '',
        ordem: 6
      },
      {
        id: '7',
        dataInicio: '2024-07-15',
        dataFim: '2024-07-25',
        atividade: 'Construção do muro lateral do posto',
        status: 'pendente',
        observacoes: 'Em sequência à demolição',
        ordem: 7
      }
    ];
    
    setCronograma(exemploCronograma);
    setMessage('Cronograma preenchido com exemplo baseado no seu projeto!');
  };

  // Funções auxiliares
  const getActiveService = () => {
    return reportData.services.find(service => service.id === activeServiceId) || reportData.services[0];
  };

  const getTotalImages = () => {
    return reportData.services.reduce((total, service) => total + service.images.length, 0);
  };

  // Funções para gerenciar serviços do Premiere
  const addPremiereService = () => {
    const newId = Date.now().toString();
    setPremiereData(prev => ({
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
    setActivePremiereServiceId(newId);
  };

  const removePremiereService = (serviceId: string) => {
    if (premiereData.services.length <= 1) return;
    
    const newServices = premiereData.services.filter(service => service.id !== serviceId);
    setPremiereData(prev => ({
      ...prev,
      services: newServices
    }));
    
    if (activePremiereServiceId === serviceId) {
      setActivePremiereServiceId(newServices[0].id);
    }
  };

  const updatePremiereServiceName = (serviceId: string, name: string) => {
    setPremiereData(prev => ({
      ...prev,
      services: prev.services.map(service => 
        service.id === serviceId 
          ? { ...service, name }
          : service
      )
    }));
  };

  const updatePremiereServiceStartDate = (serviceId: string, startDate: string) => {
    setPremiereData(prev => ({
      ...prev,
      services: prev.services.map(service => 
        service.id === serviceId 
          ? { ...service, startDate }
          : service
      )
    }));
  };

  const updatePremiereServiceEndDate = (serviceId: string, endDate: string) => {
    setPremiereData(prev => ({
      ...prev,
      services: prev.services.map(service => 
        service.id === serviceId 
          ? { ...service, endDate }
          : service
      )
    }));
  };

  const updatePremiereServiceObservations = (serviceId: string, observations: string) => {
    setPremiereData(prev => ({
      ...prev,
      services: prev.services.map(service => 
        service.id === serviceId 
          ? { ...service, observations }
          : service
      )
    }));
  };

  const handlePremiereImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages = Array.from(files).map(file => ({ file, comment: '' }));
    
    setPremiereData(prev => ({
      ...prev,
      services: prev.services.map(service => 
        service.id === activePremiereServiceId
          ? { ...service, images: [...service.images, ...newImages] }
          : service
      )
    }));
  };

  const removePremiereImage = (serviceId: string, index: number) => {
    setPremiereData(prev => ({
      ...prev,
      services: prev.services.map(service => 
        service.id === serviceId
          ? { ...service, images: service.images.filter((_, i) => i !== index) }
          : service
      )
    }));
  };

  const removeAllPremiereImagesFromService = (serviceId: string) => {
    setPremiereData(prev => ({
      ...prev,
      services: prev.services.map(service => 
        service.id === serviceId
          ? { ...service, images: [] }
          : service
      )
    }));
  };

  const updatePremiereImageComment = (serviceId: string, imageIndex: number, comment: string) => {
    setPremiereData(prev => ({
      ...prev,
      services: prev.services.map(service => 
        service.id === serviceId
          ? {
              ...service,
              images: service.images.map((img, i) => 
                i === imageIndex ? { ...img, comment } : img
              )
            }
          : service
      )
    }));
  };

  const updatePremiereConfig = (key: keyof ReportConfig, value: boolean) => {
    setPremiereData(prev => ({
      ...prev,
      config: { ...prev.config, [key]: value }
    }));
  };

  const updatePremiereFinalConsiderations = (text: string) => {
    setPremiereData(prev => ({
      ...prev,
      finalConsiderations: text
    }));
  };

  const handlePremiereResultImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPremiereData(prev => ({ ...prev, resultImage: file }));
    }
  };

  const removePremiereResultImage = () => {
    setPremiereData(prev => ({ ...prev, resultImage: null }));
  };

  const getActivePremiereService = () => {
    return premiereData.services.find(service => service.id === activePremiereServiceId);
  };

  const getTotalPremiereImages = () => {
    return premiereData.services.reduce((total, service) => total + service.images.length, 0);
  };

  const generatePremierePDF = async () => {
    setLoading(true);
    setMessage('');

    try {
      console.log('Iniciando geração de relatório Premiere...');

      if (premiereData.services.length === 0) {
        setMessage('Adicione pelo menos um serviço antes de gerar o relatório.');
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('services', JSON.stringify(premiereData.services));
      formData.append('config', JSON.stringify(premiereData.config));
      formData.append('finalConsiderations', premiereData.finalConsiderations);
      formData.append('location', premiereLocation);

      console.log('FormData base criado');

      let imageIndex = 0;
      premiereData.services.forEach((service) => {
        service.images.forEach((imageData) => {
          formData.append(`image_${imageIndex}`, imageData.file);
          formData.append(`image_${imageIndex}_serviceId`, service.id);
          formData.append(`image_${imageIndex}_comment`, imageData.comment);
          imageIndex++;
        });
      });

      if (premiereData.resultImage) {
        formData.append('resultImage', premiereData.resultImage);
        console.log('Imagem de resultado Premiere adicionada');
      }

      console.log('FormData criado, enviando requisição...');

      const token = localStorage.getItem('adminToken');
      if (!token) {
        setMessage('Token de autenticação não encontrado. Faça login novamente.');
        setLoading(false);
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutos

      console.log('Enviando requisição para:', '/api/admin/generate-premiere-report');
      console.log('Token presente:', !!token);

      const response = await fetch('/api/admin/generate-premiere-report', {
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
        a.download = `diario_obra_premiere_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setMessage('Diário de Obra Premiere gerado com sucesso!');
      } else {
        let errorMessage = 'Erro ao gerar relatório Premiere';
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
        setMessage(`Erro ao gerar relatório Premiere: ${error.message || 'Erro desconhecido'}`);
      }
      console.error('Erro detalhado:', error);
      console.error('Tipo do erro:', error.name);
      console.error('Stack:', error.stack);
    } finally {
      setLoading(false);
    }
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
                JWS Admin Dashboard
              </CardTitle>
              <CardDescription>
                Gerencie relatórios de obra, diários Premiere (4 fotos grandes por página) e cronogramas de projeto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="relatorio" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="relatorio" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Relatório de Obra
                  </TabsTrigger>
                  <TabsTrigger value="premiere" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Premiere
                  </TabsTrigger>
                  <TabsTrigger value="cronograma" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Cronograma de Obra
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="relatorio" className="space-y-6 mt-6">
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
                </TabsContent>

                <TabsContent value="premiere" className="space-y-6 mt-6">
                  {/* Seção de Configuração do Relatório Premiere */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-lg font-semibold">Configuração do Relatório Premiere</Label>
                      <span className="text-sm text-gray-500">
                        {Object.values(premiereData.config).filter(Boolean).length} de {Object.keys(premiereData.config).length} elementos ativos
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="premiere-includeCompanyHeader"
                          checked={premiereData.config.includeCompanyHeader}
                          onChange={(e) => updatePremiereConfig('includeCompanyHeader', e.target.checked)}
                          className="rounded"
                        />
                        <Label htmlFor="premiere-includeCompanyHeader" className="text-sm">Cabeçalho da Empresa</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="premiere-includeServicesList"
                          checked={premiereData.config.includeServicesList}
                          onChange={(e) => updatePremiereConfig('includeServicesList', e.target.checked)}
                          className="rounded"
                        />
                        <Label htmlFor="premiere-includeServicesList" className="text-sm">Lista de Serviços</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="premiere-includeServiceDates"
                          checked={premiereData.config.includeServiceDates}
                          onChange={(e) => updatePremiereConfig('includeServiceDates', e.target.checked)}
                          className="rounded"
                        />
                        <Label htmlFor="premiere-includeServiceDates" className="text-sm">Datas dos Serviços</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="premiere-includeServiceObservations"
                          checked={premiereData.config.includeServiceObservations}
                          onChange={(e) => updatePremiereConfig('includeServiceObservations', e.target.checked)}
                          className="rounded"
                        />
                        <Label htmlFor="premiere-includeServiceObservations" className="text-sm">Observações dos Serviços</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="premiere-includeImageComments"
                          checked={premiereData.config.includeImageComments}
                          onChange={(e) => updatePremiereConfig('includeImageComments', e.target.checked)}
                          className="rounded"
                        />
                        <Label htmlFor="premiere-includeImageComments" className="text-sm">Comentários das Imagens</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="premiere-includeResultImage"
                          checked={premiereData.config.includeResultImage}
                          onChange={(e) => updatePremiereConfig('includeResultImage', e.target.checked)}
                          className="rounded"
                        />
                        <Label htmlFor="premiere-includeResultImage" className="text-sm">Imagem de Resultado</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="premiere-includePhotographicReport"
                          checked={premiereData.config.includePhotographicReport}
                          onChange={(e) => updatePremiereConfig('includePhotographicReport', e.target.checked)}
                          className="rounded"
                        />
                        <Label htmlFor="premiere-includePhotographicReport" className="text-sm">Texto &quot;Relatório Fotográfico&quot;</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="premiere-includeHeaderFooter"
                          checked={premiereData.config.includeHeaderFooter}
                          onChange={(e) => updatePremiereConfig('includeHeaderFooter', e.target.checked)}
                          className="rounded"
                        />
                        <Label htmlFor="premiere-includeHeaderFooter" className="text-sm">Header e Footer com Logo</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="premiere-includeFinalConsiderations"
                          checked={premiereData.config.includeFinalConsiderations}
                          onChange={(e) => updatePremiereConfig('includeFinalConsiderations', e.target.checked)}
                          className="rounded"
                        />
                        <Label htmlFor="premiere-includeFinalConsiderations" className="text-sm">Considerações Finais</Label>
                      </div>
                    </div>
                    
                    {Object.values(premiereData.config).filter(Boolean).length < 3 && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-700">
                          ⚠️ Atenção: Poucas opções estão ativas. Verifique se o relatório terá o conteúdo necessário.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Seção de Serviços Premiere */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-lg font-semibold">Serviços Premiere ({premiereData.services.length})</Label>
                      <Button onClick={addPremiereService} variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Serviço
                      </Button>
                    </div>

                    {/* Abas dos Serviços Premiere */}
                    <div className="border rounded-lg">
                      <div className="flex border-b overflow-x-auto">
                        {premiereData.services.map((service, index) => (
                          <div key={service.id} className="flex items-center">
                            <button
                              onClick={() => setActivePremiereServiceId(service.id)}
                              className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                                activePremiereServiceId === service.id
                                  ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-700'
                                  : 'text-gray-500 hover:text-gray-700'
                              }`}
                            >
                              Serviço {index + 1}
                              {service.images.length > 0 && (
                                <span className="ml-2 bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                                  {service.images.length}
                                </span>
                              )}
                            </button>
                            {premiereData.services.length > 1 && (
                              <button
                                onClick={() => removePremiereService(service.id)}
                                className="p-1 text-red-500 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Conteúdo do Serviço Ativo Premiere */}
                      <div className="p-4 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="premiere-service-name">Nome do Serviço</Label>
                          <Input
                            id="premiere-service-name"
                            placeholder="Ex: Limpeza de fachada, Pintura, etc."
                            value={getActivePremiereService()?.name || ''}
                            onChange={(e) => updatePremiereServiceName(activePremiereServiceId, e.target.value)}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="premiere-start-date">Data de Início</Label>
                            <Input
                              id="premiere-start-date"
                              type="date"
                              value={getActivePremiereService()?.startDate || ''}
                              onChange={(e) => updatePremiereServiceStartDate(activePremiereServiceId, e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="premiere-end-date">Data de Término</Label>
                            <Input
                              id="premiere-end-date"
                              type="date"
                              value={getActivePremiereService()?.endDate || ''}
                              onChange={(e) => updatePremiereServiceEndDate(activePremiereServiceId, e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="premiere-observations">Observações do Serviço</Label>
                          <Textarea
                            id="premiere-observations"
                            placeholder="Descreva detalhes importantes sobre o serviço executado..."
                            value={getActivePremiereService()?.observations || ''}
                            onChange={(e) => updatePremiereServiceObservations(activePremiereServiceId, e.target.value)}
                            rows={3}
                          />
                        </div>

                        {/* Upload de Imagens Premiere */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                                                       <Label>Fotos do Serviço ({getActivePremiereService()?.images.length || 0})</Label>
                             {(getActivePremiereService()?.images.length || 0) > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeAllPremiereImagesFromService(activePremiereServiceId)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Remover Todas
                              </Button>
                            )}
                          </div>
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
                            <Camera className="mx-auto h-12 w-12 text-gray-400" />
                            <p className="mt-2 text-sm text-gray-600">
                              Arraste imagens aqui ou clique para selecionar
                            </p>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={handlePremiereImageUpload}
                              className="hidden"
                              id="premiere-image-upload"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              onClick={() => document.getElementById('premiere-image-upload')?.click()}
                            >
                              Selecionar Imagens
                            </Button>
                          </div>

                                                     {/* Galeria de Imagens Premiere */}
                           {(getActivePremiereService()?.images.length || 0) > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                              {getActivePremiereService()?.images.map((imageData, index) => (
                                <div key={index} className="relative group border rounded-lg overflow-hidden">
                                  <img
                                    src={URL.createObjectURL(imageData.file)}
                                    alt={`Foto ${index + 1}`}
                                    className="w-full h-32 object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                      onClick={() => removePremiereImage(activePremiereServiceId, index)}
                                      className="text-white hover:text-red-300"
                                    >
                                      <Trash2 className="w-5 h-5" />
                                    </button>
                                  </div>
                                  <div className="p-2">
                                    <Textarea
                                      placeholder="Comentário da imagem..."
                                      value={imageData.comment}
                                      onChange={(e) => updatePremiereImageComment(activePremiereServiceId, index, e.target.value)}
                                      rows={2}
                                      className="text-xs"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Imagem de Resultado Final Premiere */}
                  <div className="space-y-4">
                    <Label className="text-lg font-semibold">Imagem de Resultado Final (Opcional)</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
                      {premiereData.resultImage ? (
                        <div className="space-y-4">
                          <img
                            src={URL.createObjectURL(premiereData.resultImage)}
                            alt="Resultado final"
                            className="mx-auto max-h-40 rounded-lg"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={removePremiereResultImage}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Remover Imagem
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Camera className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-600">
                            Adicione uma imagem que mostra o resultado final do trabalho
                          </p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePremiereResultImageUpload}
                            className="hidden"
                            id="premiere-result-image-upload"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => document.getElementById('premiere-result-image-upload')?.click()}
                          >
                            Selecionar Imagem
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Local da Obra Premiere */}
                  <div className="space-y-4">
                    <Label className="text-lg font-semibold">Local da Obra</Label>
                    <Input
                      placeholder="Ex: Hotel Marupiara, Edifício Copacabana, etc."
                      value={premiereLocation}
                      onChange={(e) => setPremiereLocation(e.target.value)}
                    />
                    <p className="text-sm text-gray-600">
                      Este nome aparecerá na página de título do Diário de Obra
                    </p>
                  </div>

                  {/* Considerações Finais Premiere */}
                  <div className="space-y-4">
                    <Label className="text-lg font-semibold">Considerações Finais</Label>
                    <Textarea
                      placeholder="Adicione observações finais, recomendações ou conclusões sobre os serviços executados..."
                      value={premiereData.finalConsiderations}
                      onChange={(e) => updatePremiereFinalConsiderations(e.target.value)}
                      rows={4}
                    />
                  </div>

                  {/* Resumo e Geração do Relatório Premiere */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 text-purple-900">Resumo do Diário de Obra Premiere</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center">
                        <div className="text-lg font-bold text-purple-700">{premiereData.services.length}</div>
                        <div className="text-sm text-purple-600">Serviços</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-purple-700">{getTotalPremiereImages()}</div>
                        <div className="text-sm text-purple-600">Fotos</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-purple-700">{Math.ceil(getTotalPremiereImages() / 4)}</div>
                        <div className="text-sm text-purple-600">Páginas de Fotos</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-purple-700">
                          {premiereLocation ? '✓' : '✗'}
                        </div>
                        <div className="text-sm text-purple-600">Local Definido</div>
                      </div>
                    </div>
                    
                    <div className="mb-4 p-3 bg-white rounded border">
                      <p className="text-sm text-purple-800">
                        <strong>Local da Obra:</strong> {premiereLocation || 'Não definido'}
                      </p>
                                           <p className="text-sm text-purple-600 mt-1">
                       Este diário será gerado com 4 fotos grandes por página em layout 2x2 com fundo degradê azul-branco
                     </p>
                    </div>

                    <Button
                      onClick={generatePremierePDF}
                      disabled={loading || premiereData.services.length === 0}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      size="lg"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      {loading ? 'Gerando Diário de Obra...' : 'Gerar Diário de Obra PDF'}
                    </Button>

                    {message && (
                      <Alert className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{message}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="cronograma" className="space-y-6 mt-6">
                  {/* Cabeçalho do Cronograma */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center">
                        <Calendar className="w-5 h-5 mr-2" />
                        Cronograma de Obra
                      </h3>
                      <p className="text-sm text-gray-600">
                        Gerencie as etapas e prazos do projeto
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={addCronogramaItem} size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Atividade
                      </Button>
                      <Button onClick={preencherExemplo} size="sm" variant="secondary">
                        <Clock className="w-4 h-4 mr-2" />
                        Carregar Exemplo
                      </Button>
                      <Button onClick={saveCronograma} variant="outline" size="sm">
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Cronograma
                      </Button>
                      <Button 
                        onClick={gerarCronogramaPDF} 
                        variant="default" 
                        size="sm"
                        disabled={loading || cronograma.length === 0}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {loading ? 'Gerando PDF...' : 'Baixar PDF'}
                      </Button>
                    </div>
                  </div>

                  {/* Lista de Atividades do Cronograma */}
                  {cronograma.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                      <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-4 text-gray-500">Nenhuma atividade no cronograma</p>
                      <p className="text-sm text-gray-400">Clique em &quot;Adicionar Atividade&quot; para começar</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cronograma
                        .sort((a, b) => a.ordem - b.ordem)
                        .map((item, index) => (
                        <div key={item.id} className={`border rounded-lg p-4 ${getStatusColor(item.status)}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(item.status)}
                                <span className="font-medium text-sm">#{item.ordem}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingCronograma(editingCronograma === item.id ? null : item.id)}
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeCronogramaItem(item.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {editingCronograma === item.id ? (
                            <div className="mt-4 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor={`dataInicio-${item.id}`} className="text-sm">Data de Início</Label>
                                  <Input
                                    id={`dataInicio-${item.id}`}
                                    type="date"
                                    value={item.dataInicio}
                                    onChange={(e) => updateCronogramaItem(item.id, 'dataInicio', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`dataFim-${item.id}`} className="text-sm">Data de Fim</Label>
                                  <Input
                                    id={`dataFim-${item.id}`}
                                    type="date"
                                    value={item.dataFim}
                                    onChange={(e) => updateCronogramaItem(item.id, 'dataFim', e.target.value)}
                                  />
                                </div>
                              </div>
                              <div>
                                <Label htmlFor={`atividade-${item.id}`} className="text-sm">Descrição da Atividade</Label>
                                <Input
                                  id={`atividade-${item.id}`}
                                  placeholder="Ex: identificar locais de isolamentos"
                                  value={item.atividade}
                                  onChange={(e) => updateCronogramaItem(item.id, 'atividade', e.target.value)}
                                />
                              </div>
                              <div>
                                <Label htmlFor={`status-${item.id}`} className="text-sm">Status</Label>
                                <select
                                  id={`status-${item.id}`}
                                  value={item.status}
                                  onChange={(e) => updateCronogramaItem(item.id, 'status', e.target.value)}
                                  className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                  <option value="pendente">Pendente</option>
                                  <option value="em_andamento">Em Andamento</option>
                                  <option value="concluido">Concluído</option>
                                </select>
                              </div>
                              <div>
                                <Label htmlFor={`observacoes-${item.id}`} className="text-sm">Observações</Label>
                                <Textarea
                                  id={`observacoes-${item.id}`}
                                  placeholder="Observações adicionais..."
                                  value={item.observacoes}
                                  onChange={(e) => updateCronogramaItem(item.id, 'observacoes', e.target.value)}
                                  rows={3}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center space-x-4 text-sm">
                                <span className="font-medium">
                                  {new Date(item.dataInicio).toLocaleDateString('pt-BR')} até {new Date(item.dataFim).toLocaleDateString('pt-BR')}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                                  {item.status === 'pendente' && 'Pendente'}
                                  {item.status === 'em_andamento' && 'Em Andamento'}
                                  {item.status === 'concluido' && 'Concluído'}
                                </span>
                              </div>
                              <p className="text-gray-700">{item.atividade}</p>
                              {item.observacoes && (
                                <p className="text-sm text-gray-600 italic">{item.observacoes}</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Exemplo baseado no que o cliente enviou */}
                  {cronograma.length === 0 && (
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Exemplo baseado no seu projeto:</h4>
                      <div className="text-sm text-blue-800 space-y-1">
                        <p>• Dia 23/06 a 25/06: identificar locais de isolamentos</p>
                        <p>• Dia 26/06 a 30/06: identificar e reparar trincas e buracos existentes no muro lateral</p>
                        <p>• Dia 01/07 a 07/07: alinhamento e reforço estrutural aonde for necessário no muro lateral</p>
                        <p>• Demolição do muro dos fundos (aguardando entrega das placas e pilares)</p>
                        <p>• Bota fora</p>
                        <p>• Limpeza da área demolida</p>
                        <p>• Construção do muro lateral do posto</p>
                      </div>
                      <p className="text-xs text-blue-600 mt-2">Clique em &quot;Adicionar Atividade&quot; para criar seu cronograma personalizado</p>
                    </div>
                  )}

                  {/* Informações sobre o PDF */}
                  {cronograma.length > 0 && (
                    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-2 flex items-center">
                        <Download className="w-4 h-4 mr-2" />
                        Relatório PDF do Cronograma
                      </h4>
                      <div className="text-sm text-green-800 space-y-1">
                        <p>✅ <strong>{cronograma.length}</strong> atividade(s) será(ão) incluída(s) no PDF</p>
                        <p>📋 Cronograma ordenado por sequência de execução</p>
                        <p>🎨 Mesmo template visual do relatório de obra</p>
                        <p>📊 Inclui resumo com estatísticas de progresso</p>
                        <p>🏢 Cabeçalho profissional da JWS Empreiteira</p>
                      </div>
                      <p className="text-xs text-green-600 mt-2">Clique em &quot;Baixar PDF&quot; para gerar o cronograma formatado</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
} 