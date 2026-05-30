export const updateEventSchema = {
  type: 'object',
  minProperties: 1,
  additionalProperties: false,
  properties: {
    title: { type: 'string', minLength: 3, maxLength: 120 },
    description: { type: 'string', minLength: 1, maxLength: 500 },
    type: { type: 'string', enum: ['RAID', 'CAMPAIGN'] },
    region_filter: { type: 'string', nullable: true },
    starts_at: { type: 'string', format: 'date-time' },
    ends_at: { type: 'string', format: 'date-time' },
    is_active: { type: 'boolean' },
  },
}
