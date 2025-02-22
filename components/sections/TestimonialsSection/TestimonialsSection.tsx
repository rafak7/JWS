'use client';

import { motion } from 'framer-motion';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from 'lucide-react';
import './TestimonialsSection.scss';

const testimonials = [
  {
    name: "João Silva",
    role: "Proprietário Residencial",
    content: "Excelente trabalho! A equipe foi muito profissional e o acabamento ficou perfeito. Recomendo fortemente!",
    rating: 5
  },
  {
    name: "Maria Santos",
    role: "Gerente Comercial",
    content: "Contratamos para pintura do nosso escritório e o resultado superou as expectativas. Pontualidade e qualidade impecáveis.",
    rating: 5
  },
  {
    name: "Pedro Oliveira",
    role: "Arquiteto",
    content: "Como profissional da área, posso atestar a qualidade do serviço. Ótimo acabamento e atenção aos detalhes.",
    rating: 5
  },
  {
    name: "Ana Costa",
    role: "Proprietária de Loja",
    content: "Transformaram completamente minha loja. O profissionalismo e a qualidade do trabalho são excepcionais.",
    rating: 5
  }
];

export function TestimonialsSection() {
  return (
    <section className="testimonials-section" id="testimonials">
      <div className="testimonials-section__container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="testimonials-section__header"
        >
          <h2>Depoimentos</h2>
          <p>O que nossos clientes dizem sobre nossos serviços</p>
        </motion.div>

        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="testimonials-section__carousel"
        >
          <CarouselContent>
            {testimonials.map((testimonial, index) => (
              <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card className="testimonials-section__card">
                    <CardContent className="testimonials-section__card-content">
                      <div className="testimonials-section__stars">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star
                            key={i}
                            className="star-pulse"
                          />
                        ))}
                      </div>
                      <p className="testimonials-section__text">
                        {testimonial.content}
                      </p>
                      <div className="testimonials-section__author">
                        <p className="testimonials-section__author-name">
                          {testimonial.name}
                        </p>
                        <p className="testimonials-section__author-role">
                          {testimonial.role}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="testimonials-section__nav-button testimonials-section__nav-button--prev" />
          <CarouselNext className="testimonials-section__nav-button testimonials-section__nav-button--next" />
        </Carousel>
      </div>
    </section>
  );
}