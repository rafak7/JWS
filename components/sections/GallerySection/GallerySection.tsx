'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
} from "@/components/ui/dialog";
import './GallerySection.scss';

const galleryItems = [
  {
    title: "Limpeza da fachada do hotel Linx aeroporto galeão",
    // description: "Projeto residencial com acabamento premium",
    images: [
      "/images/aeroporto-galeao/limpeza-fachada-1.jpeg",
      "/images/aeroporto-galeao/limpeza-fachada-2.jpeg",
      "/images/aeroporto-galeao/limpeza-fachada-3.jpeg",
      "/images/aeroporto-galeao/limpeza-fachada-4.jpeg",
    ]
  },
  {
    title: "Limpeza da clarabóia da recepção do hotel prodigy",
    // description: "Renovação completa de escritório",
    images: [
      "/images/claraboia-prodigy/limpeza-claraboia-1.jpeg",
      "/images/claraboia-prodigy/limpeza-claraboia-2.jpeg",
      "/images/claraboia-prodigy/limpeza-claraboia-3.jpeg",
      "/images/claraboia-prodigy/limpeza-claraboia-4.jpeg",
      "/images/claraboia-prodigy/limpeza-claraboia-5.jpeg",
    ]
  },
  {
    title: "Revitalização do teto do salão do shopping bossa nova mall",
    // description: "Aplicação de textura decorativa",
    images: [
      "/images/rev-teto/rev-teto-1.jpeg",
      "/images/rev-teto/rev-teto-2.jpeg",
      "/images/rev-teto/rev-teto-3.jpeg",
      "/images/rev-teto/rev-teto-4.jpeg",
      "/images/rev-teto/rev-teto-5.jpeg",
    ]
  },
  {
    title: "Reforma da borda da piscina do hotel prodigy",
    // description: "Pintura externa com proteção UV",
    images: [
      "/images/piscina-prodigy/reforma-piscina-1.jpeg",
      "/images/piscina-prodigy/reforma-piscina-2.jpeg",
    ]
  },
  {
    title: "Limpeza das janelas dos quartos do hotel prodigy",
    // description: "Renovação de sala de estar",
    images: [
      "/images/janela-prodigy/limpeza-janela-1.jpeg",
      "/images/janela-prodigy/limpeza-janela-2.jpeg",
      "/images/janela-prodigy/limpeza-janela-3.jpeg",
    ]
  },
  {
    title: "Serviço na subestação no hotel prodigy aeroporto santos Dumont",
    // description: "Projeto para área corporativa",
    images: [
      "/images/sub-prodigy/sub-hotel-1.jpeg",
      "/images/sub-prodigy/sub-hotel-2.jpeg",
      "/images/sub-prodigy/sub-hotel-3.jpeg",
    ]
  },
  {
    title: "Cobertura de policarbonato no hotel prodigy",
    // description: "Renovação de piscina",
    images: [
      "/images/policarbonato-prodigy/policarbonato-prodigy-1.jpeg",
      "/images/policarbonato-prodigy/policarbonato-prodigy-2.jpeg",
      "/images/policarbonato-prodigy/policarbonato-prodigy-3.jpeg",
    ]
  },
  {
    title: "Manutenção na piscina do hotel",
    images: [
      "/images/manut-piscina/manut-1.jpeg",
      "/images/manut-piscina/manut-2.jpeg",
      "/images/manut-piscina/manut-3.jpeg",
      "/images/manut-piscina/manut-4.jpeg",
    ]
  },
  {
    title: "Limpeza das janelas hotel prodigy",
    images: [
      "/images/limpeza-janela-prod/limpeza-jan2.jpeg",
      "/images/limpeza-janela-prod/limpeza-jan1.jpeg",
      "/images/limpeza-janela-prod/limpeza-jan3.jpeg",
    ]
  },
  {
    title: "Reforma da sala da segurança do hotel prodigy",
    images: [
      "/images/reforma-sec/reforma-sec1.jpeg",
      "/images/reforma-sec/reforma-sec2.jpeg",
      "/images/reforma-sec/reforma-sec3.jpeg",
      "/images/reforma-sec/reforma-sec4.jpeg",
    ]
  },
  {
    title: "Revitalização do teto da recepção do prodigy hotel",
    images: [
      "/images/teto-prod/teto-rev1.jpeg",
      "/images/teto-prod/teto-rev2.jpeg",
      "/images/teto-prod/tetp-rev3.jpeg",
      "/images/teto-prod/teto-rev4.jpeg",
    ]
  },
  {
    title: "Troca de vidro 20mm clarabóia do hotel prodigy",
    images: [
      "/images/troca-vidro/troca-vidro1.jpeg",
      "/images/troca-vidro/troca-vidro2.jpeg",
      "/images/troca-vidro/troca-vidro3.jpeg",
      "/images/troca-vidro/troca-vidro4.jpeg",
      "/images/troca-vidro/troca-vidro5.jpeg",
    ]
  },
  {
    title: "Limpeza da clarabóia e ACM",
    images: [
      "/images/limpeza-claraboia-acm/limpeza-claraboia-acm-1.jpeg",
      "/images/limpeza-claraboia-acm/limpeza-claraboia-acm-2.jpeg",
      "/images/limpeza-claraboia-acm/limpeza-claraboia-acm-3.jpeg",
      "/images/limpeza-claraboia-acm/limpeza-claraboia-acm-4.jpeg",
      "/images/limpeza-claraboia-acm/limpeza-claraboia-acm-5.jpeg",
      "/images/limpeza-claraboia-acm/limpeza-claraboia-acm-6.jpeg",
      "/images/limpeza-claraboia-acm/limpeza-claraboia-acm-7.jpeg",
      "/images/limpeza-claraboia-acm/limpeza-claraboia-acm-8.jpeg",
      "/images/limpeza-claraboia-acm/limpeza-claraboia-acm-9.jpeg",      
    ]
  },
];

