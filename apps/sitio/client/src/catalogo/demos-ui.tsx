import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { Info } from "lucide-react";
import type { IdDemoUi } from "./registro";
import type { Demo } from "./tipos";

type VarianteBoton = "default" | "secondary" | "outline" | "ghost" | "destructive";
type TamanoBoton = "default" | "sm" | "lg" | "icon";

export const DEMOS_UI: Record<IdDemoUi, Demo> = {
  button: {
    controles: [
      {
        tipo: "opciones",
        clave: "variant",
        etiqueta: "variant",
        opciones: ["secondary", "outline", "default", "ghost", "destructive"],
        inicial: "secondary",
      },
      {
        tipo: "opciones",
        clave: "size",
        etiqueta: "size",
        opciones: ["default", "sm", "lg"],
        inicial: "default",
      },
      {
        tipo: "texto",
        clave: "texto",
        etiqueta: "texto",
        inicial: "Únete a la comunidad",
      },
      { tipo: "interruptor", clave: "disabled", etiqueta: "disabled", inicial: false },
    ],
    nota: "En el sitio, todo botón lleva min-h-11 (objetivo táctil de 44 px).",
    render: (v) => (
      <Button
        variant={String(v.variant) as VarianteBoton}
        size={String(v.size) as TamanoBoton}
        disabled={Boolean(v.disabled)}
        className="px-6"
      >
        {String(v.texto)}
      </Button>
    ),
    codigo: (v) =>
      `<Button variant="${String(v.variant)}"${v.size !== "default" ? ` size="${String(v.size)}"` : ""}${v.disabled ? " disabled" : ""} className="px-6">\n  ${String(v.texto)}\n</Button>`,
  },
  card: {
    fondo: "suave",
    render: () => (
      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle>Título de la tarjeta</CardTitle>
          <CardDescription>Descripción breve.</CardDescription>
        </CardHeader>
        <CardContent>Contenido.</CardContent>
      </Card>
    ),
    codigo: () =>
      `<Card>\n  <CardHeader>\n    <CardTitle>…</CardTitle>\n    <CardDescription>…</CardDescription>\n  </CardHeader>\n  <CardContent>…</CardContent>\n</Card>`,
  },
  input: {
    controles: [
      {
        tipo: "texto",
        clave: "placeholder",
        etiqueta: "placeholder",
        inicial: "tu@correo.org",
      },
      { tipo: "interruptor", clave: "disabled", etiqueta: "disabled", inicial: false },
    ],
    render: (v) => (
      <div className="max-w-sm space-y-1">
        <label htmlFor="demo-input" className="text-sm font-semibold">
          Correo electrónico
        </label>
        <Input
          id="demo-input"
          type="email"
          placeholder={String(v.placeholder)}
          disabled={Boolean(v.disabled)}
          className="min-h-11"
        />
      </div>
    ),
    codigo: (v) =>
      `<label htmlFor="correo">Correo electrónico</label>\n<Input id="correo" type="email" placeholder="${String(v.placeholder)}"${v.disabled ? " disabled" : ""} />`,
  },
  collapsible: {
    render: () => (
      <Collapsible className="max-w-md rounded-xl border border-border">
        <CollapsibleTrigger className="flex min-h-11 w-full items-center justify-between px-4 font-medium">
          Recursos
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4 text-muted-foreground">
          Blog · Podcast · Mapa de Ruta
        </CollapsibleContent>
      </Collapsible>
    ),
    codigo: () =>
      `<Collapsible>\n  <CollapsibleTrigger>Recursos</CollapsibleTrigger>\n  <CollapsibleContent>…</CollapsibleContent>\n</Collapsible>`,
  },
  tooltip: {
    render: () => (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Más información">
            <Info aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Ayuda breve; nunca información imprescindible.</TooltipContent>
      </Tooltip>
    ),
    codigo: () =>
      `<Tooltip>\n  <TooltipTrigger asChild>\n    <Button variant="outline" size="icon" aria-label="Más información"><Info aria-hidden="true" /></Button>\n  </TooltipTrigger>\n  <TooltipContent>…</TooltipContent>\n</Tooltip>`,
  },
  toast: {
    controles: [
      { tipo: "texto", clave: "titulo", etiqueta: "title", inicial: "Enlace copiado" },
    ],
    render: (v) => (
      <Button
        variant="outline"
        className="min-h-11"
        onClick={() =>
          toast({
            title: String(v.titulo),
            description: "Aviso de ejemplo del catálogo.",
          })
        }
      >
        Lanzar toast
      </Button>
    ),
    codigo: (v) =>
      `import { toast } from "@/hooks/use-toast";\n\ntoast({ title: "${String(v.titulo)}", description: "…" });`,
  },
};
