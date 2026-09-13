# Arquitetura — Health Hunter

Este documento descreve a arquitetura completa do **Health Hunter**: como o app mobile se conecta ao BFF, como o BFF está hospedado na AWS (free tier), e como o pipeline de CI/CD move código do commit até produção.

> Reflete o estado atual do código (branch `chore/nestjs-v12-esm-migration`): NestJS v12 (ESM), rate limiting próprio via Redis (substituindo `@nestjs/throttler`, ainda incompatível com v12), e IA Mentor via Ollama self-hosted.

---

## 1. Visão geral (contexto do sistema)

```mermaid
flowchart LR
    subgraph Clients["Clientes"]
        Mobile["📱 Health Hunter App<br/>Expo / React Native"]
        Swagger["🌐 Swagger UI / Postman<br/>(dev &amp; QA)"]
    end

    subgraph BFFBox["Health Hunter BFF — NestJS v12"]
        API["API REST<br/>/auth · /hunters · /activities<br/>/events · /leaderboards · /admin ..."]
    end

    PG[("PostgreSQL<br/>dados relacionais")]
    Redis[("Redis<br/>cache + rate limit")]
    Ollama["🤖 Ollama<br/>IA Mentor (self-hosted)"]

    GH["GitHub Actions<br/>CI/CD"]
    ECR["AWS ECR<br/>imagens Docker"]
    EC2["AWS EC2<br/>roda o BFF em produção"]

    Mobile -- "HTTPS/REST + JWT Bearer" --> API
    Swagger -- "HTTPS/REST + JWT Bearer" --> API
    API -- "TypeORM" --> PG
    API -- "ioredis" --> Redis
    API -- "HTTP (dev only)" -.-> Ollama

    GH -- "build & push image" --> ECR
    GH -- "SSM Run Command" --> EC2
    ECR -- "docker pull" --> EC2
    EC2 -. "hospeda" .-> BFFBox

    style Ollama stroke-dasharray: 5 5
```

