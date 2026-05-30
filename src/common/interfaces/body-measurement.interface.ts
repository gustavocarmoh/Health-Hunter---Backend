export interface IBodyMeasurement {
  id: string
  user_id: string
  weight_kg: number | null
  height_cm: number | null
  body_fat_pct: number | null
  measured_at: Date
  created_at: Date
}
