import { SetMetadata } from '@nestjs/common'

export const SENSITIVE_FIELDS_KEY = 'sensitive_fields'
export const SensitiveFields = (...fields: string[]) => SetMetadata(SENSITIVE_FIELDS_KEY, fields)
