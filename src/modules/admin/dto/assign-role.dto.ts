import { IsEnum, IsNotEmpty } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { Role } from '../../../common/enums/role.enum.js'

export class AssignRoleDto {
  @ApiProperty({
    description: 'Nova Role de infraestrutura do usuário.',
    enum: Role,
    example: Role.ADMIN,
  })
  @IsEnum(Role)
  @IsNotEmpty()
  role: Role
}
