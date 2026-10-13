import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import logo1 from "@assets/Recurso 50comunidad ASPAL_1763678044080.png";
import logo2 from "@assets/Recurso 52comunidad ASPAL_1763678051896.png";
import logo3 from "@assets/Recurso 53comunidad ASPAL_1763678055285.png";

const LOGOS = [
  { src: logo1, alt: "ANPR México" },
  { src: logo2, alt: "Expo Mascotas" },
  { src: logo3, alt: "World Urban Parks" },
];

export default function LogoCarousel() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const duplicatedLogos = [...LOGOS, ...LOGOS, ...LOGOS];

  return (
    <section
      className="py-16 bg-gradient-to-b from-background to-muted/20 overflow-hidden"
      data-testid="section-logo-carousel"
    >
      <div className="container mx-auto px-4 md:px-8 mb-12">
        <motion.h2
          className="text-3xl md:text-4xl font-bold text-center"
          data-testid="text-clients-title"
          initial={{ y: 30 }}
          whileInView={{ y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
        >
          Casos de éxito o clientes
        </motion.h2>
      </div>

      <div className="relative">
        {/* First row - scrolling right */}
        <div
          className="flex gap-12 mb-8 animate-scroll-right"
          data-testid="carousel-row-1"
        >
          {duplicatedLogos.map((logo, index) => (
            <div
              key={`row1-${index}`}
              className="flex-shrink-0 w-48 h-28 flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-300 opacity-70 hover:opacity-100"
              data-testid={`logo-${index}`}
            >
              <img
                src={logo.src}
                alt={logo.alt}
                className="max-w-full max-h-full object-contain filter brightness-0"
              />
            </div>
          ))}
        </div>

        {/* Second row - scrolling left */}
        <div className="flex gap-12 animate-scroll-left" data-testid="carousel-row-2">
          {duplicatedLogos.map((logo, index) => (
            <div
              key={`row2-${index}`}
              className="flex-shrink-0 w-48 h-28 flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-300 opacity-70 hover:opacity-100"
              data-testid={`logo-alt-${index}`}
            >
              <img
                src={logo.src}
                alt={logo.alt}
                className="max-w-full max-h-full object-contain filter brightness-0"
              />
            </div>
          ))}
        </div>

        {/* Gradient overlays */}
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent pointer-events-none"></div>
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent pointer-events-none"></div>
      </div>

      <style>{`
        @keyframes scroll-right {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }
        
        @keyframes scroll-left {
          0% {
            transform: translateX(-33.333%);
          }
          100% {
            transform: translateX(0);
          }
        }
        
        .animate-scroll-right {
          animation: scroll-right 30s linear infinite;
        }
        
        .animate-scroll-left {
          animation: scroll-left 30s linear infinite;
        }
      `}</style>
    </section>
  );
}
