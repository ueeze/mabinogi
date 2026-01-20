// src/lib/week.ts
export function getWeekKeyKST() {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const kst = new Date(utc + 9 * 60 * 60000)

  // 월요일 06:00 기준. 06:00 이전이면 "하루 전"로 보고 주차 계산
  const base = new Date(kst)
  if (base.getHours() < 6) base.setDate(base.getDate() - 1)

  // 이번 주 월요일로 내림
  const day = base.getDay() // 0=일,1=월...
  const diffToMon = (day + 6) % 7
  base.setDate(base.getDate() - diffToMon)
  base.setHours(6, 0, 0, 0)

  const y = base.getFullYear()
  const m = String(base.getMonth() + 1).padStart(2, '0')
  const d = String(base.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getWeekStartKST(): Date {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const kst = new Date(utc + 9 * 60 * 60000)

  // 월요일 06:00 기준. 06:00 이전이면 "하루 전"로 보고 주차 계산
  const base = new Date(kst)
  if (base.getHours() < 6) base.setDate(base.getDate() - 1)

  // 이번 주 월요일 06:00으로 내림
  const day = base.getDay() // 0=일,1=월...
  const diffToMon = (day + 6) % 7
  base.setDate(base.getDate() - diffToMon)
  base.setHours(6, 0, 0, 0)

  return base
}
