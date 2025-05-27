/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    domains: [],
    formats: ['image/webp', 'image/avif'],
  },
  // Removi output: 'export' para permitir APIs e middleware
  experimental: {
    serverComponentsExternalPackages: ['jspdf']
  },
  api: {
    bodyParser: {
      sizeLimit: '50mb', // Aumentar limite para muitas imagens
    },
    responseLimit: '50mb',
  },
  // Timeout aumentado para processamento de muitas imagens
  serverRuntimeConfig: {
    maxDuration: 120, // 2 minutos
  },
};

module.exports = nextConfig;
