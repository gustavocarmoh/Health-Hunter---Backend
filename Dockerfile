# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Builder
# Instala todas as dependências (incluindo devDeps) e compila o TypeScript
# ─────────────────────────────────────────────────────────────────────────────
FROM node:25-alpine AS builder

WORKDIR /app

# Copia apenas os manifests primeiro para aproveitar o cache de camadas do Docker.
# A camada de npm ci só é refeita quando package*.json muda.
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copia o restante do código-fonte
COPY . .

# Compila TypeScript → JavaScript em /app/dist
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Production
# Imagem final mínima: apenas as dependências de produção e o código compilado
# ─────────────────────────────────────────────────────────────────────────────
FROM node:25-alpine AS production

# Instala wget para o HEALTHCHECK (wget é menor que curl no Alpine)
RUN apk add --no-cache wget

WORKDIR /app

# Cria usuário sem privilégios para rodar a aplicação (segurança)
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

# Instala somente dependências de produção
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copia o código compilado do estágio builder
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Troca para o usuário não-root
USER nestjs

# Porta exposta pelo NestJS
EXPOSE 3000

# Healthcheck: verifica /health a cada 30s com 3 tentativas
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Inicia a aplicação compilada diretamente com Node (sem ts-node)
CMD ["node", "dist/main"]
