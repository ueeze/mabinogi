'use client'

export type Character = { id: string; name: string }
export type ContentItem = { id: string; title: string; desc: string }

export default function ContentCard({
  item,
  characters,
  checkedMap,
  onToggle,
}: {
  item: ContentItem
  characters: Character[]
  checkedMap: Record<string, Record<string, boolean>>
  onToggle: (charId: string, contentId: string) => void
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="font-semibold text-gray-900">{item.title}</div>
      <div className="mt-1 text-sm text-gray-700">{item.desc}</div>

      <div className="mt-4 space-y-2">
        {characters.map((c) => {
          const checked = !!checkedMap[c.id]?.[item.id]
          return (
            <button
              key={c.id}
              onClick={() => onToggle(c.id, item.id)}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition
                ${checked ? 'bg-black text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
            >
              <span>{c.name}</span>
              <span className="text-xs opacity-80">
                {checked ? '완료' : '미완료'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
