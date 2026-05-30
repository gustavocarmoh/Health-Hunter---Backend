# Health Hunter BFF

Backend for Frontend (BFF) para o **Health Hunter** — aplicativo de fitness gamificado onde usuários acumulam XP, evoluem de rank e competem em leaderboards.

---

## Stack

| Tecnologia | Versão | Papel |
|---|---|---|
| Node.js | 25.x | Runtime |
| NestJS | 10.x | Framework principal |
| TypeScript | 5.x | Linguagem (`strict: true`) |
| TypeORM | 0.3.20 | ORM |
| PostgreSQL | 16 | Banco de dados principal |
| Redis | 7 | Cache e rate limiting |
| ioredis | 5.3.2 | Cliente Redis |
| @nestjs/swagger | 7.3.1 | Documentação OpenAPI |
| AJV | 8.x | Validação de schema (middleware Express) |
| class-validator | — | Validação de DTO (NestJS pipe) |
| Passport JWT | — | Autenticação (access 15 min / refresh 7 dias) |
| @nestjs/throttler | — | Rate limiting global |
| Husky | 9.x | Git hooks |
| commitlint | 19.x | Conventional Commits |

---

## Pré-requisitos

- **Docker** e **Docker Compose** — para subir PostgreSQL e Redis localmente
- **Node.js 25** — para desenvolvimento local sem devcontainer
- **Git** — necessário para os hooks do Husky funcionarem

---

## Primeiros passos

### Opção A — DevContainer (recomendado)

