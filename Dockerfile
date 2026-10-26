# Web app and collector share one image; docker-compose picks the command.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN useradd --system --uid 1001 app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY package.json next.config.mjs tsconfig.json ./
COPY src ./src
COPY collector ./collector
COPY scripts ./scripts
COPY db ./db
USER app
EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
