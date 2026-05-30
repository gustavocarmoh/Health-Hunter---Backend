import { IActivityLog } from '../../../common/interfaces/activity.interface'

export interface ActivityCompletedPayload {
  activity: IActivityLog
  hunter_id: string
  hunter_rank: string
}