export function GallerySection() {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handlePrevImage = () => {
    if (selectedImage !== null) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? galleryItems[selectedImage].images.length - 1 : prev - 1
      );
    }
  };

  const handleNextImage = () => {
    if (selectedImage !== null) {
      setCurrentImageIndex((prev) => 
        prev === galleryItems[selectedImage].images.length - 1 ? 0 : prev + 1
      );
    }
  };

  return (
    <section className="gallery-section" id="gallery">
      <div className="gallery-section__container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="gallery-section__header"
        >
          <h2>Galeria de Trabalhos</h2>
          <p>Conheça alguns dos nossos projetos realizados</p>
        </motion.div>

        <div className="gallery-section__grid">
          {galleryItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="gallery-section__item"
              onClick={() => {
                setSelectedImage(index);
                setCurrentImageIndex(0);
              }}
            >
              <img
                src={item.images[0]}
                alt={item.title}
                className="gallery-section__image"
              />
              <div className="gallery-section__overlay">
                <h3>{item.title}</h3>
                {/* <p>{item.description}</p> */}
              </div>
            </motion.div>
          ))}
        </div>

        <Dialog 
          open={selectedImage !== null} 
          onOpenChange={(open) => {
            if (!open) {
              setSelectedImage(null);
              setCurrentImageIndex(0);
            }
          }}
        >
          <DialogOverlay className="gallery-section__modal-overlay" />
          <DialogContent className="gallery-section__modal-content">
            {selectedImage !== null && (
              <>
                <DialogHeader className="gallery-section__modal-header">
                  <DialogTitle>{galleryItems[selectedImage].title}</DialogTitle>
                  {/* <DialogDescription>
                    {galleryItems[selectedImage].description}
                  </DialogDescription> */}
                </DialogHeader>
                
                <div className="gallery-section__modal-gallery">
                  {galleryItems[selectedImage].images.length > 1 && (
                    <button 
                      onClick={handlePrevImage}
                      className="gallery-section__nav-button gallery-section__nav-button--prev"
                      aria-label="Imagem anterior"
                    >
                      ←
                    </button>
                  )}
                  
                  <img
                    src={galleryItems[selectedImage].images[currentImageIndex]}
                    alt={`${galleryItems[selectedImage].title} - Imagem ${currentImageIndex + 1}`}
                    className="gallery-section__modal-image"
                  />
                  
                  {galleryItems[selectedImage].images.length > 1 && (
                    <>
                      <button 
                        onClick={handleNextImage}
                        className="gallery-section__nav-button gallery-section__nav-button--next"
                        aria-label="Próxima imagem"
                      >
                        →
                      </button>
                      <div className="gallery-section__image-counter">
                        {currentImageIndex + 1} / {galleryItems[selectedImage].images.length}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}