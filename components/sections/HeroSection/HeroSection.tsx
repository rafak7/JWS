'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import './HeroSection.scss';

export function HeroSection() {
  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      className="hero-section"
      style={{
        backgroundImage: 'url("https://images.unsplash.com/photo-1589939705384-5185137a7f0f?ixlib=rb-1.2.1&auto=format&fit=crop&w=2000&q=80")'
      }}
    >
      <div className="hero-section__content">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="hero-section__title">
            Transforme seu Espaço
          </h1>
          <p className="hero-section__subtitle">
            Serviços profissionais de pintura para dar vida aos seus ambientes
          </p>
          <Button
            onClick={scrollToContact}
            className="hero-section__cta"
          >
            Solicitar Orçamento
          </Button>
        </motion.div>
        
        <motion.div
          className="hero-section__scroll-icon"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <ChevronDown />
        </motion.div>
      </div>
    </section>
  );
}