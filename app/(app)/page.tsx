'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { abyssList } from '../../data/abyss'
import { raidList } from '../../data/raid'
import { guildMissionFixed, guildMissionPool } from '../../data/guildMission'
import { getWeekKeyKST } from '@/lib/week'
import { loadSession } from '@/lib/session'
import { db } from '@/lib/firebaseClient'
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'

type CharRow = {
  userId: string
  nickname: string
  charId: string
  charName: string
  checks: Record<string, boolean>
}

type GuildMissionRow = {
  userId: string
  nickname: string
  selectedIds: string[]
  checks: Record<string, boolean>
}

type Mission = { id: string; title: string; desc: string }

type TabKey = 'all' | 'abyss' | 'raid' | 'gm'

function uniq2(arr: string[]) {
  return Array.from(new Set(arr)).slice(0, 2)
}

function hasAnyIncomplete(checks: Record<string, boolean>, ids: string[]) {
  return ids.some((id) => checks?.[id] !== true)
}

function StatusBadge({ done }: { done: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold
        ${done ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
    >
      {done ? '완료' : '미완료'}
    </span>
  )
}

function GroupRow({
  name,
  colSpan,
  first,
}: {
  name: string
  colSpan: number
  first: boolean
}) {
  return (
    <tr className={first ? '' : 'border-t-4 border-gray-300'}>
      <td colSpan={colSpan} className="py-4 bg-gray-100">
        <div className="flex items-center gap-3">
          <span className="h-5 w-1.5 rounded-full bg-gray-900/40" />
          <span className="text-base font-semibold text-gray-900">{name}</span>
        </div>
      </td>
    </tr>
  )
}

function clampPercent(n: number) {
  return Math.max(0, Math.min(100, n))
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-200">
      <div
        className="h-full rounded-full bg-yellow-300 transition-all"
        style={{ width: `${clampPercent(percent)}%` }}
      />
    </div>
  )
}

