import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, X, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { URL_REGISTRO } from "@/lib/navegacion";
import heroDashboard from "@assets/generated_images/hero_dashboard_with_yellow_background.webp";

function VideoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop with 50% opacity */}
          <motion.div
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            data-testid="modal-backdrop"
          />

          {/* Modal wrapper with close button above */}
          <motion.div
            className="relative z-10 w-full max-w-4xl"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
          >
            {/* Close button - positioned above and to the right of video */}
            <div className="flex justify-end mb-3">
              <Button
                size="icon"
                variant="ghost"
                className="bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur-sm"
                onClick={onClose}
                data-testid="button-close-modal"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Video container with 16:9 aspect ratio */}
            <div
              className="relative w-full rounded-2xl overflow-hidden shadow-2xl bg-black"
              style={{ paddingBottom: "56.25%" }}
            >
              <iframe
                className="absolute inset-0 w-full h-full"
                src="https://www.youtube.com/embed/kl4Zd89F8jk?autoplay=1&rel=0"
                title="Video de presentación"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                data-testid="iframe-video"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function HeroSection() {
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  return (
    <section className="relative min-h-[80vh] flex items-center overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10">
      {/* Animated mesh gradient background */}
      <div className="absolute inset-0 opacity-30">
        <div
          className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary/30 animate-pulse"
          style={{ animationDuration: "8s" }}
        ></div>
      </div>

      <div className="container mx-auto px-4 md:px-8 relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left side - Content */}
          <div className="space-y-8">
            {/* Title - enters from right */}
            <motion.h1
              className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight"
              initial={{ x: 60 }}
              animate={{ x: 0 }}
              transition={{ duration: 0.8, ease: [0.25, 0.4, 0.25, 1] }}
            >
              Crea y Gestiona{" "}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                tu Comunidad
              </span>{" "}
              en Línea
            </motion.h1>

            {/* Buttons - staggered entrance */}
            <motion.div
              className="flex flex-wrap gap-4"
              initial={{ y: 30 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.4, delay: 0.5 }}
              >
                <Button
                  size="lg"
                  className="text-base px-8 py-6 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  asChild
                  data-testid="button-cta-primary"
                >
                  <a href={URL_REGISTRO} target="_blank" rel="noopener noreferrer">
                    Comenzar ahora
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </a>
                </Button>
              </motion.div>
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.4, delay: 0.65 }}
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base px-8 py-6 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  onClick={() => setIsVideoOpen(true)}
                  data-testid="button-cta-secondary"
                >
                  <Play className="mr-2 w-5 h-5" />
                  Ver Video
                </Button>
              </motion.div>
            </motion.div>

            {/* Aquí había dos contadores —"500+ asociaciones activas" y
                            "50,000+ miembros"— que no correspondían a ninguna cifra real.
                            Se retiraron en la Etapa 1; las cifras verificables van en la
                            home institucional. */}
          </div>

          {/* Right side - Illustration - enters from below */}
          <motion.div
            className="relative"
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
          >
            <motion.div
              className="relative rounded-2xl overflow-hidden shadow-2xl"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.4 }}
            >
              <img
                src={heroDashboard}
                alt="Dashboard de plataforma"
                width={1400}
                height={764}
                // React 18 no conoce `fetchPriority`: el atributo va en minúsculas.
                {...{ fetchpriority: "high" }}
                decoding="async"
                className="w-full h-auto"
                data-testid="img-hero-dashboard"
              />
            </motion.div>

            {/* Floating elements */}
            <motion.div
              className="absolute -top-4 -right-4 w-24 h-24 bg-primary/20 rounded-full blur-3xl"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute -bottom-8 -left-8 w-32 h-32 bg-primary/10 rounded-full blur-3xl"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
            />
          </motion.div>
        </div>
      </div>

      {/* Video Modal */}
      <VideoModal isOpen={isVideoOpen} onClose={() => setIsVideoOpen(false)} />
    </section>
  );
}
