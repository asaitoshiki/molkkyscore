import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppBar } from '../components/AppBar'
import { Icon } from '../components/Icon'
import { Avatar } from '../components/Avatar'
import { MemberField } from '../components/MemberField'
import { OrderList } from '../components/OrderList'
import { RulesEditor } from '../components/RulesEditor'
import { CASUAL_PRESETS } from '../domain/formats'
import { Button, TextInput } from '../components/ui'
import { newId } from '../domain/id'
import { moveItem } from '../domain/order'
import { DEFAULT_RULES, clampHandicap } from '../domain/rules'
import type { Entry } from '../domain/types'
import { useAppStore } from '../store/useAppStore'

/** 公式のスコアシートが 4 チーム分までなので、それに合わせる */
const MAX_TEAMS = 4

/** 「チーム◯」のうち、まだ使っていない一番小さい番号の名前 */
const nextTeamName = (names: string[]) => {
  const number = Array.from({ length: names.length + 1 }, (_, index) => index + 1).find(
    (candidate) => !names.includes(`チーム${candidate}`),
  )!
  return `チーム${number}`
}

/**
 * 参加するチームを 1 画面で決める。
 * 追加・名前・投げる順番・ハンデを同じ並びの上で扱い、そのまま試合を始められる。
 */
export const GameSetupPage = () => {
  const navigate = useNavigate()
  const members = useAppStore((state) => state.members)
  const memberNamed = useAppStore((state) => state.memberNamed)
  const createGame = useAppStore((state) => state.createGame)

  const [names, setNames] = useState(['チーム1', 'チーム2'])
  // 力の差を埋めるための持ち点。並びは names と対応する
  const [handicaps, setHandicaps] = useState([0, 0])
  // チームで投げるメンバーの名前。入れると試合中に次に投げる人が出る。並びは names と対応する
  const [rosters, setRosters] = useState<string[][]>([[], []])
  const [rules, setRules] = useState(DEFAULT_RULES)

  const add = () => {
    setNames([...names, nextTeamName(names)])
    setHandicaps([...handicaps, 0])
    setRosters([...rosters, []])
  }

  const remove = (index: number) => {
    setNames(names.filter((_, position) => position !== index))
    setHandicaps(handicaps.filter((_, position) => position !== index))
    setRosters(rosters.filter((_, position) => position !== index))
  }

  // 登録メンバーを選んだら、まだ手を付けていない「チーム◯」の枠に入れる。空きがなければ足す。
  // もう入っている人を選んだら外す
  const openSlot = names.findIndex(
    (item, index) => /^チーム\d+$/.test(item) && rosters[index].length === 0,
  )
  const full = openSlot === -1 && names.length >= MAX_TEAMS
  const togglePlayer = (name: string) => {
    const index = names.indexOf(name)
    if (index !== -1) return names.length > 1 && remove(index)
    if (openSlot !== -1) return rename(openSlot, name)
    setNames([...names, name])
    setHandicaps([...handicaps, 0])
    setRosters([...rosters, []])
  }

  const players = members.filter((member) => member.listed)

  const setRoster = (index: number, roster: string[]) =>
    setRosters(rosters.map((item, position) => (position === index ? roster : item)))

  const rename = (index: number, name: string) =>
    setNames(names.map((item, position) => (position === index ? name : item)))

  const start = () => {
    // 同じ名前のメンバーがいれば使い回し、いなければ登録する。
    // メンバーを入れていないチームは、チーム名を 1 人のメンバーとして記録する
    // メンバーとして入れた人はプレイヤーの一覧に出し、チーム名だけのときは出さない
    const memberIdsOf = (index: number) =>
      rosters[index].length > 0
        ? rosters[index].map((member) => memberNamed(member, true).id)
        : [memberNamed(names[index], false).id]
    const entries: Entry[] = names.map((name, index) => ({
      id: newId(),
      name,
      memberIds: memberIdsOf(index),
      handicap: handicaps[index],
    }))
    navigate(`/games/${createGame(entries, rules, null)}`, { replace: true })
  }

  const filled = names.every((name) => name.trim() !== '')

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-paper">
      <AppBar
        title="新しい試合"
        left={
          <button onClick={() => navigate('/')} aria-label="戻る">
            <Icon name="chevronLeft" size={22} />
          </button>
        }
      />

      <section className="flex flex-1 flex-col px-5 pt-6 pb-8">
        <div className="flex items-baseline justify-between">
          <h1 className="font-serif text-2xl">参加チーム</h1>
          <span className="tabular text-[12px] text-muted">
            {names.length} / {MAX_TEAMS}
          </span>
        </div>
        <p className="mt-1 mb-5 text-[12px] text-muted">
          上から順に投げます。取っ手で順番を入れ替え、名前は試合中でも直せます。
        </p>

        {/* 登録したメンバーは押すだけで参加チームに入る。もう一度押すと外れる */}
        {players.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-1.5">
            {players.map((player) => {
              const joined = names.includes(player.name)
              return (
                <button
                  key={player.id}
                  disabled={!joined && full}
                  className={`flex items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-[13px] disabled:opacity-35 ${
                    joined ? 'border-accent bg-accent-soft' : 'border-rule bg-surface'
                  }`}
                  onClick={() => togglePlayer(player.name)}
                >
                  <Avatar avatar={player.avatar} size={24} />
                  {player.name}
                </button>
              )
            })}
          </div>
        )}

        <OrderList
          items={names}
          onMove={(from, to) => {
            // 名前・ハンデ・メンバーは同じ位置で対応しているので、そろえて動かす
            setNames(moveItem(names, from, to))
            setHandicaps(moveItem(handicaps, from, to))
            setRosters(moveItem(rosters, from, to))
          }}
          renderItem={(name, index) => (
            <>
              <input
                aria-label={`${index + 1} 番目に投げるチームの名前`}
                className="min-w-0 flex-1 border-b border-transparent bg-transparent py-1 text-[15px] outline-none placeholder:text-faint focus:border-accent focus-visible:outline-none"
                placeholder="チーム名"
                value={name}
                onChange={(event) => rename(index, event.target.value)}
              />
              {names.length > 1 && (
                <button
                  aria-label={`${name} を外す`}
                  className="shrink-0 p-1 text-faint"
                  onClick={() => remove(index)}
                >
                  <Icon name="close" size={16} />
                </button>
              )}
            </>
          )}
        />

        <button
          className="mt-3 flex items-center gap-2 self-start py-1 text-[14px] text-accent disabled:opacity-35"
          disabled={names.length >= MAX_TEAMS}
          onClick={add}
        >
          <Icon name="plus" size={16} />
          チームを追加
        </button>

        {/* 大人数のチームでも次に投げる人が分かるよう、メンバーを入れられる。入れなくても始められる */}
        <details className="mt-6 border-t border-rule pt-3">
          <summary className="eyebrow cursor-pointer text-muted">チームのメンバーを入れる</summary>
          <p className="mt-2 text-[12px] text-muted">
            入れた順に交代で投げます。試合中は、次に投げる人が画面に出ます。
          </p>
          <div className="mt-3 space-y-4">
            {names.map((name, index) => (
              <div key={index}>
                <p className="text-[14px]">{name}</p>
                {rosters[index].length > 0 && (
                  <ol className="mt-1.5 flex flex-wrap gap-1.5">
                    {rosters[index].map((member, position) => (
                      <li key={member}>
                        <button
                          aria-label={`${member} を外す`}
                          className="flex items-center gap-1.5 rounded-full border border-rule bg-surface px-3 py-1 text-[12px]"
                          onClick={() => setRoster(index, rosters[index].filter((item) => item !== member))}
                        >
                          <span className="tabular text-faint">{position + 1}</span>
                          {member}
                          <span className="text-faint">
                            <Icon name="close" size={12} />
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
                <MemberField
                  onAdd={(member) => setRoster(index, [...new Set([...rosters[index], member])])}
                />
              </div>
            ))}
          </div>
        </details>

        <section className="mt-6 border-t border-rule pt-3">
          <h2 className="eyebrow mb-3 text-muted">試合ルール</h2>
          <RulesEditor rules={rules} presets={CASUAL_PRESETS} onChange={setRules} />
        </section>

        <details className="mt-6 border-t border-rule pt-3">
          <summary className="eyebrow cursor-pointer text-muted">ハンデをつける</summary>
          <p className="mt-2 text-[12px] text-muted">力の差があるときは、持ち点から始められます。</p>
          <div className="mt-3 space-y-2">
            {names.map((name, index) => (
              <label key={index} className="flex items-center justify-between gap-3 text-[14px]">
                <span className="min-w-0 truncate">{name}</span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <TextInput
                    type="number"
                    min={0}
                    max={rules.targetScore - 1}
                    className="tabular w-16 text-right"
                    value={handicaps[index]}
                    onChange={(event) =>
                      setHandicaps(
                        handicaps.map((value, position) =>
                          position === index ? clampHandicap(event.target.value, rules) : value,
                        ),
                      )
                    }
                  />
                  <span className="text-[12px] whitespace-nowrap text-muted">点から</span>
                </span>
              </label>
            ))}
          </div>
        </details>

        {/* 開始ボタンは親指の届く下端に寄せる。内容が多くても間は空ける */}
        <div className="min-h-8 flex-1" />
        <Button className="w-full py-3.5" disabled={!filled} onClick={start}>
          試合を始める
        </Button>
      </section>
    </div>
  )
}
