import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { UserRepository } from '../../../repositories/abstract/user.repository'
import { IUser } from '../../../common/interfaces/user.interface'

interface JwtPayload {
  sub: string
  email: string
  role: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'changeme-super-secret'),
    })
  }

  async validate(payload: JwtPayload): Promise<IUser> {
    const user = await this.userRepository.findById(payload.sub)
    if (!user || user.is_deleted) {
      throw new Error('Unauthorized')
    }
    return user
  }
}