export default function HomePage() {
  const weekKey = useMemo(() => getWeekKeyKST(), [])
  const session = useMemo(
    () => (typeof window === 'undefined' ? null : loadSession()),
    [],
  )

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)

  const [abyssRows, setAbyssRows] = useState<CharRow[]>([])
  const [raidRows, setRaidRows] = useState<CharRow[]>([])
  const [gmRows, setGmRows] = useState<GuildMissionRow[]>([])
  const [mainCharByUser, setMainCharByUser] = useState<Record<string, string>>(
    {},
  )

  // UI
  const [tab, setTab] = useState<TabKey>('all')
  const [query, setQuery] = useState('')
  const [onlyIncompleteAbyss, setOnlyIncompleteAbyss] = useState(false)
  const [onlyIncompleteRaid, setOnlyIncompleteRaid] = useState(false)
  const [onlyIncompleteGm, setOnlyIncompleteGm] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (!session?.userId) return

    const run = async () => {
      setLoading(true)
      try {
        const usersSnap = await getDocs(collection(db, 'users'))
        const userList = usersSnap.docs.map((d) => ({
          userId: d.id,
          nickname: String(d.data()?.nickname || '길드원'),
        }))

        const abyssAll: CharRow[] = []
        const raidAll: CharRow[] = []
        const gmAll: GuildMissionRow[] = []
        const mainMap: Record<string, string> = {}

        for (const u of userList) {
          const charsSnap = await getDocs(
            collection(db, 'users', u.userId, 'characters'),
          )
          const chars = charsSnap.docs.map((d) => {
            const data = d.data() as { name?: string; isMain?: boolean }
            return {
              charId: d.id,
              charName: String(data?.name || '캐릭터'),
              isMain: !!data?.isMain,
            }
          })

          if (chars.length === 0) continue

          // 본캐(메인) 이름 맵 저장: isMain 우선, 없으면 첫 캐릭
          const main = chars.find((c) => c.isMain) || chars[0]
          mainMap[u.userId] = main?.charName || u.nickname

          const abyssSnap = await getDocs(
            collection(db, 'weeks', weekKey, 'users', u.userId, 'abyssChars'),
          )
          const abyssChecksByChar: Record<string, Record<string, boolean>> = {}
          abyssSnap.forEach((d) => {
            const data = d.data() as { checks?: Record<string, boolean> }
            abyssChecksByChar[d.id] = data.checks || {}
          })

          const raidSnap = await getDocs(
            collection(db, 'weeks', weekKey, 'users', u.userId, 'raidChars'),
          )
          const raidChecksByChar: Record<string, Record<string, boolean>> = {}
          raidSnap.forEach((d) => {
            const data = d.data() as { checks?: Record<string, boolean> }
            raidChecksByChar[d.id] = data.checks || {}
          })

          const gmDocRef = doc(
            db,
            'weeks',
            weekKey,
            'users',
            u.userId,
            'guildMission',
            'main',
          )
          const gmSnap = await getDoc(gmDocRef)
          if (gmSnap.exists()) {
            const data = gmSnap.data() as {
              selected?: string[]
              checks?: Record<string, boolean>
            }
            gmAll.push({
              userId: u.userId,
              nickname: u.nickname,
              selectedIds: Array.isArray(data.selected)
                ? uniq2(data.selected)
                : [],
              checks: data.checks || {},
            })
          } else {
            gmAll.push({
              userId: u.userId,
              nickname: u.nickname,
              selectedIds: [],
              checks: {},
            })
          }

          for (const c of chars) {
            abyssAll.push({
              userId: u.userId,
              nickname: u.nickname,
              charId: c.charId,
              charName: c.charName,
              checks: abyssChecksByChar[c.charId] || {},
            })

            raidAll.push({
              userId: u.userId,
              nickname: u.nickname,
              charId: c.charId,
              charName: c.charName,
              checks: raidChecksByChar[c.charId] || {},
            })
          }
        }

        abyssAll.sort(
          (a, b) =>
            a.nickname.localeCompare(b.nickname, 'ko') ||
            a.charName.localeCompare(b.charName, 'ko'),
        )
        raidAll.sort(
          (a, b) =>
            a.nickname.localeCompare(b.nickname, 'ko') ||
            a.charName.localeCompare(b.charName, 'ko'),
        )
        gmAll.sort((a, b) => a.nickname.localeCompare(b.nickname, 'ko'))

        setAbyssRows(abyssAll)
        setRaidRows(raidAll)
        setGmRows(gmAll)
        setMainCharByUser(mainMap)
      } catch (e) {
        console.error(e)
        window.alert(
          '길드 현황을 불러오는데 실패했습니다. 콘솔(F12)을 확인해주세요.',
        )
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [mounted, session?.userId, weekKey])

  const q = query.trim().toLowerCase()

  const gmVisibleFor = (row: GuildMissionRow): Mission[] => {
    const picked = guildMissionPool.filter((m) =>
      row.selectedIds.includes(m.id),
    )
    return [guildMissionFixed, ...picked]
  }

  // ---- 필터 ----
  const filteredAbyss = useMemo(() => {
    const ids = abyssList.map((a) => a.id)
    return abyssRows.filter((r) => {
      const hit =
        !q ||
        r.nickname.toLowerCase().includes(q) ||
        r.charName.toLowerCase().includes(q)
      if (!hit) return false
      if (!onlyIncompleteAbyss) return true
      return hasAnyIncomplete(r.checks, ids)
    })
  }, [abyssRows, q, onlyIncompleteAbyss])

  const filteredRaid = useMemo(() => {
    const ids = raidList.map((a) => a.id)
    return raidRows.filter((r) => {
      const hit =
        !q ||
        r.nickname.toLowerCase().includes(q) ||
        r.charName.toLowerCase().includes(q)
      if (!hit) return false
      if (!onlyIncompleteRaid) return true
      return hasAnyIncomplete(r.checks, ids)
    })
  }, [raidRows, q, onlyIncompleteRaid])

  const filteredGm = useMemo(() => {
    return gmRows.filter((r) => {
      const name = (mainCharByUser[r.userId] || r.nickname).toLowerCase()
      const hit = !q || r.nickname.toLowerCase().includes(q) || name.includes(q)
      if (!hit) return false
      if (!onlyIncompleteGm) return true

      const visible = gmVisibleFor(r).filter(Boolean)
      const ids = visible.map((m) => m.id)
      return hasAnyIncomplete(r.checks, ids)
    })
  }, [gmRows, q, onlyIncompleteGm, mainCharByUser])

  // ---- 진행률 계산(전체/어비스/레이드/길드미션) ----
  const progress = useMemo(() => {
    const calcAbyss = () => {
      const total = abyssRows.length * abyssList.length
      const done = abyssRows.reduce((acc, r) => {
        let x = 0
        for (const a of abyssList) if (r.checks?.[a.id] === true) x++
        return acc + x
      }, 0)
      const percent = total === 0 ? 0 : Math.round((done / total) * 100)
      return { total, done, percent }
    }

    const calcRaid = () => {
      const total = raidRows.length * raidList.length
      const done = raidRows.reduce((acc, r) => {
        let x = 0
        for (const a of raidList) if (r.checks?.[a.id] === true) x++
        return acc + x
      }, 0)
      const percent = total === 0 ? 0 : Math.round((done / total) * 100)
      return { total, done, percent }
    }

    const calcGm = () => {
      const eligible = gmRows.filter((r) => (r.selectedIds || []).length === 2)
      const total = eligible.length * 3 // 고정1 + 선택2
      const done = eligible.reduce((acc, r) => {
        const visible = gmVisibleFor(r).filter(Boolean)
        const n = visible.filter((m) => r.checks?.[m.id] === true).length
        return acc + n
      }, 0)
      const percent = total === 0 ? 0 : Math.round((done / total) * 100)
      return { total, done, percent, eligibleCount: eligible.length }
    }

    const abyss = calcAbyss()
    const raid = calcRaid()
    const gm = calcGm()

    const total = abyss.total + raid.total + gm.total
    const done = abyss.done + raid.done + gm.done
    const percent = total === 0 ? 0 : Math.round((done / total) * 100)

    return {
      all: { total, done, percent },
      abyss,
      raid,
      gm,
    }
  }, [abyssRows, raidRows, gmRows])

  const topProgress = useMemo(() => {
    if (tab === 'abyss') return { label: '어비스 진행률', ...progress.abyss }
    if (tab === 'raid') return { label: '레이드 진행률', ...progress.raid }
    if (tab === 'gm') return { label: '길드미션 진행률', ...progress.gm }
    return { label: '전체 진행률', ...progress.all }
  }, [tab, progress])

  if (!mounted) return null

  if (!session?.userId) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="text-lg font-semibold text-gray-900">길드 현황</div>
        <div className="mt-1 text-sm text-gray-700">로그인이 필요합니다.</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="text-lg font-semibold text-gray-900">길드 현황</div>
        <div className="mt-1 text-sm text-gray-700">
          이번 주 기준: {weekKey} (월 06:00 시작)
        </div>
        <div className="mt-2 text-sm text-gray-600">불러오는 중...</div>
      </div>
    )
  }

  const TabButton = ({ k, label }: { k: TabKey; label: string }) => {
    const active = tab === k
    return (
      <button
        onClick={() => setTab(k)}
        className={`rounded-xl px-4 py-2 text-sm font-medium transition whitespace-nowrap
          ${
            active
              ? 'bg-black text-white'
              : 'bg-white text-gray-800 hover:bg-gray-100'
          }`}
      >
        {label}
      </button>
    )
  }

  // 탭 라벨/설명 (진행률 박스 아래에 표시)
  const tabHint =
    tab === 'gm'
      ? '길드미션은 “선택 2개 저장 완료한 유저”만 진행률 계산에 포함합니다.'
      : ''

  return (
    <div className="space-y-4">
      {/* 상단 */}
      <div
        id="sec-top"
        className="scroll-mt-24 rounded-2xl bg-white p-4 shadow-sm"
      >
        <div className="text-lg font-semibold text-gray-900">길드 현황</div>
        <div className="mt-1 text-sm text-gray-700">
          이번 주 기준: {weekKey} (월 06:00 시작)
        </div>

        {/* 진행률(탭별) - 가로 꽉 */}
        <div className="mt-4 rounded-2xl bg-gray-50 p-4">
          <div className="flex items-end justify-between gap-3">
            <div className="text-sm font-semibold text-gray-900">
              {topProgress.label}: {topProgress.percent}% ({topProgress.done}/
              {topProgress.total})
            </div>

            {tab === 'gm' && 'eligibleCount' in topProgress ? (
              <div className="text-xs text-gray-600">
                (선택 완료 유저: {(topProgress as any).eligibleCount}명)
              </div>
            ) : null}
          </div>

          <ProgressBar percent={topProgress.percent} />

          {tabHint ? (
            <div className="mt-2 text-xs text-gray-600">{tabHint}</div>
          ) : null}
        </div>

        {/* 탭 + 검색 (검색 위치 어정쩡 해결: 같은 줄 오른쪽 고정) */}
        <div className="mt-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <TabButton k="all" label="전체" />
            <TabButton k="abyss" label="어비스" />
            <TabButton k="raid" label="레이드" />
            <TabButton k="gm" label="길드미션" />
          </div>

          <div className="w-full lg:max-w-[360px]">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="검색: 닉네임 / 캐릭터"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400"
            />
          </div>
        </div>
      </div>

      {/* 어비스 표 */}
      {(tab === 'all' || tab === 'abyss') && (
        <section
          id="sec-abyss"
          className="scroll-mt-24 rounded-2xl bg-white p-4 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="font-semibold text-gray-900">어비스 (캐릭터별)</div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={onlyIncompleteAbyss}
                onChange={(e) => setOnlyIncompleteAbyss(e.target.checked)}
              />
              미완료만 보기
            </label>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="min-w-[720px] w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2 pr-3">캐릭터</th>
                  {abyssList.map((a) => (
                    <th key={a.id} className="py-2 pr-3 whitespace-nowrap">
                      {a.title}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredAbyss.length === 0 ? (
                  <tr>
                    <td
                      colSpan={1 + abyssList.length}
                      className="py-3 text-gray-600"
                    >
                      표시할 어비스 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  (() => {
                    let lastNick: string | null = null

                    return filteredAbyss.flatMap((r, idx) => {
                      const isNewNick = lastNick !== r.nickname
                      if (isNewNick) lastNick = r.nickname

                      const rows: React.ReactNode[] = []

                      if (isNewNick) {
                        rows.push(
                          <GroupRow
                            key={`abyss-group-${r.userId}-${idx}`}
                            name={r.nickname}
                            colSpan={1 + abyssList.length}
                            first={idx === 0}
                          />,
                        )
                      }

                      rows.push(
                        <tr
                          key={`${r.userId}:${r.charId}`}
                          className="border-t"
                        >
                          <td className="py-2 pr-3 text-gray-900">
                            {r.charName}
                          </td>

                          {abyssList.map((a) => (
                            <td key={a.id} className="py-2 pr-3">
                              <StatusBadge done={r.checks?.[a.id] === true} />
                            </td>
                          ))}
                        </tr>,
                      )

                      return rows
                    })
                  })()
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 레이드 표 (어비스랑 동일한 옵션3 스타일: 닉네임 컬럼 제거 + 그룹행) */}
      {(tab === 'all' || tab === 'raid') && (
        <section
          id="sec-raid"
          className="scroll-mt-24 rounded-2xl bg-white p-4 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="font-semibold text-gray-900">레이드 (캐릭터별)</div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={onlyIncompleteRaid}
                onChange={(e) => setOnlyIncompleteRaid(e.target.checked)}
              />
              미완료만 보기
            </label>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="min-w-[720px] w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2 pr-3">캐릭터</th>
                  {raidList.map((a) => (
                    <th key={a.id} className="py-2 pr-3 whitespace-nowrap">
                      {a.title}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredRaid.length === 0 ? (
                  <tr>
                    <td
                      colSpan={1 + raidList.length}
                      className="py-3 text-gray-600"
                    >
                      표시할 레이드 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  (() => {
                    let lastNick: string | null = null

                    return filteredRaid.flatMap((r, idx) => {
                      const isNewNick = lastNick !== r.nickname
                      if (isNewNick) lastNick = r.nickname

                      const rows: React.ReactNode[] = []

                      if (isNewNick) {
                        rows.push(
                          <tr
                            key={`raid-group-${r.userId}-${idx}`}
                            className={
                              idx === 0 ? '' : 'border-t-4 border-gray-300'
                            }
                          >
                            <td
                              colSpan={1 + raidList.length}
                              className="py-4 bg-gray-100"
                            >
                              <div className="flex items-center gap-3">
                                <span className="h-5 w-1.5 rounded-full bg-gray-900/40" />
                                <span className="text-base font-semibold text-gray-900">
                                  {r.nickname}
                                </span>
                              </div>
                            </td>
                          </tr>,
                        )
                      }

                      rows.push(
                        <tr
                          key={`${r.userId}:${r.charId}`}
                          className="border-t"
                        >
                          <td className="py-2 pr-3 text-gray-900">
                            {r.charName}
                          </td>

                          {raidList.map((a) => (
                            <td key={a.id} className="py-2 pr-3">
                              <StatusBadge done={r.checks?.[a.id] === true} />
                            </td>
                          ))}
                        </tr>,
                      )

                      return rows
                    })
                  })()
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 길드미션 표 */}
      {(tab === 'all' || tab === 'gm') && (
        <section
          id="sec-gm"
          className="scroll-mt-24 rounded-2xl bg-white p-4 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="font-semibold text-gray-900">길드미션 (유저별)</div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={onlyIncompleteGm}
                onChange={(e) => setOnlyIncompleteGm(e.target.checked)}
              />
              미완료만 보기
            </label>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="min-w-[720px] w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2 pr-3">본캐</th>
                  <th className="py-2 pr-3 whitespace-nowrap">
                    {guildMissionFixed.title}
                  </th>
                  <th className="py-2 pr-3 whitespace-nowrap">선택 1</th>
                  <th className="py-2 pr-3 whitespace-nowrap">선택 2</th>
                </tr>
              </thead>

              <tbody>
                {filteredGm.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-3 text-gray-600">
                      표시할 길드미션 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredGm.map((r) => {
                    const visible = gmVisibleFor(r).filter(Boolean)
                    const fixed = visible[0]
                    const opt1 = visible[1]
                    const opt2 = visible[2]

                    // 미완료만 보기 + 선택 미완료는 보이게
                    if (onlyIncompleteGm) {
                      const selectedDone = (r.selectedIds || []).length === 2
                      if (selectedDone) {
                        const ids = [fixed?.id, opt1?.id, opt2?.id].filter(
                          Boolean,
                        ) as string[]
                        const hasMiss = ids.some(
                          (id) => r.checks?.[id] !== true,
                        )
                        if (!hasMiss) return null
                      }
                    }

                    return (
                      <tr key={r.userId} className="border-t">
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">
                              {mainCharByUser[r.userId] || r.nickname}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({r.nickname})
                            </span>
                          </div>
                        </td>

                        <td className="py-2 pr-3">
                          {fixed ? (
                            <StatusBadge done={r.checks?.[fixed.id] === true} />
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>

                        <td className="py-2 pr-3">
                          <div className="text-gray-900">
                            {opt1 ? opt1.title : '미선택'}
                          </div>
                          <div className="mt-1">
                            {opt1 ? (
                              <StatusBadge
                                done={r.checks?.[opt1.id] === true}
                              />
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </div>
                        </td>

                        <td className="py-2 pr-3">
                          <div className="text-gray-900">
                            {opt2 ? opt2.title : '미선택'}
                          </div>
                          <div className="mt-1">
                            {opt2 ? (
                              <StatusBadge
                                done={r.checks?.[opt2.id] === true}
                              />
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
