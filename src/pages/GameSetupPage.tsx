import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppBar } from '../components/AppBar'
import { Icon } from '../components/Icon'
import { OrderList } from '../components/OrderList'
import { Button, TextInput } from '../components/ui'
import { newId } from '../domain/id'
import { DEFAULT_RULES, clampHandicap } from '../domain/rules'
import type { Entry } from '../domain/types'
import { useAppStore } from '../store/useAppStore'

const TEAM_COUNTS = [1, 2, 3, 4]

/** 参加するチームを 3 段階で決める。人数 → 名前 → 投げる順番の順に確定させる。 */
export const GameSetupPage = () => {
  const navigate = useNavigate()
  const members = useAppStore((state) => state.members)
  const addMember = useAppStore((state) => state.addMember)
  const createGame = useAppStore((state) => state.createGame)

  const [step, setStep] = useState(1)
  const [names, setNames] = useState<string[]>([])
  // 力の差を埋めるための持ち点。並びは names と対応する
  const [handicaps, setHandicaps] = useState<number[]>([])

  const chooseCount = (count: number) => {
    setNames(Array.from({ length: count }, (_, index) => `チーム${index + 1}`))
    setHandicaps(Array.from({ length: count }, () => 0))
    setStep(2)
  }

  const start = () => {
    // 同じ名前のメンバーがいれば使い回し、いなければ登録する
    const entries: Entry[] = names.map((name, index) => {
      const member = members.find((item) => item.name === name) ?? addMember(name)
      return { id: newId(), name, memberIds: [member.id], handicap: handicaps[index] }
    })
    navigate(`/games/${createGame(entries, DEFAULT_RULES, null)}`, { replace: true })
  }

  const back = () => (step === 1 ? navigate('/') : setStep(step - 1))
  const filled = names.every((name) => name.trim() !== '')

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-paper">
      <AppBar
        title={`STEP ${step}`}
        left={
          <button onClick={back} aria-label="戻る">
            <Icon name="chevronLeft" size={22} />
          </button>
        }
      />

      {step === 1 && (
        <section className="px-5 py-8">
          <p className="mb-6 text-center text-[15px]">チーム数を選んでください</p>
          <div className="grid grid-cols-2 gap-3">
            {TEAM_COUNTS.map((count) => (
              <Button key={count} variant="outline" className="py-4" onClick={() => chooseCount(count)}>
                {count} チーム
              </Button>
            ))}
          </div>
          <p className="mt-6 text-center text-[12px] text-muted">
            1 人で遊ぶときも、チームで遊ぶときも同じ形で記録できます
          </p>
        </section>
      )}

      {step === 2 && (
        <section className="flex flex-1 flex-col px-5 py-8">
          <p className="mb-6 text-center text-[15px]">チーム名を入力してください</p>
          <div className="space-y-4">
            {names.map((name, index) => (
              <label key={index} className="block">
                <span className="eyebrow text-muted">チーム{index + 1}</span>
                <TextInput
                  className="mt-1"
                  value={name}
                  onChange={(event) =>
                    setNames(names.map((item, position) => (position === index ? event.target.value : item)))
                  }
                />
              </label>
            ))}
          </div>
          <details className="mt-6 border-t border-rule pt-3">
            <summary className="eyebrow cursor-pointer text-muted">ハンデをつける</summary>
            <p className="mt-2 text-[12px] text-muted">
              力の差があるときは、持ち点から始められます。
            </p>
            <div className="mt-3 space-y-2">
              {names.map((name, index) => (
                <label key={index} className="flex items-center justify-between gap-3 text-[14px]">
                  <span className="min-w-0 truncate">{name}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <TextInput
                      type="number"
                      min={0}
                      max={DEFAULT_RULES.targetScore - 1}
                      className="tabular w-16 text-right"
                      value={handicaps[index]}
                      onChange={(event) =>
                        setHandicaps(
                          handicaps.map((value, position) =>
                            position === index ? clampHandicap(event.target.value) : value,
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

          <Button className="mt-8 w-full py-3.5" disabled={!filled} onClick={() => setStep(3)}>
            次へ
          </Button>
        </section>
      )}

      {step === 3 && (
        <section className="flex flex-1 flex-col px-5 py-8">
          <p className="text-center text-[15px]">投げる順番を決めてください</p>
          <p className="mt-1 mb-6 text-center text-[12px] text-muted">
            ＊右の取っ手を長押しすると上下に動かせます
          </p>
          <OrderList
            items={names}
            onChange={(reordered) => {
              setHandicaps(reordered.map((name) => handicaps[names.indexOf(name)]))
              setNames(reordered)
            }}
          />
          <Button className="mt-8 w-full py-3.5" onClick={start}>
            ゲーム開始
          </Button>
        </section>
      )}
    </div>
  )
}
