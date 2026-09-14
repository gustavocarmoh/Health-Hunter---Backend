import { NestFactory, Reflector } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { Logger as PinoLogger } from 'nestjs-pino'
import helmet from 'helmet'
import { AppModule } from './app.module.js'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true })

  app.useLogger(app.get(PinoLogger))

  // CSP explícita em vez dos defaults do Helmet (que podem mudar entre versões).
  // 'unsafe-inline' em script/style é necessário só para o Swagger UI; o resto
  // da API é JSON puro, sem views renderizadas.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          scriptSrc: [`'self'`, `'unsafe-inline'`],
          styleSrc: [`'self'`, `'unsafe-inline'`],
          imgSrc: [`'self'`, 'data:'],
          connectSrc: [`'self'`],
          objectSrc: [`'none'`],
          frameAncestors: [`'none'`],
        },
      },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  )

  const bootstrapLogger = new Logger('Bootstrap')
  const isProduction = process.env.NODE_ENV === 'production'
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').filter(Boolean) ?? []

  if (isProduction && allowedOrigins.length === 0) {
    bootstrapLogger.warn(
      'ALLOWED_ORIGINS not set in production — CORS will block all cross-origin requests.',
    )
  }

  app.enableCors({
    origin: isProduction ? allowedOrigins : allowedOrigins.length > 0 ? allowedOrigins : '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )

  app.get(Reflector)

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Health Hunter BFF')
    .setDescription(
      `## Backend for Frontend — Health Hunter 🏹

Aplicativo fitness gamificado baseado no universo de **Solo Leveling**.

### Autenticação
Todas as rotas protegidas requerem um **Bearer JWT** no header \`Authorization\`.
Obtenha o token em \`POST /auth/login\` ou \`POST /auth/register\`.

### Roles
| Role | Descrição |
|------|-----------|
| \`USER\` | Usuário final do aplicativo |
| \`ADMIN\` | Acesso irrestrito ao módulo \`/admin\` |

### Ranks de Caçador
Hierarquia de gamificação (E → D → C → B → A → S).
Multiplicadores de XP: E=1.0x, D=1.5x, C=2.0x, B=2.5x, A=3.5x, S=5.0x.
      `,
    )
    .setVersion('1.0.0')
    .setContact('Health Hunter Team', '', 'contato@healthhunter.app')
    .setLicense('MIT', '')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Insira o access_token retornado pelo /auth/login',
        in: 'header',
      },
      'access-token',
    )
    .addTag('auth', 'Autenticação e Identidade — registro, login e renovação de sessão')
    .addTag('hunters', 'Evolução do Hunter — perfil, estatísticas e exclusão LGPD')
    .addTag(
      'activities',
      'Engine de Atividades — registro de treinos com anti-fraude e telemetria de IA',
    )
    .addTag('events', 'Eventos e Campanhas — raids mundiais e temporadas')
    .addTag('leaderboards', 'Rankings — globais, regionais e locais com cache Redis')
    .addTag('admin', '🔒 Administração e Auditoria — acesso restrito à Role ADMIN')
    .build()

  const document = SwaggerModule.createDocument(app, swaggerConfig)

  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Health Hunter — API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'list',
    },
  })

  const port = process.env.PORT ?? 3000
  const host = process.env.HOST ?? '0.0.0.0'
  await app.listen(port, host)
  bootstrapLogger.log(`Health Hunter BFF running on ${host}:${port}`)
  bootstrapLogger.log(`Swagger UI: http://localhost:${port}/api/docs`)
}

void bootstrap()
