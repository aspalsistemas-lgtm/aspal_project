/**
 * `PUT /personas/:personaId/roles` y `PUT /personas/:personaId/estado`
 * (`docs/api/plataforma.md`). Solo el administrador; la regla vive en `permisos.ts` y la
 * lógica en `gestion-personas.ts`.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Dependencias } from "../app.js";
import { rutaAutenticada } from "./con-sesion.js";
import { prohibido } from "./errores.js";
import { cambiarEstado, cambiarRoles } from "./gestion-personas.js";
import { puede } from "./permisos.js";
import { ROLES } from "./rol.js";

const PARAMETROS = z.object({ personaId: z.uuid() });
const CUERPO_ROLES = z.object({
  roles: z
    .array(z.enum(ROLES))
    .min(1)
    .max(ROLES.length)
    .refine((roles) => new Set(roles).size === roles.length, "Hay roles repetidos"),
});
const CUERPO_ESTADO = z.object({ estado: z.enum(["activa", "suspendida", "baja"]) });

const ERROR = z.object({
  success: z.literal(false),
  error: z.object({
    codigo: z.string(),
    mensaje: z.string(),
    campo: z.string().optional(),
  }),
});
const RESPUESTA_ROLES = z.object({
  success: z.literal(true),
  data: z.object({ roles: z.array(z.string()) }),
});
const RESPUESTA_ESTADO = z.object({
  success: z.literal(true),
  data: z.object({ estado: z.string() }),
});

export function registrarGestionDePersonas(
  app: FastifyInstance,
  dependencias: Dependencias,
): void {
  rutaAutenticada(
    app,
    dependencias,
    {
      metodo: "PUT",
      url: "/personas/:personaId/roles",
      schema: {
        params: PARAMETROS,
        body: CUERPO_ROLES,
        response: { 200: RESPUESTA_ROLES, "4xx": ERROR },
      },
    },
    async (contexto, peticion) => {
      if (!puede(contexto.roles, "roles:asignar")) throw prohibido();
      const { personaId } = peticion.params as z.infer<typeof PARAMETROS>;
      const { roles } = peticion.body as z.infer<typeof CUERPO_ROLES>;
      const resultado = await cambiarRoles(
        contexto.base,
        { personaId: contexto.personaId },
        personaId,
        roles,
      );
      return { success: true as const, data: { roles: resultado } };
    },
  );

  rutaAutenticada(
    app,
    dependencias,
    {
      metodo: "PUT",
      url: "/personas/:personaId/estado",
      schema: {
        params: PARAMETROS,
        body: CUERPO_ESTADO,
        response: { 200: RESPUESTA_ESTADO, "4xx": ERROR },
      },
    },
    async (contexto, peticion) => {
      if (!puede(contexto.roles, "personas:cambiar_estado")) throw prohibido();
      const { personaId } = peticion.params as z.infer<typeof PARAMETROS>;
      const { estado } = peticion.body as z.infer<typeof CUERPO_ESTADO>;
      const resultado = await cambiarEstado(
        contexto.base,
        { personaId: contexto.personaId },
        personaId,
        estado,
      );
      return { success: true as const, data: { estado: resultado } };
    },
  );
}
