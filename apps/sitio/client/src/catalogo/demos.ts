import { DEMOS_PROPIOS } from "./demos-propios";
import { DEMOS_UI } from "./demos-ui";
import type { Demo } from "./tipos";

/** Demo de un componente por id. Incluye las propias y las de shadcn/ui. */
const DEMOS: Partial<Record<string, Demo>> = { ...DEMOS_PROPIOS, ...DEMOS_UI };

export function demoDe(id: string): Demo | undefined {
  return DEMOS[id];
}
