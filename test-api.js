import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

async function testAPI() {
  try {
    console.log('🧪 Testando API do JWS...');
    
    // 1. Testar login
    console.log('1. Testando login...');
    const loginResponse = await fetch('http://localhost:3000/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@jws.com',
        password: 'admin123'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login falhou: ${loginResponse.status}`);
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login bem-sucedido');
    
    // 2. Testar geração de relatório simples (sem imagens)
    console.log('2. Testando geração de relatório...');
    const formData = new FormData();
    formData.append('clientName', 'Cliente Teste');
    formData.append('projectName', 'Projeto Teste');
    formData.append('location', 'Local Teste');
    formData.append('startDate', '2024-01-01');
    formData.append('endDate', '2024-01-02');
    formData.append('description', 'Descrição teste');
    formData.append('observations', 'Observações teste');
    formData.append('services', JSON.stringify([{
      id: '1',
      name: 'Serviço Teste',
      startDate: '2024-01-01',
      endDate: '2024-01-02'
    }]));
    
    const reportResponse = await fetch('http://localhost:3000/api/admin/generate-report', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      },
      body: formData
    });
    
    console.log('Status da resposta:', reportResponse.status);
    
    if (reportResponse.ok) {
      console.log('✅ Relatório gerado com sucesso (sem imagens)');
    } else {
      const errorText = await reportResponse.text();
      console.log('❌ Erro ao gerar relatório:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testAPI(); 