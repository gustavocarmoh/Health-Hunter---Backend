import { IsEmail, IsString, MinLength, MaxLength, IsNotEmpty } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class RegisterDto {
  @ApiProperty({
    description: 'Endereço de e-mail único do Hunter.',
    example: 'sung.jinwoo@hunter.kr',
  })
  @IsEmail()
  email: string

  @ApiProperty({
    description: 'Senha de acesso (mínimo 8 caracteres).',
    example: 'Shadow@1234',
    minLength: 8,
    maxLength: 64,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  @MaxLength(64)
  password: string

  @ApiProperty({
    description: 'Nome de exibição do Hunter.',
    example: 'Sung Jin-Woo',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string
}
