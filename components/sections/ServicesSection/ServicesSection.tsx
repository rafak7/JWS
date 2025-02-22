'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Paintbrush, Home, Building2, Palette, PaintBucket, Ruler } from 'lucide-react';
import './ServicesSection.scss';

const services = [
  {
    icon: <Paintbrush className="w-12 h-12 text-primary" />,
    title: 'Pintura Residencial',
    description: 'Transforme sua casa com acabamentos perfeitos e cores que combinam com seu estilo.'
  },
  {
    icon: <Building2 className="w-12 h-12 text-primary" />,
    title: 'Pintura Comercial',
    description: 'Soluções profissionais para empresas, com foco em durabilidade e prazo.'
  },
  {
    icon: <Palette className="w-12 h-12 text-primary" />,
    title: 'Texturas e Efeitos',
    description: 'Técnicas especiais para criar ambientes únicos e personalizados.'
  },
  {
    icon: <PaintBucket className="w-12 h-12 text-primary" />,
    title: 'Impermeabilização',
    description: 'Proteção eficiente contra umidade e infiltrações.'
  },
  {
    icon: <Home className="w-12 h-12 text-primary" />,
    title: 'Pintura de Fachadas',
    description: 'Valorize seu imóvel com uma fachada impecável e moderna.'
  },
  {
    icon: <Ruler className="w-12 h-12 text-primary" />,
    title: 'Consultoria em Cores',
    description: 'Orientação profissional para escolher as melhores cores para seu projeto.'
  }
];

export function ServicesSection() {
  return (
    <section className="services-section" id="services">
      <div className="services-section__container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="services-section__header"
        >
          <h2>Nossos Serviços</h2>
          <p>
            Oferecemos soluções completas em pintura para todos os tipos de ambientes
          </p>
        </motion.div>

        <div className="services-section__grid">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card className="services-section__card">
                <CardHeader className="services-section__card-header">
                  <div className="services-section__icon">
                    {service.icon}
                  </div>
                  <CardTitle className="services-section__title">
                    {service.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="services-section__card-content">
                  <p className="services-section__description">
                    {service.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}