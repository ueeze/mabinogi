import { Timestamp } from 'firebase/firestore'

/**
 * week 시작 시점으로부터 14일 뒤를 expireAt으로 설정
 */
export function getExpireAtFromWeekStart(weekStart: Date) {
  const expire = new Date(weekStart)
  expire.setDate(expire.getDate() + 14)
  return Timestamp.fromDate(expire)
}
