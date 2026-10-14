import type { FunctionComponent } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MotionConfig } from "framer-motion";
import { BotonVolverArriba } from "@/components/molecules/BotonVolverArriba";
import { SaltarAlContenido } from "@/components/infraestructura/SaltarAlContenido";
import { CabeceraRuta } from "@/components/infraestructura/CabeceraRuta";
import { RestaurarDesplazamiento } from "@/components/infraestructura/RestaurarDesplazamiento";
import { LimiteDeErrores } from "@/components/infraestructura/LimiteDeErrores";
import { Inicio } from "@/pages/inicio";
import { Plataforma } from "@/pages/plataforma";
import { Nosotros } from "@/pages/nosotros";
import { MapaDeRuta } from "@/pages/mapa-de-ruta";
import { QueHacemos } from "@/pages/que-hacemos";
import { NuestroEquipo } from "@/pages/nuestro-equipo";
import { Unete } from "@/pages/unete";
import { Eventos } from "@/pages/eventos";
import { Blog } from "@/pages/blog";
import { BlogPost } from "@/pages/blog-post";
import { Podcast } from "@/pages/podcast";
import { NotFound } from "@/pages/not-found";
import { Componentes } from "@/pages/componentes";
import {
  RUTAS_DINAMICAS,
  RUTAS_ESTATICAS,
  type RutaDinamica,
  type RutaEstatica,
} from "@/lib/rutas";

/**
 * Una página por cada ruta de `rutas.ts`. El tipo `Record` hace que añadir una
 * ruta sin su página (o una página sin su ruta) no compile.
 */
const PAGINAS: Record<RutaEstatica, FunctionComponent> = {
  "/": Inicio,
  "/blog": Blog,
  "/podcast": Podcast,
  "/plataforma": Plataforma,
  "/unete": Unete,
  "/nosotros": Nosotros,
  "/mapa-de-ruta": MapaDeRuta,
  "/que-hacemos": QueHacemos,
  "/nuestro-equipo": NuestroEquipo,
  "/eventos": Eventos,
  "/componentes": Componentes,
};

const PAGINAS_DINAMICAS: Record<RutaDinamica, FunctionComponent> = {
  "/blog/:slug": BlogPost,
};

function Router() {
  return (
    <Switch>
      {RUTAS_ESTATICAS.map((ruta) => (
        <Route key={ruta} path={ruta} component={PAGINAS[ruta]} />
      ))}
      {RUTAS_DINAMICAS.map((ruta) => (
        <Route key={ruta} path={ruta} component={PAGINAS_DINAMICAS[ruta]} />
      ))}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Respeta prefers-reduced-motion en todo framer-motion. El CSS de
          Tailwind necesita su propia media query en index.css: esto no lo
          cubre. Parte del público lo tiene activado por motivos médicos. */}
      <MotionConfig reducedMotion="user">
        <TooltipProvider>
          <SaltarAlContenido />
          <Toaster />
          <CabeceraRuta />
          <RestaurarDesplazamiento />
          <LimiteDeErrores>
            <Router />
          </LimiteDeErrores>
          <BotonVolverArriba />
        </TooltipProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}

export default App;
