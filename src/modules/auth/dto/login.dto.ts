import { IsEmail, IsString, IsNotEmpty } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class LoginDto {
  @ApiProperty({
    description: 'E-mail cadastrado do Hunter.',
    example: 'sung.jinwoo@hunter.kr',
  })
  @IsEmail()
  email: string

  @ApiProperty({
    description: 'Senha da conta.',
    example: 'Shadow@1234',
  })
  @IsString()
  @IsNotEmpty()
  password: string
}
