/**
 * JSON Schema (AJV draft-07) para validação do payload de registro de atividade.
 *
 * Restrições de segurança aplicadas antes do serviço:
 * - Limites numéricos espelham (e reforçam) os da camada class-validator
 * - `coordenadas_gps.altitude` é opcional — objeto rejeitado se tiver campos extras
 * - `tipo_exercicio` com pattern anti-injeção
 * - `bpm_medio` e `distancia_m` com limites absolutos para detecção de payload absurdo
 */
export const logActivitySchema = {
  type: 'object',
  required: ['distancia_m', 'duracao_seg', 'tipo_exercicio', 'coordenadas_gps', 'bpm_medio'],
  additionalProperties: false,
  properties: {
    distancia_m: {
      type: 'number',
      minimum: 1,
      maximum: 200_000,
    },
    duracao_seg: {
      type: 'integer',
      minimum: 60,
      maximum: 86_400,
    },
    tipo_exercicio: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      pattern: '^[^<>{}\\[\\];]+$',
    },
    coordenadas_gps: {
      type: 'object',
      required: ['latitude', 'longitude'],
      additionalProperties: false,
      properties: {
        latitude: {
          type: 'number',
          minimum: -90,
          maximum: 90,
        },
        longitude: {
          type: 'number',
          minimum: -180,
          maximum: 180,
        },
        altitude: {
          type: 'number',
          minimum: -500, // Depressão do Mar Morto ~-430 m
          maximum: 10_000, // Acima do Everest com margem
        },
      },
    },
    bpm_medio: {
      type: 'integer',
      minimum: 30,
      maximum: 220,
    },
  },
} as const
