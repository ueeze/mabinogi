'use client'

type Mission = { id: string; title: string; desc: string }

export default function GuildMissionCard({
  item,
  checked,
  onToggle,
}: {
  item: Mission
  checked: boolean
  onToggle: (id: string) => void
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="font-semibold text-gray-900">{item.title}</div>
      <div className="mt-1 text-sm text-gray-700">{item.desc}</div>

      <div className="mt-4">
        <button
          onClick={() => onToggle(item.id)}
          className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition whitespace-nowrap
            ${checked ? 'bg-black text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
        >
          <span>{checked ? '완료' : '미완료'}</span>
          <span className="text-xs opacity-80">
            {checked ? '해제' : '체크'}
          </span>
        </button>
      </div>
    </div>
  )
}
