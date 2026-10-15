# Imagen de la plataforma. Se construye desde la raíz del monorepo (contexto
# «.»), porque el package-lock.json es único: docker compose build plataforma.

FROM node:22-alpine AS compilacion
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/sitio/package.json apps/sitio/
COPY apps/plataforma/package.json apps/plataforma/
RUN npm ci -w @aspal/plataforma --no-audit --no-fund
COPY apps/plataforma apps/plataforma
RUN npm run build -w @aspal/plataforma

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/sitio/package.json apps/sitio/
COPY apps/plataforma/package.json apps/plataforma/
RUN npm ci -w @aspal/plataforma --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=compilacion /app/apps/plataforma/dist apps/plataforma/dist
COPY apps/plataforma/migraciones apps/plataforma/migraciones
USER node
EXPOSE 3000
# Solo el servidor. Preparar la base y migrar lo hace el servicio «migrador» de
# compose.yaml con la misma imagen y otras credenciales: este proceso nunca tiene
# la URL de administrador (plan del corte 2, §3).
CMD ["node", "apps/plataforma/dist/servidor.js"]
