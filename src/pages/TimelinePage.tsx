import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { PinPad } from '../components/PinPad'
import { Button, EmptyState, Numeral } from '../components/ui'
import { pointsOf } from '../domain/rules'
import { buildTimeline } from '../domain/timeline'
import { useAppStore } from '../store/useAppStore'

/** 投球を 1 件ずつ見直し、訂正するか、その時点まで戻すための画面。 */
export const TimelinePage = () => {
  const { gameId } = useParams()
  const game = useAppStore((state) => state.games.find((item) => item.id === gameId))!
  const members = useAppStore((state) => state.members)
  const editThrow = useAppStore((state) => state.editThrow)
  const rewindTo = useAppStore((state) => state.rewindTo)

  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [draft, setDraft] = useState<number[]>([])

  const timeline = buildTimeline(game).reverse()
  const entryName = (entryId: string) => game.entries.find((entry) => entry.id === entryId)!.name
  const memberName = (memberId: string) =>
    members.find((member) => member.id === memberId)?.name ?? '—'
  const isTeam = (entryId: string) =>
    game.entries.find((entry) => entry.id === entryId)!.memberIds.length > 1

  const open = (index: number, pins: number[]) => {
    setOpenIndex(openIndex === index ? null : index)
    setDraft(pins)
  }

  const save = (index: number) => {
    editThrow(game.id, index, draft)
    setOpenIndex(null)
  }

  return (
    <div className="mx-auto min-h-full max-w-md bg-paper">
      <header className="safe-top flex items-center justify-between border-b border-rule px-5 py-3">
        <Link to={`/games/${game.id}`} className="text-muted" aria-label="試合に戻る">
          <Icon name="arrowLeft" size={20} />
        </Link>
        <span className="eyebrow">TIMELINE</span>
        <span className="w-5" />
      </header>

      <div className="px-5 pt-4 pb-10">
        <p className="mb-4 text-[12px] text-muted">
          投球をタップすると、倒したスキットルを直したり、その時点まで戻したりできます。
        </p>

        {timeline.length === 0 ? (
          <EmptyState>まだ投球がありません</EmptyState>
        ) : (
          <ul className="divide-y divide-rule border-y border-rule">
            {timeline.map((item) => (
              <li key={item.index}>
                <button
                  className="flex w-full items-baseline gap-3 py-3 text-left"
                  onClick={() => open(item.index, item.record.pins)}
                >
                  <span className="tabular w-7 text-[11px] text-faint">{item.index + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px]">
                      {entryName(item.record.entryId)}
                      {isTeam(item.record.entryId) && (
                        <span className="ml-2 text-[12px] text-muted">
                          {memberName(item.record.memberId)}
                        </span>
                      )}
                    </span>
                    <span className="tabular flex gap-2 text-[11px] text-faint">
                      <span>{item.round} 投目</span>
                      <span>{item.record.pins.length === 0 ? 'ミス' : item.record.pins.join('・')}</span>
                    </span>
                  </span>
                  <Numeral className="w-10 text-right text-base">+{item.points}</Numeral>
                  <Numeral className="w-10 text-right text-base text-accent">
                    {item.totalAfter}
                  </Numeral>
                </button>

                {openIndex === item.index && (
                  <div className="space-y-3 pb-4">
                    <PinPad
                      selected={draft}
                      onToggle={(pin) =>
                        setDraft((current) =>
                          current.includes(pin)
                            ? current.filter((value) => value !== pin)
                            : [...current, pin],
                        )
                      }
                    />
                    <p className="text-center text-[12px] text-muted">
                      直したあとの得点　<Numeral className="text-lg">{pointsOf(draft)}</Numeral> 点
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={() => setDraft([])}>
                        ミスにする
                      </Button>
                      <Button onClick={() => save(item.index)}>この内容で直す</Button>
                    </div>
                    <Button
                      variant="danger"
                      className="w-full py-2 text-[12px]"
                      onClick={() => {
                        rewindTo(game.id, item.index)
                        setOpenIndex(null)
                      }}
                    >
                      この投より後をすべて取り消す
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
