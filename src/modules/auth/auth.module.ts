import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { ConfigModule } from '@nestjs/config'
import { AuthService } from './auth.service.js'
import { AuthController } from './auth.controller.js'
import { JwtStrategy } from './strategies/jwt.strategy.js'
import { RepositoriesModule } from '../../repositories/repositories.module.js'
import { createAjvMiddleware } from '../../common/middleware/ajv-body.middleware.js'
import { registerSchema } from './dto/register.schema.js'
import { loginSchema } from './dto/login.schema.js'
import { refreshTokenSchema } from './dto/refresh-token.schema.js'

@Module({
  imports: [ConfigModule, PassportModule, JwtModule.register({}), RepositoriesModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(createAjvMiddleware(registerSchema))
      .forRoutes({ path: 'auth/register', method: RequestMethod.POST })

    consumer
      .apply(createAjvMiddleware(loginSchema))
      .forRoutes({ path: 'auth/login', method: RequestMethod.POST })

    consumer
      .apply(createAjvMiddleware(refreshTokenSchema))
      .forRoutes({ path: 'auth/refresh-token', method: RequestMethod.POST })
  }
}
