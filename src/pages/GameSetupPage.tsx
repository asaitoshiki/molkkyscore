import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppBar } from '../components/AppBar'
import { Icon } from '../components/Icon'
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
  const addMember = useAppStore((state) => state.addMember)
  const createGame = useAppStore((state) => state.createGame)

  const [names, setNames] = useState(['チーム1', 'チーム2'])
  // 力の差を埋めるための持ち点。並びは names と対応する
  const [handicaps, setHandicaps] = useState([0, 0])
  const [rules, setRules] = useState(DEFAULT_RULES)

  const add = () => {
    setNames([...names, nextTeamName(names)])
    setHandicaps([...handicaps, 0])
  }

  const remove = (index: number) => {
    setNames(names.filter((_, position) => position !== index))
    setHandicaps(handicaps.filter((_, position) => position !== index))
  }

  const rename = (index: number, name: string) =>
    setNames(names.map((item, position) => (position === index ? name : item)))

  const start = () => {
    // 同じ名前のメンバーがいれば使い回し、いなければ登録する
    const entries: Entry[] = names.map((name, index) => {
      const member = members.find((item) => item.name === name) ?? addMember(name)
      return { id: newId(), name, memberIds: [member.id], handicap: handicaps[index] }
    })
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

        <OrderList
          items={names}
          onMove={(from, to) => {
            // 名前とハンデは同じ位置で対応しているので、そろえて動かす
            setNames(moveItem(names, from, to))
            setHandicaps(moveItem(handicaps, from, to))
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
