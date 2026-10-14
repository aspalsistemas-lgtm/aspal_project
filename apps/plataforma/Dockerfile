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
# Migraciones primero: si fallan, el servidor no arranca con un esquema a medias.
CMD ["sh", "-c", "node apps/plataforma/dist/migrar.js && exec node apps/plataforma/dist/servidor.js"]
