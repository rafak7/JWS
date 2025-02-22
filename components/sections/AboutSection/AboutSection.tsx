'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import './AboutSection.scss';

export function AboutSection() {
  return (
    <section className="about-section" id="about">
      <div className="about-section__container">
        <div className="about-section__content">
          <motion.div 
            className="about-section__text"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2>Sobre Nós</h2>
            <p>
              Com anos de experiência no mercado, oferecemos serviços de pintura de alta qualidade
              para residências e estabelecimentos comerciais. Nossa equipe é comprometida com a
              excelência e satisfação do cliente.
            </p>
            <p>
              Utilizamos as melhores técnicas e materiais do mercado para garantir um acabamento
              perfeito e duradouro em cada projeto.
            </p>
            <a href="#contact" className="about-section__cta">
              Entre em Contato
            </a>
          </motion.div>
          
          <motion.div 
            className="about-section__image"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <Image
              src="/images/pintura-fachada.jpg"
              alt="Equipe de pintores profissionais"
              width={600}
              height={400}
              objectFit="cover"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}