**Pontos-chave:**
- O app mobile (Expo/React Native) fala **diretamente** com o BFF via REST + JWT — não existe API Gateway nem BFF intermediário adicional.
- Não há ALB nem HTTPS na frente do EC2 hoje (ver [Limitações](#8-limitações-conhecidas--gaps)) — o app aponta para `http://<Elastic-IP>:3000`.
- O Ollama (IA Mentor) roda via Docker Compose **apenas em desenvolvimento** (`docker-compose.yml`). O `docker-compose.prod.yml` gerado no EC2 **não** inclui Ollama — é uma lacuna conhecida, não uma omissão do diagrama.

---

## 2. Infraestrutura AWS (Free Tier — 12 meses)

```mermaid
flowchart TB
    Dev["👤 Time de dev<br/>git push"]
    Phone["📱 App Mobile"]

    subgraph GitHub["GitHub"]
        Actions["GitHub Actions<br/>(credenciais IAM via Secrets)"]
    end

    subgraph AWS["AWS Cloud — us-east-1 (ex.)"]
        ECRepo["📦 ECR<br/>health-hunter-bff<br/>:sha · :latest"]
        SSMParams["🔐 SSM Parameter Store<br/>/health-hunter/prod/*<br/>DB_*, JWT_*, REDIS_PASSWORD"]
        CW["📊 CloudWatch Logs<br/>/health-hunter/bff"]

        subgraph VPC["VPC (padrão da conta)"]
            subgraph PublicSubnet["Subnet pública"]
                EIP["🌐 Elastic IP"]
                subgraph EC2["EC2 t2.micro<br/>Amazon Linux 2023"]
                    IAMRole["IAM Instance Profile<br/>SSMManagedInstanceCore +<br/>CloudWatchAgent + ECR pull +<br/>SSM GetParameter/KMS Decrypt"]
                    subgraph DockerHost["Docker Compose (docker-compose.prod.yml)"]
                        AppC["container: app<br/>NestJS BFF :3000"]
                        RedisC["container: redis<br/>senha via SSM"]
                    end
                end
            end

            subgraph DBSubnets["DB Subnet Group (2 AZs)"]
                RDS[("RDS PostgreSQL 16<br/>db.t3.micro · Single-AZ<br/>20GB gp2 · criptografado<br/>PubliclyAccessible: false")]
            end

            SGEC2["SG: EC2<br/>in 80,443,3000 de 0.0.0.0/0<br/>in 22 de AdminCidr"]
            SGRDS["SG: RDS<br/>in 5432 somente do SG-EC2"]
        end
    end

    Dev -- "push" --> Actions
    Actions -- "docker build + push" --> ECRepo
    Actions -- "ssm send-command" --> EC2
    IAMRole -. "autoriza" .-> EC2

    EC2 -- "docker pull (via ECR credential helper)" --> ECRepo
    EC2 -- "get-parameter --with-decryption" --> SSMParams
    AppC -- "5432 (SSL)" --> RDS
    AppC <--> RedisC
    AppC -- "driver awslogs" --> CW

    Phone -- "http://ElasticIP:3000" --> EIP
    EIP --> AppC

    SGEC2 -. "protege" .-> EC2
    SGRDS -. "protege" .-> RDS
```

### Componentes e propósito

| Componente | Papel | Free Tier |
|---|---|---|
| **EC2 t2.micro** | Roda `app` (BFF) + `redis` via Docker Compose | 750 h/mês |
| **RDS PostgreSQL** `db.t3.micro` | Banco relacional, Single-AZ, `PubliclyAccessible: false` — só o EC2 acessa (via Security Group) | 750 h/mês + 20 GB |
| **ECR** | Registro das imagens Docker (`:sha`, `:latest`) | 500 MB/mês |
| **SSM Parameter Store** | Segredos de produção (`DB_PASSWORD`, `JWT_SECRET`, `REDIS_PASSWORD` como `SecureString`; o resto como `String`) | Standard = grátis |
| **CloudWatch Logs** | Log driver `awslogs` do container `app` → grupo `/health-hunter/bff` | 5 GB ingestão |
| **Elastic IP** | IP público fixo associado ao EC2 (não muda em reboot) | Grátis enquanto associado a instância rodando |
| **IAM Instance Profile** | Dá ao EC2 permissão de puxar imagem do ECR e ler parâmetros do SSM **sem precisar de chave SSH nem credenciais estáticas** | — |

> **Por que sem ElastiCache/ALB/Fargate?** Todos são pagos. O Redis roda como container Docker no próprio EC2, e o tráfego chega direto na porta `3000` do EC2 via Elastic IP — trade-off deliberado para caber 100% no free tier.

---

## 3. Pipeline de CI/CD (GitHub Actions)

```mermaid
flowchart TD
    Push(["push"])

    Push -->|"branch: main/master<br/>(exceto mudanças em package.json)"| VB
    Push -->|"branch: rc/*"| DeployFlow
    Push -->|"qualquer outra branch / PR"| CI

    subgraph VB["version-bump.yml"]
        VB1["Analisa último commit<br/>(feat → minor · BREAKING → major · resto → patch)"]
        VB2["Bump semver em package.json<br/>(--ignore-scripts, sem rodar husky)"]
        VB3["Commit + tag vX.Y.Z + push"]
        VB1 --> VB2 --> VB3
    end

    subgraph CI["ci.yml"]
        C1["lint:check<br/>ESLint zero warnings"]
        C2["test:cov<br/>Jest + cobertura"]
        C3["build-image<br/>docker build (validação, sem push)"]
        C1 --> C2 --> C3
    end

    subgraph DeployFlow["deploy.yml"]
        D1["ci: lint + test"]
        D2["build-and-push<br/>docker build → ECR :sha e :latest"]
        D3{"⏸ await-approval<br/>environment: production-gate<br/>(reviewer aprova manualmente)"}
        D4["deploy<br/>SSM Run Command → /app/deploy.sh<br/>no EC2"]
        D1 --> D2 --> D3 -->|aprovado| D4
        D3 -.->|"⚠ atualmente desativado<br/>(if: false) — ver nota"| D4
    end

    D4 --> ECRPull["EC2: docker compose pull app<br/>+ up -d (Redis não reinicia)"]
```

> **Nota:** os jobs `await-approval` e `deploy` estão temporariamente com `if: false` no workflow enquanto a migração para NestJS v12/ESM não é mesclada em `main` — isso mantém `ci`/`build-and-push` passando (pipeline verde) sem enviar nada para o EC2 de produção. Remover essas linhas reativa o fluxo de aprovação + deploy real.

---

## 4. Pipeline de requisição dentro do BFF

```mermaid
flowchart TD
    Req(["HTTP Request"]) --> Helmet["Helmet<br/>headers de segurança (OWASP)"]
    Helmet --> CORS["CORS<br/>origem controlada por ALLOWED_ORIGINS"]
    CORS --> RateLimit["RateLimitGuard<br/>Redis INCR + EXPIRE por rota+IP<br/>(100 req/min global, limites menores em rotas sensíveis)"]
    RateLimit --> AJV["AJV Middleware<br/>valida shape do payload (camada Express)"]
    AJV --> Guards["JwtAuthGuard / RolesGuard<br/>Passport JWT + RBAC (USER/ADMIN)"]
    Guards --> Pipe["ValidationPipe<br/>class-validator (regras de negócio)"]
    Pipe --> Controller["Controller"]
    Controller --> Service["Service"]
    Service --> Repo["Abstract Repository"]
    Repo --> TypeORM["TypeORM → PostgreSQL"]
    Repo --> RedisSvc["RedisService → cache"]
    Service --> Mask["SensitiveDataMaskInterceptor<br/>mascara password_hash, GPS, BPM nos logs"]
    Mask --> Res(["HTTP Response"])
```

---

## 5. Exemplo de fluxo: login + registro de atividade

```mermaid
sequenceDiagram
    actor App as App Mobile
    participant API as BFF (NestJS)
    participant PG as PostgreSQL
    participant Redis as Redis

    App->>API: POST /auth/login {email, password}
    API->>PG: SELECT user WHERE email
    PG-->>API: user (password_hash)
    API->>API: bcrypt.compare(password, hash)
    API-->>App: 200 {access_token, refresh_token}

    Note over App,API: access_token (15min) usado como Bearer

    App->>API: POST /activities/log (Bearer JWT) {distancia, duracao, gps, bpm}
    API->>API: JwtAuthGuard valida token
    API->>API: AJV + ValidationPipe validam payload
    API->>PG: SELECT user (rank atual)
    API->>API: calcula XP/coins (multiplicador por rank)
    API->>PG: INSERT activity_log + UPDATE user.xp/coins
    API->>Redis: DEL hunter:profile:{id}
    API->>Redis: invalidatePattern(leaderboard:*)
    API-->>App: 201 {xp_gained, coins_gained, total_xp, total_coins}
```

---

## 6. Mapa de módulos de domínio (NestJS)

```mermaid
flowchart LR
    App["AppModule"]

    subgraph Infra["Infraestrutura compartilhada"]
        Redis["RedisCacheModule<br/>@Global"]
        Repos["RepositoriesModule<br/>5 contratos abstratos + impl. TypeORM"]
        Health["HealthModule<br/>/health — DB, Redis, memória"]
        Sched["SchedulerModule<br/>cron jobs"]
    end

    subgraph Domain["Módulos de domínio"]
        Auth["AuthModule<br/>register · login · refresh · /me"]
        Hunters["HuntersModule<br/>perfil · stats · delete LGPD"]
        Activities["ActivitiesModule<br/>log anti-fraude · histórico"]
        Events["EventsModule<br/>raids · campanhas"]
        Leaderboards["LeaderboardsModule<br/>global · regional · local"]
        Admin["AdminModule<br/>🔒 users · roles · challenges"]
        Achievements["AchievementsModule"]
        Ai["AiModule<br/>IA Mentor (Ollama, SSE)"]
        Challenges["ChallengesModule"]
        Guilds["GuildsModule"]
        Missions["MissionsModule<br/>missões diárias"]
        Notifications["NotificationsModule"]
        Seasons["SeasonsModule"]
        Store["StoreModule"]
    end

    App --> Infra
    App --> Domain
    Domain --> Repos
    Domain --> Redis
```

---

## 7. Modelo de dados (entidades principais)

```mermaid
erDiagram
    USER ||--o{ ACTIVITY_LOG : registra
    USER ||--o{ BODY_MEASUREMENT : registra
    USER ||--o{ FOLLOW : segue
    USER ||--o{ GUILD_MEMBER : participa
    USER ||--o{ EVENT_PARTICIPANT : participa
    USER ||--o{ CHALLENGE_PARTICIPATION : participa
    USER ||--o{ DAILY_MISSION : possui
    USER ||--o{ NOTIFICATION : recebe
    USER ||--o{ AI_CONVERSATION : conversa
    USER ||--o{ HUNTER_ITEM : possui
    USER ||--o{ AUDIT_LOG : "é alvo de (admin)"

    GUILD ||--o{ GUILD_MEMBER : tem
    GUILD ||--o{ GUILD_INVITE : convida

    EVENT ||--o{ EVENT_PARTICIPANT : tem
    CHALLENGE ||--o{ CHALLENGE_PARTICIPATION : tem

    AI_CONVERSATION ||--o{ AI_MESSAGE : contém

    STORE_ITEM ||--o{ HUNTER_ITEM : "comprado como"

    USER {
        uuid id PK
        string email
        string password_hash
        enum role "USER | ADMIN"
        enum rank_level "E..S"
        int xp
        int coins
        int strength
        int intel
        int vitality
        int sense
        int agility
        bool is_deleted "soft delete LGPD"
    }
    ACTIVITY_LOG {
        uuid id PK
        uuid user_id FK
        float distancia_m
        int duracao_seg
        int xp_gained
        int coins_gained
    }
```

---

## 8. Limitações conhecidas / gaps

| Item | Status | Impacto |
|---|---|---|
| **HTTPS / ALB** | Não existe — tráfego direto em `http://ElasticIP:3000` | Sem TLS na frente do BFF hoje |
| **Ollama em produção** | `docker-compose.prod.yml` (gerado pelo `user-data` do EC2) não inclui o container Ollama | `/ai/chat` provavelmente falha em produção até isso ser adicionado |
| **`@nestjs/throttler`** | Removido — incompatível com NestJS v12 (ESM-only, o pacote ainda é CommonJS) | Substituído por `RateLimitGuard` próprio via Redis (`src/common/rate-limit/`) |
| **Deploy automático (`deploy.yml`)** | Jobs `await-approval`/`deploy` com `if: false` durante a migração v12 | Pipeline fica verde, mas nada é enviado ao EC2 até reativar |
| **Cobertura de testes (`ci.yml`)** | Gate de 70% configurado, cobertura real ~9% (poucos specs) | Gate pré-existente, não bloqueado por este documento |

---

## 9. Stack tecnológica

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 25 (ESM, `"type": "module"`) |
| Framework | NestJS 12 |
| Linguagem | TypeScript 6 |
| ORM | TypeORM 0.3 |
| Banco | PostgreSQL 16 (RDS em prod) |
| Cache / rate limit | Redis 7 (`ioredis`) |
| IA Mentor | Ollama (`neural-chat`), streaming SSE |
| Autenticação | Passport JWT (access 15min / refresh 7d) |
| Validação | AJV (schema, camada Express) + class-validator (DTO, camada Nest) |
| Observabilidade | `nestjs-pino` (logs estruturados) + CloudWatch Logs |
| Docs da API | Swagger/OpenAPI em `/api/docs` |
| Container | Docker multi-stage (builder + produção, usuário não-root) |
| CI/CD | GitHub Actions → ECR → SSM Run Command → EC2 |
