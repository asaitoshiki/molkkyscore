import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { Icon } from '../components/Icon'
import { Button, EmptyState, TextInput } from '../components/ui'
import { computeMemberStats } from '../domain/stats'
import { useAppStore } from '../store/useAppStore'

const percent = (value: number) => `${(value * 100).toFixed(0)}%`

/**
 * よく一緒に遊ぶプレイヤーの一覧。登録しておくと、試合の準備で名前を選ぶだけで済み、
 * 試合を重ねるごとにプレイヤーごとの成績がたまる
 */
export const MembersPage = () => {
  const members = useAppStore((state) => state.members)
  const games = useAppStore((state) => state.games)
  const memberNamed = useAppStore((state) => state.memberNamed)
  const [name, setName] = useState('')

  const players = members.filter((member) => member.listed)
  const stats = new Map(computeMemberStats(games, players).map((stat) => [stat.member.id, stat]))

  const add = () => {
    if (name.trim() === '') return
    memberNamed(name, true)
    setName('')
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow text-muted">PLAYERS</p>
        <h1 className="mt-1 font-serif text-2xl">メンバー</h1>
        <p className="mt-2 text-[13px] text-muted">
          よく遊ぶ人を登録しておくと、試合の準備で選ぶだけで済み、一人ひとりの成績がたまります。
        </p>
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

      {players.length === 0 ? (
        <EmptyState>まだ登録されたメンバーはいません</EmptyState>
      ) : (
        <ul className="divide-y divide-rule border-y border-rule">
          {players.map((member) => {
            const stat = stats.get(member.id)!
            return (
              <li key={member.id}>
                <Link to={`/members/${member.id}`} className="flex items-center gap-3 py-3">
                  <Avatar avatar={member.avatar} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px]">{member.name}</span>
                    <span className="tabular block text-[12px] text-muted">
                      {stat.games === 0
                        ? 'まだ試合がありません'
                        : `${stat.games} 試合　勝率 ${percent(stat.winRate)}　命中率 ${percent(stat.hitRate)}`}
                    </span>
                  </span>
                  <span className="text-faint">
                    <Icon name="arrowRight" size={18} />
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
