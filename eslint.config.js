import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";
import globals from "globals";

/**
 * El objetivo aquí son los errores reales, no el estilo: del formato se ocupa
 * Prettier, y `eslint-config-prettier` desactiva todo lo que se solape.
 *
 * `apps/sitio/client/src/components/ui/` queda fuera: son archivos generados por el CLI de
 * shadcn y se regeneran, así que corregirlos a mano es trabajo que se pierde.
 */
export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "apps/sitio/client/src/components/ui/**",
      "apps/sitio/client/src/assets/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // Las variables que empiezan por _ son descartes intencionales
      // (parámetros de Express sin usar, capturas vacías).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      // El proxy de WordPress maneja respuestas sin tipar; `any` acotado es
      // razonable ahí. Que avise, pero que no bloquee.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  {
    files: ["apps/sitio/client/src/**/*.{ts,tsx}"],
    ...reactHooks.configs.flat.recommended,
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      // Error desde la deuda 3.5: lo que solo existe en el navegador se lee con
      // useEnCliente (useSyncExternalStore) y lo que deriva de un cambio se
      // ajusta durante el render. La única excepción, justificada en su línea,
      // es el referente de la página 404.
      "react-hooks/set-state-in-effect": "error",
    },
  },

  {
    files: [
      "api/**/*.ts",
      "apps/sitio/server/**/*.ts",
      "apps/sitio/api/**/*.ts",
      "apps/sitio/shared/**/*.ts",
      "apps/sitio/scripts/**/*.mjs",
      "apps/plataforma/**/*.ts",
    ],
    languageOptions: {
      globals: globals.node,
    },
  },

  {
    // Los plugins de Tailwind se cargan con require(): su config es CJS.
    files: ["apps/sitio/tailwind.config.ts", "apps/sitio/postcss.config.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  prettier,
);