Requer [VS Code](https://code.visualstudio.com/) + extensão [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers).

```bash
# Abrir no VS Code e executar:
# Ctrl+Shift+P → Dev Containers: Reopen in Container
```

O container já inclui Node.js 25, NestJS CLI, todas as extensões recomendadas e se conecta automaticamente ao PostgreSQL e Redis. O `npm install` é executado automaticamente na primeira abertura.

### Opção B — Local

```bash
# 1. Clonar e instalar dependências
git clone <repo-url>
cd health-hunter-bff
npm install          # também inicializa o Husky (git hooks)

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas configurações

# 3. Subir infraestrutura (PostgreSQL + Redis)
docker-compose up -d

# 4. Iniciar em modo desenvolvimento
npm run start:dev
```

---

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha os valores:

| Variável | Descrição | Padrão |
|---|---|---|
| `PORT` | Porta HTTP do servidor | `3000` |
| `NODE_ENV` | Ambiente (`development` / `production`) | `development` |
| `JWT_SECRET` | Segredo do access token (mín. 32 chars) | — |
| `JWT_REFRESH_SECRET` | Segredo do refresh token (mín. 32 chars) | — |
| `ALLOWED_ORIGINS` | CORS: origens permitidas (separadas por vírgula) | — |
| `DB_HOST` | Host do PostgreSQL | `localhost` |
| `DB_PORT` | Porta do PostgreSQL | `5432` |
| `DB_USERNAME` | Usuário do banco | `postgres` |
| `DB_PASSWORD` | Senha do banco | — |
| `DB_DATABASE` | Nome do banco | `health_hunter` |
| `DB_SSL` | SSL para o banco (`true` em produção) | `false` |
| `REDIS_HOST` | Host do Redis | `localhost` |
| `REDIS_PORT` | Porta do Redis | `6379` |
| `REDIS_PASSWORD` | Senha do Redis (vazio se não configurado) | — |

---

## Scripts disponíveis

```bash
npm run start:dev      # Dev com hot-reload
npm run start:debug    # Dev com debugger Node.js na porta 9229
npm run build          # Compila TypeScript → dist/
npm run start:prod     # Inicia a build de produção
npm run lint           # ESLint com auto-fix
npm run lint:check     # ESLint sem auto-fix (zero warnings — usado no CI)
npm run test           # Testes unitários
npm run test:watch     # Testes em modo watch
npm run test:cov       # Testes com relatório de cobertura
npm run format         # Prettier em src/ e test/
```

---

## Documentação da API

Após iniciar o servidor, acesse:

```
http://localhost:3000/api/docs
```

Swagger UI com autenticação Bearer integrada (`persistAuthorization: true`).

---

## Estrutura do projeto

```
health-hunter-bff/
├── .aws/
│   ├── ec2-infra.yml            # CloudFormation: EC2 t2.micro + RDS db.t3.micro (free tier)
│   ├── ecs-service.yml          # DEPRECATED — migrado para ec2-infra.yml
│   └── task-definition.json     # DEPRECATED — não usado com EC2
├── .devcontainer/
│   ├── Dockerfile               # node:25-alpine + NestJS CLI + ferramentas
│   ├── docker-compose.devcontainer.yml
│   └── devcontainer.json        # Extensões VS Code, settings, debug config
├── .github/
│   └── workflows/
│       ├── ci.yml               # Lint + testes + build validação (PRs)
│       └── deploy.yml           # Build ECR + deploy EC2 via SSM (main)
├── .husky/
│   ├── pre-commit               # lint-staged + jest
│   └── commit-msg               # commitlint (Conventional Commits)
├── src/
│   ├── main.ts                  # Bootstrap: Swagger, Helmet, CORS, pipes
│   ├── app.module.ts            # Root: TypeORM, Redis, Throttler, EventEmitter
│   ├── cache/
│   │   ├── redis.service.ts     # get/set/del/invalidatePattern (SCAN-based)
│   │   └── redis-cache.module.ts
│   ├── common/
│   │   ├── decorators/          # @CurrentUser(), @Roles(), @SensitiveFields()
│   │   ├── enums/               # Role, HunterRank, LifestyleType
│   │   ├── guards/              # JwtAuthGuard, RolesGuard
│   │   ├── interceptors/        # SensitiveDataMaskInterceptor (global)
│   │   ├── interfaces/          # IUser, IActivityLog, IEvent, IAuditLog, IChallenge
│   │   └── middleware/
│   │       └── ajv-body.middleware.ts  # Factory: createAjvMiddleware(schema)
│   ├── database/
│   │   └── entities/            # 6 entidades TypeORM
│   ├── repositories/
│   │   ├── abstract/            # 5 contratos abstratos
│   │   ├── typeorm/             # 5 implementações TypeORM
│   │   └── repositories.module.ts
│   └── modules/
│       ├── auth/                # register, login, refresh-token, /me
│       ├── hunters/             # profile, update, delete (LGPD)
│       ├── activities/          # log (anti-fraude), history, summary
│       ├── events/              # active, join, leaderboard
│       ├── leaderboards/        # global, regional, local
│       └── admin/               # users, assign-role, assign-rank, challenges
├── .dockerignore
├── .env.example
├── .gitignore
├── CLAUDE.md                    # Convenções e padrões arquiteturais do projeto
├── commitlint.config.js         # Regras de Conventional Commits
├── docker-compose.yml           # PostgreSQL 16 + Redis 7 (desenvolvimento local)
├── Dockerfile                   # Multi-stage: builder (Node 25) + production
├── nest-cli.json
├── package.json
├── tsconfig.json
└── tsconfig.build.json
```

---

## Arquitetura de módulos

```
HTTP Request
    │
    ├── Helmet (segurança de headers)
    ├── CORS
    ├── ThrottlerGuard (rate limiting global: 100 req/min)
    ├── AJV Middleware (validação de schema — camada Express)
    ├── JwtAuthGuard / RolesGuard
    ├── ValidationPipe (class-validator — camada NestJS)
    ├── Controller
    ├── Service → AbstractRepository → TypeORM / RedisService
    └── SensitiveDataMaskInterceptor (mascaramento nos logs)
```

---

## Git e commits

Este projeto usa **Conventional Commits**. O formato obrigatório é:

```
<tipo>(<escopo opcional>): <descrição>

Exemplos:
  feat(auth): adiciona refresh token rotativo
  fix(activities): corrige cálculo de XP para rank S
  refactor(cache): extrai TTLs para constantes
  test(leaderboard): adiciona testes do serviço de ranking
  chore(deps): atualiza ioredis para 5.4.0
  docs(readme): atualiza variáveis de ambiente
```

**Tipos aceitos:** `feat` · `fix` · `docs` · `style` · `refactor` · `test` · `chore` · `perf` · `ci` · `build` · `revert`

O hook `pre-commit` roda ESLint (nos arquivos staged) + jest automaticamente.
Para ignorar os hooks em situações excepcionais: `git commit --no-verify`.

---

## CI/CD — GitHub Actions + AWS EC2 Free Tier

```
Push no main
    │
    ├─ ci          ──── lint:check + jest
    ├─ build-push  ──── Docker build → push ECR (:SHA + :latest)
    └─ deploy      ──── SSM Run Command → EC2 executa /app/deploy.sh
                        (pull ECR → .env do SSM → docker compose up)
```

### Arquitetura Free Tier (12 meses grátis)

| Serviço | Instância | Free Tier |
|---|---|---|
| EC2 (app + Redis Docker) | t2.micro | 750 h/mês |
| RDS PostgreSQL | db.t3.micro | 750 h/mês + 20 GB |
| ECR | — | 500 MB/mês |
| CloudWatch Logs | — | 5 GB ingestão |
| SSM Parameter Store | Standard | Gratuito |
| Elastic IP | — | Gratuito (EC2 ligado) |

> **Sem ALB** (≈ R$ 80/mês), **sem ElastiCache** (pago), **sem Fargate** (pago por segundo).

### Secrets necessários no GitHub

| Secret | Descrição |
|---|---|
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Credenciais IAM com permissões ECR + SSM |
| `AWS_REGION` | Região AWS (ex: `us-east-1`) |
| `ECR_REPOSITORY` | Nome do repositório ECR |
| `EC2_INSTANCE_ID` | Instance ID do EC2 (ex: `i-0abc123def456789`) — exibido no Output do CloudFormation |
| `APP_URL` | URL pública da aplicação (ex: `http://IP:3000`) |

Segredos da aplicação (JWT, banco, Redis) ficam no **AWS SSM Parameter Store** em `/health-hunter/prod/` (gratuito).

---

## Segurança

- **Helmet**: headers HTTP de segurança
- **CORS**: origens controladas por `ALLOWED_ORIGINS`
- **AJV** (1ª camada): rejeita payloads com shape inválido, tipos errados ou strings gigantes antes de qualquer processamento NestJS
- **ValidationPipe** (2ª camada): valida regras de negócio via class-validator
- **ThrottlerGuard**: 100 req/min global; endpoints sensíveis têm limites menores
- **JwtAuthGuard + RolesGuard**: RBAC com roles `USER` e `ADMIN`
- **SensitiveDataMaskInterceptor**: mascara `password_hash`, `coordenadas_gps`, `bpm_medio` nos logs
- **LGPD**: contas excluídas são anonimizadas (soft delete), nunca removidas fisicamente

---

## Licença

MIT
