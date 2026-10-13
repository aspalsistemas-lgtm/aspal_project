import type { Config } from "tailwindcss";

export default {
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: ".5625rem" /* 9px */,
        md: ".375rem" /* 6px */,
        sm: ".1875rem" /* 3px */,
      },
      colors: {
        // Flat / base colors (regular buttons)
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
          border: "hsl(var(--card-border) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
          border: "hsl(var(--popover-border) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
          border: "var(--primary-border)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
          border: "var(--secondary-border)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
          border: "var(--muted-border)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
          border: "var(--accent-border)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
          border: "var(--destructive-border)",
        },
        ring: "hsl(var(--ring) / <alpha-value>)",
        noche: {
          DEFAULT: "hsl(var(--brand-noche) / <alpha-value>)",
          foreground: "hsl(var(--brand-noche-foreground) / <alpha-value>)",
        },
        "miel-texto": "hsl(var(--miel-texto) / <alpha-value>)",
        "fondo-suave": "hsl(var(--fondo-suave) / <alpha-value>)",
        status: {
          online: "rgb(34 197 94)",
          away: "rgb(245 158 11)",
          busy: "rgb(239 68 68)",
          offline: "rgb(156 163 175)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // Entradas de la home: solo transform (nunca opacidad) y fill «both»,
        // así el retardo de cada pieza la mantiene en su estado inicial.
        // Todas se apagan con «reducir movimiento» (index.css).
        ensamble: {
          from: { transform: "translate(var(--dx, 0), var(--dy, 0)) scale(.94)" },
          to: { transform: "none" },
        },
        "celda-miel": {
          "0%": { transform: "scale(.6) rotate(-8deg)" },
          "70%": { transform: "scale(1.04)" },
          "100%": { transform: "none" },
        },
        raya: {
          from: { strokeDashoffset: "80" },
          to: { strokeDashoffset: "0" },
        },
        trazo: {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" },
        },
        "trazo-y": {
          from: { transform: "scaleY(0)" },
          to: { transform: "scaleY(1)" },
        },
        asoma: {
          "0%": { transform: "translateY(1.5rem) scale(.9)" },
          "65%": { transform: "translateY(-.375rem) scale(1.03)" },
          "100%": { transform: "none" },
        },
        insignia: {
          "0%": { transform: "scale(.7)" },
          "60%": { transform: "scale(1.08)" },
          "100%": { transform: "none" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        ensamble: "ensamble 650ms cubic-bezier(.2,.8,.2,1) both",
        "celda-miel": "celda-miel 700ms 350ms cubic-bezier(.2,.9,.3,1.2) both",
        raya: "raya 400ms ease-out both",
        trazo: "trazo 1400ms cubic-bezier(.4,0,.2,1) both",
        "trazo-y": "trazo-y 1200ms cubic-bezier(.4,0,.2,1) both",
        asoma: "asoma 700ms cubic-bezier(.2,.9,.3,1.2) both",
        insignia: "insignia 500ms cubic-bezier(.2,.9,.3,1.3) both",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
