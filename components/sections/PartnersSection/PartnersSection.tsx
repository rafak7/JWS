'use client';

import { Swiper as SwiperType } from 'swiper';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';

// Importações de estilos do Swiper
import 'swiper/css';
import 'swiper/css/autoplay';

import './PartnersSection.scss';

interface Partner {
    id: number;
    name: string;
    logo: string;
}

const partners: Partner[] = [
    { id: 1, name: 'Parceiro 1', logo: '/images/parceiros/logo_linx.webp' },
    { id: 2, name: 'Parceiro 2', logo: '/images/parceiros/logo_prodigy.png' },
    { id: 3, name: 'Parceiro 3', logo: '/images/parceiros/logo_bossanova.png' },
    { id: 4, name: 'Parceiro 4', logo: '/images/parceiros/logo_arena.png' },
    { id: 5, name: 'Parceiro 5', logo: '/images/parceiros/logo_nobile.jpg' },
    { id: 6, name: 'Parceiro 6', logo: '/images/parceiros/LOGO - DB&Y - D4U.png' },
];

export const PartnersSection = () => {
    return (
        <section className="partners-section">
            <div className="container">
                <h2>Nossos Parceiros</h2>
                <Swiper
                    modules={[Autoplay]}
                    spaceBetween={30}
                    slidesPerView={4}
                    loop={true}
                    autoplay={{
                        delay: 2500,
                        disableOnInteraction: false,
                    }}
                    breakpoints={{
                        320: {
                            slidesPerView: 2,
                            spaceBetween: 20
                        },
                        768: {
                            slidesPerView: 3,
                            spaceBetween: 30
                        },
                        1024: {
                            slidesPerView: 4,
                            spaceBetween: 30
                        }
                    }}
                >
                    {partners.map((partner) => (
                        <SwiperSlide key={partner.id}>
                            <div className="partner-logo">
                                <img 
                                    src={partner.logo} 
                                    alt={partner.name}
                                    loading="lazy"
                                />
                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>
            </div>
        </section>
    );
};
