export interface IAuditLog {
  id: string
  admin_id: string
  target_user_id: string | null
  action: string
  old_value: string | null
  new_value: string
  performed_at: Date
}
