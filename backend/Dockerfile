FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
# Keep prisma CLI + tsx for migrate/seed (devDeps from npm ci).
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY entrypoint.sh /entrypoint.sh
# O disco do Render monta por cima de /var/data. O entrypoint recria as pastas
# em tempo de start, usando UPLOAD_DIR.
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh \
  && mkdir -p /var/data/uploads/player-photos /var/data/uploads/system \
  && apk add --no-cache curl
EXPOSE 4006
ENTRYPOINT ["/entrypoint.sh"]
