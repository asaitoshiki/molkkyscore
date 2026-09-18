import { useState } from 'react'
import { Button, EmptyState, Numeral, TextInput } from '../components/ui'
import { computeMemberStats } from '../domain/stats'
import { useAppStore } from '../store/useAppStore'

export const MembersPage = () => {
  const members = useAppStore((state) => state.members)
  const games = useAppStore((state) => state.games)
  const addMember = useAppStore((state) => state.addMember)
  const renameMember = useAppStore((state) => state.renameMember)
  const removeMember = useAppStore((state) => state.removeMember)
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<string | null>(null)

  const stats = new Map(computeMemberStats(games, members).map((stat) => [stat.member.id, stat]))

  const add = () => {
    const trimmed = name.trim()
    if (trimmed === '') return
    addMember(trimmed)
    setName('')
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">MEMBERS</p>
        <h1 className="mt-1 font-serif text-2xl">メンバー</h1>
      </header>

      <div className="flex gap-2">
        <TextInput
          value={name}
          placeholder="名前を追加"
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && add()}
        />
        <Button className="shrink-0 px-4 py-2.5" onClick={add}>
          追加
        </Button>
      </div>

      {members.length === 0 ? (
        <EmptyState>よく遊ぶ人を登録しておくと、試合の準備が早くなります</EmptyState>
      ) : (
        <ul className="divide-y divide-rule border-y border-rule">
          {members.map((member) => {
            const stat = stats.get(member.id)!
            return (
              <li key={member.id} className="flex items-center gap-3 py-3">
                {editing === member.id ? (
                  <TextInput
                    autoFocus
                    defaultValue={member.name}
                    onBlur={(event) => {
                      renameMember(member.id, event.target.value)
                      setEditing(null)
                    }}
                    onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
                  />
                ) : (
                  <button className="flex-1 text-left" onClick={() => setEditing(member.id)}>
                    <span className="block text-[15px]">{member.name}</span>
                    <span className="tabular block text-[12px] text-muted">
                      {stat.games} 試合　{stat.wins} 勝　勝率{' '}
                      <Numeral>{(stat.winRate * 100).toFixed(0)}</Numeral>%
                    </span>
                  </button>
                )}
                <Button
                  variant="danger"
                  className="px-2 py-1 text-[12px]"
                  onClick={() => removeMember(member.id)}
                >
                  削除
                </Button>
              </li>
            )
          })}
        </ul>
      )}
      <p className="text-[11px] text-faint">名前をタップすると変更できます。</p>
    </div>
  )
}
