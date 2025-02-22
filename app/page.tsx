import { HeroSection } from '@/components/sections/HeroSection/HeroSection';
import { ServicesSection } from '@/components/sections/ServicesSection/ServicesSection';
import { AboutSection } from '@/components/sections/AboutSection/AboutSection';
import { TestimonialsSection } from '@/components/sections/TestimonialsSection/TestimonialsSection';
import { GallerySection } from '@/components/sections/GallerySection/GallerySection';
import { ContactSection } from '@/components/sections/ContactSection/ContactSection';

export default function Home() {
  return (
    <main>
      <HeroSection />
      <ServicesSection />
      <AboutSection />
      <TestimonialsSection />
      <GallerySection />
      <ContactSection />
    </main>
  );
}