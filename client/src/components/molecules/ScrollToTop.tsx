import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Detecta la preferencia de movimiento reducido. `window.scrollTo({behavior:
 *  "smooth"})` es animación en JS: ni MotionConfig ni la media query de CSS la
 *  cubren, hay que consultarla a mano. */
function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let frame = 0;

    // Con rAF y passive: antes hacía setState en cada evento de scroll sin
    // throttle ni passive, y producía jank en gama media.
    const toggleVisibility = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setIsVisible(window.scrollY > 300);
      });
    };

    window.addEventListener("scroll", toggleVisibility, { passive: true });
    toggleVisibility();

    return () => {
      window.removeEventListener("scroll", toggleVisibility);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  if (!isVisible) return null;

  return (
    // Visible también en móvil: el plan alarga las páginas y era justo donde
    // más falta hace. Antes estaba oculto con `hidden lg:block`.
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999]">
      <Button
        onClick={scrollToTop}
        size="icon"
        className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-white transition-all duration-300"
        aria-label="Volver arriba"
        data-testid="button-scroll-to-top"
      >
        <ArrowUp className="w-5 h-5" aria-hidden="true" />
      </Button>
    </div>
  );
}
