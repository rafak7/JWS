import './globals.css';
import './styles/main.scss';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import { WhatsAppButton } from '@/components/WhatsAppButton';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'JWS - Empreiteira',
  description: 'Transforme seu ambiente com nossos serviços profissionais de pintura. Atendemos residências e empresas com qualidade e excelência.',
  keywords: 'pintura, pintura residencial, pintura comercial, serviços de pintura, pintores profissionais',
  icons: {
    icon: '/images/jws-logo.jpeg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        {children}
        <WhatsAppButton />
        <Toaster />
      </body>
    </html>
  );
}