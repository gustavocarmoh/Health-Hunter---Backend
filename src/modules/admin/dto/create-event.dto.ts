export class CreateEventDto {
  title: string
  description: string
  type: 'RAID' | 'CAMPAIGN'
  region_filter?: string | null
  starts_at: string
  ends_at: string
}
