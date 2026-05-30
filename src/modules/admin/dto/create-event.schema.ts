export const createEventSchema = {
  type: 'object',
  required: ['title', 'description', 'type', 'starts_at', 'ends_at'],
  additionalProperties: false,
  properties: {
    title: { type: 'string', minLength: 3, maxLength: 120 },
    description: { type: 'string', minLength: 1, maxLength: 500 },
    type: { type: 'string', enum: ['RAID', 'CAMPAIGN'] },
    region_filter: { type: 'string', nullable: true },
    starts_at: { type: 'string', format: 'date-time' },
    ends_at: { type: 'string', format: 'date-time' },
  },
}
