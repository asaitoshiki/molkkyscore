import { useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { MissingRecord } from '../components/MissingRecord'
import { PinHitChart } from '../components/PinHitChart'
import { Button, Numeral, SectionTitle, TextInput } from '../components/ui'
import { AVATAR_COLORS, clampMark } from '../domain/avatar'
import { computeGameState } from '../domain/game'
import { computeMemberStats } from '../domain/stats'
import type { Member } from '../domain/types'
import { useAppStore } from '../store/useAppStore'

const percent = (value: number) => `${(value * 100).toFixed(0)}%`

/** 時間切れなどで勝者がいないゲームは引き分け */
const resultLabel = (winnerId: string | null, entryId: string) => {
  if (winnerId === null) return '引き分け'
  return winnerId === entryId ? '勝ち' : '負け'
}

/** 一覧から外したプレイヤーの URL を開いても、白い画面にしない */
export const PlayerPage = () => {
  const memberId = useParams().memberId!
  const member = useAppStore((state) => state.members.find((item) => item.id === memberId))
  if (member === undefined || !member.listed) return <MissingRecord label="このメンバー" to="/members" />
  return <PlayerView member={member} />
}

/**
 * プレイヤー 1 人のページ。アバターと名前を直し、これまでの成績と最近の試合を見る。
 * 成績は記録した投球から毎回計算するので、試合を重ねるほど増えていく
 */
const PlayerView = ({ member }: { member: Member }) => {
  const navigate = useNavigate()
  const games = useAppStore((state) => state.games)
  const updateMember = useAppStore((state) => state.updateMember)
  const unlistMember = useAppStore((state) => state.unlistMember)

  const [stat] = computeMemberStats(games, [member])
  const recent = games
    .filter((game) => game.finishedAt !== null)
    .filter((game) => game.entries.some((entry) => entry.memberIds.includes(member.id)))
    .sort((a, b) => b.finishedAt! - a.finishedAt!)
    .slice(0, 10)

  return (
    <div className="space-y-7">
      <header className="flex items-center gap-4">
        <Avatar avatar={member.avatar} size={64} />
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-muted">PLAYER</p>
          <TextInput
            key={member.name}
            aria-label="名前"
            defaultValue={member.name}
            className="mt-1 font-serif text-xl"
            // 空のまま離れたときは元の名前を残す
            onBlur={(event) =>
              event.target.value.trim() !== '' &&
              updateMember(member.id, { name: event.target.value.trim() })
            }
          />
        </div>
      </header>

      <section>
        <SectionTitle>アバター</SectionTitle>
        <div className="flex items-center gap-3">
          <span className="w-16 shrink-0">
            <TextInput
              key={member.avatar.mark}
              aria-label="アバターの文字"
              defaultValue={member.avatar.mark}
              className="text-center"
              // 2 文字まで。空にしたら名前の頭文字に戻す
              onBlur={(event) =>
                updateMember(member.id, {
                  avatar: { ...member.avatar, mark: clampMark(event.target.value) || clampMark(member.name).slice(0, 1) },
                })
              }
            />
          </span>
          <span className="text-[12px] text-muted">丸の中の文字（2 文字まで。記号や絵文字も使えます）</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {AVATAR_COLORS.map((color) => (
            <button
              key={color}
              aria-label={`色 ${color}`}
              className={`h-9 w-9 rounded-full border-2 ${
                member.avatar.color === color ? 'border-ink' : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => updateMember(member.id, { avatar: { ...member.avatar, color } })}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>成績</SectionTitle>
        {stat.games === 0 ? (
          <p className="text-[13px] text-muted">試合でこの人を選ぶと、ここに成績がたまっていきます。</p>
        ) : (
          <div className="space-y-6">
            <dl className="grid grid-cols-3 gap-x-4 gap-y-4">
              {(
                [
                  ['勝率', percent(stat.winRate), `${stat.wins} / ${stat.games}`],
                  ['命中率', percent(stat.hitRate), '1 本以上'],
                  ['平均得点', stat.averagePoints.toFixed(1), '点/投'],
                  ['上がり', `${stat.finishes}`, '回決めた'],
                  ['総投数', `${stat.throws}`, '投'],
                  ['ミス', `${stat.misses}`, '回'],
                  ['1 本倒し', `${stat.singleHits}`, '回'],
                  ['複数本', `${stat.multiHits}`, '回'],
                  ['50 点超過', `${stat.overshoots}`, '回'],
                ] as const
              ).map(([label, value, unit]) => (
                <div key={label}>
                  <dt className="text-[11px] text-muted">{label}</dt>
                  <dd>
                    <Numeral className="text-xl">{value}</Numeral>
                    <span className="ml-1 text-[11px] text-muted">{unit}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <PinHitChart hits={stat.pinHits} />
          </div>
        )}
      </section>

      {recent.length > 0 && (
        <section>
          <SectionTitle>最近の試合</SectionTitle>
          <ul className="divide-y divide-rule border-y border-rule">
            {recent.map((game) => {
              const winnerId = computeGameState(game).winnerEntryId
              const mine = game.entries.find((entry) => entry.memberIds.includes(member.id))!
              const result = resultLabel(winnerId, mine.id)
              return (
                <li key={game.id}>
                  <button
                    className="flex w-full items-center justify-between gap-3 py-3 text-left"
                    onClick={() => navigate(`/games/${game.id}`)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[14px]">
                        {game.entries.map((entry) => entry.name).join(' 対 ')}
                      </span>
                      <span className="tabular block text-[11px] text-faint">
                        {new Date(game.finishedAt!).toLocaleDateString('ja-JP')}
                      </span>
                    </span>
                    <span className={`shrink-0 text-[13px] ${result === '勝ち' ? 'text-accent' : 'text-muted'}`}>
                      {result}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <Button
        variant="danger"
        className="w-full py-2 text-[12px]"
        onClick={() => {
          if (!window.confirm(`${member.name} をメンバーの一覧から外しますか？これまでの試合の記録は残ります。`)) return
          unlistMember(member.id)
          navigate('/members')
        }}
      >
        メンバーの一覧から外す
      </Button>
    </div>
  )
}
