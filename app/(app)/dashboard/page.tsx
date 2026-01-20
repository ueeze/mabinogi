'use client'

import { useEffect, useMemo, useState } from 'react'
import { abyssList } from '../../../data/abyss'
import { raidList } from '../../../data/raid'
import { guildMissionFixed, guildMissionPool } from '../../../data/guildMission'
import { loadCharacters, type Character } from '@/lib/characters'
import { getWeekKeyKST } from '@/lib/week'

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export default function DashboardPage() {
  const weekKey = useMemo(() => getWeekKeyKST(), [])

  const [mounted, setMounted] = useState(false)
  const [chars, setChars] = useState<Character[]>([])

  // 로컬 저장키(주차별)
  const abyssKey = `abyssCheckedMap-${weekKey}`
  const raidKey = `raidCheckedMap-${weekKey}`
  const gmSelectKey = `guildMissionSelected-${weekKey}`
  const gmCheckKey = `guildMissionChecked-${weekKey}` // 길드미션 단일 체크(너가 바꾼 버전 기준)

  // 데이터
  const [abyssMap, setAbyssMap] = useState<
    Record<string, Record<string, boolean>>
  >({})
  const [raidMap, setRaidMap] = useState<
    Record<string, Record<string, boolean>>
  >({})
  const [gmSelected, setGmSelected] = useState<string[]>([])
  const [gmChecked, setGmChecked] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setMounted(true)
    setChars(loadCharacters())

    setAbyssMap(safeParse(localStorage.getItem(abyssKey), {}))
    setRaidMap(safeParse(localStorage.getItem(raidKey), {}))
    setGmSelected(safeParse(localStorage.getItem(gmSelectKey), []))
    setGmChecked(safeParse(localStorage.getItem(gmCheckKey), {}))
  }, [abyssKey, raidKey, gmSelectKey, gmCheckKey])

  const visibleGm = useMemo(() => {
    const picked = guildMissionPool.filter((m) => gmSelected.includes(m.id))
    return [guildMissionFixed, ...picked]
  }, [gmSelected])

  const rateFor = (
    list: { id: string }[],
    mapForChar: Record<string, boolean> | undefined,
  ) => {
    const total = list.length
    const done = Object.values(mapForChar || {}).filter(Boolean).length
    const percent = total === 0 ? 0 : Math.round((done / total) * 100)
    return { total, done, percent }
  }

  const abyssOverall = useMemo(() => {
    const total = chars.length * abyssList.length
    let done = 0
    for (const c of chars) {
      done += Object.values(abyssMap[c.id] || {}).filter(Boolean).length
    }
    const percent = total === 0 ? 0 : Math.round((done / total) * 100)
    return { total, done, percent }
  }, [chars, abyssMap])

  const raidOverall = useMemo(() => {
    const total = chars.length * raidList.length
    let done = 0
    for (const c of chars) {
      done += Object.values(raidMap[c.id] || {}).filter(Boolean).length
    }
    const percent = total === 0 ? 0 : Math.round((done / total) * 100)
    return { total, done, percent }
  }, [chars, raidMap])

  const gmOverall = useMemo(() => {
    const total = visibleGm.length
    const done = visibleGm.filter((m) => gmChecked[m.id]).length
    const percent = total === 0 ? 0 : Math.round((done / total) * 100)
    return { total, done, percent }
  }, [visibleGm, gmChecked])

  if (!mounted) return null

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="text-lg font-semibold">홈</div>
        <div className="mt-1 text-sm text-gray-600">
          이번 주 기준: {weekKey} (월 06:00 시작)
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="font-semibold">어비스</div>
          <div className="mt-1 text-sm text-gray-600">
            전체 완료율: {abyssOverall.percent}% ({abyssOverall.done}/
            {abyssOverall.total})
          </div>
          <div className="mt-3 space-y-2">
            {chars.map((c) => {
              const r = rateFor(abyssList, abyssMap[c.id])
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="text-gray-600">
                    {r.percent}% ({r.done}/{r.total})
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="font-semibold">레이드</div>
          <div className="mt-1 text-sm text-gray-600">
            전체 완료율: {raidOverall.percent}% ({raidOverall.done}/
            {raidOverall.total})
          </div>
          <div className="mt-3 space-y-2">
            {chars.map((c) => {
              const r = rateFor(raidList, raidMap[c.id])
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="text-gray-600">
                    {r.percent}% ({r.done}/{r.total})
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="font-semibold">길드미션</div>
          <div className="mt-1 text-sm text-gray-600">
            전체 완료율: {gmOverall.percent}% ({gmOverall.done}/
            {gmOverall.total})
          </div>

          {!gmSelected.length ? (
            <div className="mt-3 rounded-xl bg-gray-50 px-3 py-3 text-sm text-gray-700">
              이번 주 선택 미션이 아직 설정되지 않았습니다.
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {visibleGm.map((m) => {
                const done = !!gmChecked[m.id]
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{m.title}</span>
                    <span className={done ? 'text-black' : 'text-gray-500'}>
                      {done ? '완료' : '미완료'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
