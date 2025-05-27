# 🏗️ JWS Empreiteira - Sistema de Relatórios

Sistema web para geração automática de relatórios de obra em PDF com interface administrativa moderna.

## ✨ Funcionalidades

- 🔐 **Autenticação segura** com JWT
- 📄 **Geração de PDFs profissionais** com layout personalizado
- 📸 **Upload múltiplo de imagens** (até 20 fotos)
- 🎯 **Controle de resultado** com input separado
- 📱 **Interface responsiva** e moderna
- 🎨 **Layout otimizado** - uma imagem por página, centralizadas

## 🚀 Tecnologias

- **Next.js 14** - Framework React
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **jsPDF** - Geração de PDFs
- **JWT** - Autenticação
- **Radix UI** - Componentes

## 📦 Instalação

```bash
# Clone o repositório
git clone [url-do-repositorio]

# Instale as dependências
npm install

# Execute o servidor de desenvolvimento
npm run dev
```

## 🔑 Acesso

- **URL**: `http://localhost:3000/admin`
- **Login**: `admin@jws.com`
- **Senha**: `admin123`

## 📋 Como Usar

1. Acesse a área administrativa
2. Faça login com as credenciais
3. Preencha os dados da obra
4. Adicione imagens do processo
5. Adicione imagem de resultado (opcional)
6. Gere o PDF profissional

## 📁 Estrutura do Projeto

```
app/
├── admin/                  # Área administrativa
│   ├── login/             # Página de login
│   └── dashboard/         # Dashboard principal
├── api/admin/             # APIs do sistema
│   ├── login/             # Autenticação
│   └── generate-report/   # Geração de PDF
└── components/            # Componentes reutilizáveis
```

## 🎨 Características do PDF

- **Cabeçalho**: Logo e informações da empresa
- **Layout profissional**: Uma imagem por página
- **Imagens centralizadas**: Posicionamento perfeito
- **Seção resultado**: Controle total sobre imagem final
- **Informações completas**: Cliente, local, período, descrição

## 🔧 Configuração

### Alterar Credenciais

Edite `app/api/admin/login/route.ts`:

```typescript
const ADMIN_CREDENTIALS = {
  email: 'novo-email@exemplo.com',
  password: 'hash-da-senha' // Use bcrypt
};
```

### Personalizar PDF

Edite `app/api/admin/generate-report/route.ts` para customizar layout, cores e conteúdo.

## 📄 Licença

Este projeto é propriedade da JWS Empreiteira.

---

**Desenvolvido para JWS Empreiteira** 🏗️ 