import logo from "@assets/aspal-logo-fondo-claro.webp";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  NAVEGACION,
  destinosDe,
  esDesplegable,
  URL_LOGIN,
  esEntradaActiva,
  esRutaActiva,
  registrarClicDestino,
  type DestinoNav,
  type EntradaNav,
  type GrupoNav,
} from "@/lib/navegacion";
import { AvisoPestanaNueva } from "@/components/atoms/AvisoPestanaNueva";
import { Proximamente } from "@/components/atoms/Proximamente";
import { registrarEvento } from "@/lib/analitica";
import { indiceSiguiente } from "@/lib/teclado";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, ChevronDown, Menu, UserPlus, X } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as EventoTecladoReact,
} from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "wouter";

/** Un destino dentro de un desplegable de escritorio. */
function DestinoEscritorio({ destino, ruta }: { destino: DestinoNav; ruta: string }) {
  const activo = esRutaActiva(destino.href, ruta);

  const Icono = destino.icono;

  const contenido = (
    <div className="flex gap-3">
      {/* Decorativo: siempre acompaña a la etiqueta, nunca la sustituye.
          Sin recuadro de fondo: el amarillo es del CTA y de la marca de ruta
          activa, y repetirlo en cada fila del menú le quitaba significado. */}
      <Icono
        className={cn(
          "mt-0.5 h-5 w-5 shrink-0",
          destino.href ? "text-foreground" : "text-muted-foreground",
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span
            className={cn(
              "text-sm leading-none",
              destino.href
                ? "font-medium text-foreground"
                : "font-medium text-muted-foreground",
            )}
          >
            {destino.etiqueta}
          </span>
          {destino.externo && (
            <>
              <ArrowUpRight
                className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <AvisoPestanaNueva />
            </>
          )}
          {!destino.href && <Proximamente className="ml-auto" />}
        </div>
        <p className="mt-1 text-xs leading-snug text-muted-foreground">
          {destino.descripcion}
        </p>
      </div>
    </div>
  );

  // Sin `href` la sección no existe: se anuncia, pero no se finge navegable.
  if (!destino.href) {
    return (
      <li>
        <div
          className="cursor-default rounded-md p-3 opacity-70"
          aria-disabled="true"
          data-testid={destino.testid}
        >
          {contenido}
        </div>
      </li>
    );
  }

  // Hover y activo dicen cosas distintas —"apuntas a esto" y "aquí estás"—, así
  // que no pueden compartir tratamiento. El hover usa `hover-elevate`, el
  // sistema neutro de la casa. El activo lleva la barra amarilla, el mismo
  // idioma que el subrayado de la barra superior. El `--accent` que había antes
  // tiene exactamente la luminosidad del panel (94%): teñía sin resaltar.
  const clases = cn(
    "hover-elevate block rounded-md p-3 no-underline outline-none transition-colors",
    "focus-visible:ring-1 focus-visible:ring-ring",
    activo && "bg-foreground/5 shadow-[inset_3px_0_0_0_hsl(var(--secondary))]",
  );

  return (
    <li>
      {destino.externo ? (
        <a
          href={destino.href}
          target="_blank"
          rel="noopener noreferrer"
          className={clases}
          onClick={() => registrarClicDestino(destino, "menu")}
          data-testid={destino.testid}
        >
          {contenido}
        </a>
      ) : (
        <Link
          href={destino.href}
          className={clases}
          onClick={() => registrarClicDestino(destino, "menu")}
          aria-current={activo ? "page" : undefined}
          data-testid={destino.testid}
        >
          {contenido}
        </Link>
      )}
    </li>
  );
}

/** Flechas, Inicio y Fin recorren los enlaces del desplegable abierto (RF-02). */
function alPulsarEnDesplegable(evento: EventoTecladoReact<HTMLElement>) {
  const enlaces = Array.from(
    evento.currentTarget.querySelectorAll<HTMLElement>("a[href]"),
  );
  const actual = enlaces.indexOf(document.activeElement as HTMLElement);
  const siguiente = indiceSiguiente(actual, enlaces.length, evento.key);
  if (siguiente === null) return;
  evento.preventDefault();
  enlaces[siguiente].focus();
}

/** Una columna del mega-menú: título del grupo y sus destinos. */
function GrupoEscritorio({ grupo, ruta }: { grupo: GrupoNav; ruta: string }) {
  const idTitulo = `titulo-${grupo.testid}`;
  return (
    <div data-testid={grupo.testid}>
      {/* Párrafo y no encabezado: un h3 dentro de la cabecera saltaría niveles
          antes del h1 de la página (RF-14). */}
      <p
        id={idTitulo}
        className="px-3 pb-1 pt-2 text-[13px] font-semibold uppercase tracking-wider text-miel-texto"
      >
        {grupo.titulo}
      </p>
      <ul className="grid gap-1" aria-labelledby={idTitulo}>
        {grupo.destinos.map((destino) => (
          <DestinoEscritorio key={destino.testid} destino={destino} ruta={ruta} />
        ))}
      </ul>
    </div>
  );
}

/** Una entrada de primer nivel del menú de escritorio. */
function EntradaEscritorio({ entrada, ruta }: { entrada: EntradaNav; ruta: string }) {
  const activa = esEntradaActiva(entrada, ruta);

  // El subrayado acompaña al cambio de peso tipográfico: el color nunca es el
  // único canal que indica dónde estás.
  const subrayado = (
    <span
      className={cn(
        "absolute inset-x-3 -bottom-2 h-0.5 rounded-full bg-secondary transition-opacity",
        activa ? "opacity-100" : "opacity-0",
      )}
      aria-hidden="true"
    />
  );

  if (!esDesplegable(entrada)) {
    // Rubro con página propia (Eventos, cuando exista /eventos).
    if (entrada.href) {
      return (
        <NavigationMenuItem>
          <Link
            href={entrada.href}
            className={cn(
              navigationMenuTriggerStyle(),
              "relative bg-transparent",
              activa && "font-semibold text-foreground",
            )}
            aria-current={activa ? "page" : undefined}
            data-testid={entrada.testid}
          >
            {entrada.etiqueta}
            {subrayado}
          </Link>
        </NavigationMenuItem>
      );
    }

    return (
      <NavigationMenuItem>
        <div
          className={cn(
            navigationMenuTriggerStyle(),
            "relative cursor-default gap-2 bg-transparent text-muted-foreground hover:bg-transparent",
          )}
          aria-disabled="true"
          data-testid={entrada.testid}
        >
          {entrada.etiqueta}
          <Proximamente />
          {subrayado}
        </div>
      </NavigationMenuItem>
    );
  }

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger
        className={cn(
          "relative bg-transparent",
          activa && "font-semibold text-foreground",
        )}
        data-testid={entrada.testid}
      >
        {entrada.etiqueta}
        {subrayado}
      </NavigationMenuTrigger>
      <NavigationMenuContent onKeyDown={alPulsarEnDesplegable}>
        {entrada.grupos ? (
          // Cuatro columnas en 60rem, sin pasar del ancho de la ventana menos
          // el margen: a 1280 px ocupa 960 px, centrado bajo el menú.
          <div className="grid w-[min(calc(100vw-4rem),60rem)] grid-cols-4 gap-2 p-3">
            {entrada.grupos.map((grupo) => (
              <GrupoEscritorio key={grupo.testid} grupo={grupo} ruta={ruta} />
            ))}
          </div>
        ) : (
          // 380px: cabe la etiqueta más larga junto a su marca de Próximamente.
          <ul className="grid w-[380px] gap-1 p-2">
            {destinosDe(entrada).map((destino) => (
              <DestinoEscritorio key={destino.testid} destino={destino} ruta={ruta} />
            ))}
          </ul>
        )}
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}

/** Un destino dentro del panel móvil. */
function DestinoMovil({ destino, ruta }: { destino: DestinoNav; ruta: string }) {
  const activo = esRutaActiva(destino.href, ruta);
  const Icono = destino.icono;
  const clases =
    "hover-elevate flex min-h-11 items-center gap-3 rounded-md px-3 text-base text-muted-foreground hover:text-foreground";
  const icono = <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />;

  if (!destino.href) {
    return (
      <div
        className={cn(clases, "opacity-70")}
        aria-disabled="true"
        data-testid={`mobile-${destino.testid}`}
      >
        {icono}
        {destino.etiqueta}
        <Proximamente className="ml-auto" />
      </div>
    );
  }

  if (destino.externo) {
    return (
      <a
        href={destino.href}
        target="_blank"
        rel="noopener noreferrer"
        className={clases}
        onClick={() => registrarClicDestino(destino, "menu_movil")}
        data-testid={`mobile-${destino.testid}`}
      >
        {icono}
        {destino.etiqueta}
        <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        <AvisoPestanaNueva />
      </a>
    );
  }

  return (
    <Link
      href={destino.href}
      className={cn(
        clases,
        activo &&
          "bg-foreground/5 font-semibold text-foreground shadow-[inset_3px_0_0_0_hsl(var(--secondary))]",
      )}
      onClick={() => registrarClicDestino(destino, "menu_movil")}
      aria-current={activo ? "page" : undefined}
      data-testid={`mobile-${destino.testid}`}
    >
      {icono}
      {destino.etiqueta}
    </Link>
  );
}

/**
 * Panel móvil a pantalla completa.
 *
 * Va en un portal porque el `backdrop-filter` de la cabecera crea un bloque
 * contenedor: un `fixed` descendiente se posicionaría contra la cabecera, no
 * contra la ventana.
 */
function PanelMovil({
  abierto,
  onCerrar,
  ruta,
}: {
  abierto: boolean;
  onCerrar: () => void;
  ruta: string;
}) {
  const [montado, setMontado] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const idTitulo = useId();

  useEffect(() => setMontado(true), []);

  // Bloquea el scroll del cuerpo mientras el panel cubre la pantalla.
  useEffect(() => {
    if (!abierto) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previo;
    };
  }, [abierto]);

  // Escape cierra, y el foco queda atrapado dentro del panel.
  useEffect(() => {
    if (!abierto) return;
    const enfocadoAntes = document.activeElement as HTMLElement | null;
    // Al abrir, el foco entra al panel. Si se quedara en el botón que lo
    // abrió, Tab recorrería la página de detrás: la trampa solo actúa en los
    // bordes del panel.
    cerrarRef.current?.focus();

    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        onCerrar();
        return;
      }
      if (evento.key !== "Tab" || !panelRef.current) return;

      const enfocables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (enfocables.length === 0) return;

      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener("keydown", alPulsar);
    return () => {
      document.removeEventListener("keydown", alPulsar);
      enfocadoAntes?.focus();
    };
  }, [abierto, onCerrar]);

  if (!montado) return null;

  return createPortal(
    <AnimatePresence>
      {abierto && (
        <motion.div
          ref={panelRef}
          id="menu-movil"
          // Es un modal (tapa la pantalla, atrapa el foco, Escape cierra):
          // así lo anuncia el lector de pantalla y deja de leer lo de detrás.
          role="dialog"
          aria-modal="true"
          aria-labelledby={idTitulo}
          className="fixed inset-0 z-[100] flex flex-col bg-background xl:hidden"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
            <h2 id={idTitulo} className="text-sm font-semibold text-foreground">
              Menú
            </h2>
            <Button
              ref={cerrarRef}
              variant="ghost"
              size="icon"
              onClick={onCerrar}
              aria-label="Cerrar menú"
              data-testid="button-mobile-close"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-4" aria-label="Principal">
            {NAVEGACION.map((entrada) =>
              esDesplegable(entrada) ? (
                <GrupoMovil key={entrada.testid} entrada={entrada} ruta={ruta} />
              ) : entrada.href ? (
                <Link
                  key={entrada.testid}
                  href={entrada.href}
                  className="flex min-h-11 items-center gap-3 py-2 text-base font-medium text-foreground"
                  aria-current={esEntradaActiva(entrada, ruta) ? "page" : undefined}
                  data-testid={`mobile-${entrada.testid}`}
                >
                  <entrada.icono className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {entrada.etiqueta}
                </Link>
              ) : (
                <div
                  key={entrada.testid}
                  className="flex min-h-11 items-center gap-3 py-2 text-base font-medium text-muted-foreground opacity-70"
                  aria-disabled="true"
                  data-testid={`mobile-${entrada.testid}`}
                >
                  <entrada.icono className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {entrada.etiqueta}
                  <Proximamente className="ml-auto" />
                </div>
              ),
            )}
          </nav>

          {/* Únete queda fijo abajo, al alcance del pulgar. */}
          <div className="shrink-0 space-y-2 border-t border-border p-4">
            <Button variant="ghost" className="min-h-11 w-full" asChild>
              <a href={URL_LOGIN} data-testid="button-mobile-login">
                Iniciar sesión
              </a>
            </Button>
            <Button
              variant="secondary"
              className="min-h-11 w-full"
              asChild
              data-testid="button-mobile-registro"
            >
              <Link
                href="/unete"
                onClick={() => registrarEvento("click_unete", { origen: "menu_movil" })}
              >
                <UserPlus className="h-4 w-4" />
                Únete
              </Link>
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function GrupoMovil({ entrada, ruta }: { entrada: EntradaNav; ruta: string }) {
  const [abierto, setAbierto] = useState(() => esEntradaActiva(entrada, ruta));

  return (
    <Collapsible open={abierto} onOpenChange={setAbierto}>
      <CollapsibleTrigger
        className="flex min-h-11 w-full items-center gap-3 py-2 text-base font-medium text-foreground"
        data-testid={`mobile-${entrada.testid}`}
      >
        <entrada.icono className="h-4 w-4 shrink-0" aria-hidden="true" />
        {entrada.etiqueta}
        <ChevronDown
          className={cn("ml-auto h-4 w-4 transition-transform", abierto && "rotate-180")}
          aria-hidden="true"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 pb-2 pl-1">
        {entrada.grupos
          ? entrada.grupos.map((grupo) => (
              <div
                key={grupo.testid}
                className="pt-2"
                data-testid={`mobile-${grupo.testid}`}
              >
                <p
                  id={`mobile-titulo-${grupo.testid}`}
                  className="px-3 pb-1 text-[13px] font-semibold uppercase tracking-wider text-miel-texto"
                >
                  {grupo.titulo}
                </p>
                <div role="list" aria-labelledby={`mobile-titulo-${grupo.testid}`}>
                  {grupo.destinos.map((destino) => (
                    <div role="listitem" key={destino.testid}>
                      <DestinoMovil destino={destino} ruta={ruta} />
                    </div>
                  ))}
                </div>
              </div>
            ))
          : destinosDe(entrada).map((destino) => (
              <DestinoMovil key={destino.testid} destino={destino} ruta={ruta} />
            ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function CabeceraSitio() {
  const [ruta] = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [compacto, setCompacto] = useState(false);

  // El panel debe cerrarse al navegar. Antes se quedaba abierto encima de la
  // página nueva.
  useEffect(() => setMenuAbierto(false), [ruta]);

  useEffect(() => {
    const alScroll = () => setCompacto(window.scrollY > 32);
    alScroll();
    window.addEventListener("scroll", alScroll, { passive: true });
    return () => window.removeEventListener("scroll", alScroll);
  }, []);

  // Al cruzar a escritorio el panel debe cerrarse. Si no, `xl:hidden` le pone
  // `display: none` a mitad de la animación de salida, framer-motion nunca
  // recibe el fin de la animación y el nodo se queda montado: al girar la
  // tablet de vuelta a vertical reaparecería un panel invisible tapando la
  // página. Es el caso de una tablet rotando, no un caso de laboratorio.
  useEffect(() => {
    const escritorio = window.matchMedia("(min-width: 1280px)");
    const alCambiar = (evento: MediaQueryListEvent | MediaQueryList) => {
      if (evento.matches) setMenuAbierto(false);
    };
    alCambiar(escritorio);
    escritorio.addEventListener("change", alCambiar);
    return () => escritorio.removeEventListener("change", alCambiar);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 md:px-8">
        <div
          className={cn(
            "flex items-center justify-between transition-[height] duration-200",
            compacto ? "h-16" : "h-16 md:h-20",
          )}
        >
          {/* Logo */}
          <div className="flex flex-1 items-center">
            <Link href="/" className="flex shrink-0 items-center" data-testid="link-logo">
              {/* Una sola imagen: el sitio no tiene modo oscuro. */}
              <img
                src={logo}
                alt="Aspal — ir al inicio"
                width={420}
                height={120}
                className={cn(
                  "w-auto transition-[height] duration-200",
                  compacto ? "h-8" : "h-8 md:h-10",
                )}
                data-testid="img-logo-light"
              />
            </Link>
          </div>

          {/* Navegación de escritorio, ópticamente centrada entre los laterales.
              Desde `xl` (1280 px): con cinco rubros y la marca Próximamente, a 1024 no
              cabían.
              axe marca `aria-hidden-focus` con el mega-menú abierto: es el
              «focus proxy» interno de Radix (un span oculto con tabindex=0 que
              lleva el foco del botón al panel). Es de la librería, no de este
              código; se revisó en la pasada de axe de la Etapa 1. */}
          <NavigationMenu className="hidden xl:flex" aria-label="Principal">
            <NavigationMenuList>
              {NAVEGACION.map((entrada) => (
                <EntradaEscritorio key={entrada.testid} entrada={entrada} ruta={ruta} />
              ))}
            </NavigationMenuList>
          </NavigationMenu>

          {/* Acciones: un solo botón lleno en toda la cabecera */}
          <div className="hidden flex-1 items-center justify-end gap-2 xl:flex">
            <Button variant="ghost" asChild data-testid="button-login">
              <a href={URL_LOGIN}>Iniciar sesión</a>
            </Button>
            <Button variant="secondary" asChild data-testid="button-registro">
              <Link
                href="/unete"
                onClick={() => registrarEvento("click_unete", { origen: "header" })}
              >
                <UserPlus className="h-4 w-4" />
                Únete
              </Link>
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="xl:hidden"
            onClick={() => setMenuAbierto(true)}
            aria-expanded={menuAbierto}
            aria-controls="menu-movil"
            aria-label="Abrir menú"
            data-testid="button-mobile-menu"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </div>

      <PanelMovil
        abierto={menuAbierto}
        onCerrar={() => setMenuAbierto(false)}
        ruta={ruta}
      />
    </header>
  );
}
