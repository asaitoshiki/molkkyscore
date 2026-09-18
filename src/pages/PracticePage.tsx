import { useState } from 'react'
import { Button, EmptyState, Numeral, SectionTitle } from '../components/ui'
import { PIN_NUMBERS } from '../domain/rules'
import { useAppStore } from '../store/useAppStore'

const DISTANCES = [3.5, 4, 5]

/** 狙ったスキットルに当てられたかだけを記録する簡易練習モード。 */
export const PracticePage = () => {
  const members = useAppStore((state) => state.members)
  const practices = useAppStore((state) => state.practices)
  const addPractice = useAppStore((state) => state.addPractice)
  const removePractice = useAppStore((state) => state.removePractice)

  const [memberId, setMemberId] = useState(members[0]?.id ?? '')
  const [targetPin, setTargetPin] = useState(12)
  const [distance, setDistance] = useState(3.5)
  const [results, setResults] = useState<boolean[]>([])

  const hits = results.filter(Boolean).length
  const nameOf = (id: string) => members.find((member) => member.id === id)?.name ?? '—'

  const save = () => {
    addPractice({ memberId, targetPin, distance, results })
    setResults([])
  }

  return (
    <div className="space-y-7">
      <header>
        <p className="eyebrow">PRACTICE</p>
        <h1 className="mt-1 font-serif text-2xl">的当て練習</h1>
        <p className="mt-2 text-[13px] text-muted">
          狙うスキットルと距離を決めて、命中したかだけを記録する。
        </p>
      </header>

      {members.length === 0 ? (
        <EmptyState>先にメンバーを登録してください</EmptyState>
      ) : (
        <>
          <section>
            <SectionTitle>投げる人</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {members.map((member) => (
                <Button
                  key={member.id}
                  variant={memberId === member.id ? 'primary' : 'outline'}
                  className="px-3 py-1.5 text-[13px]"
                  onClick={() => setMemberId(member.id)}
                >
                  {member.name}
                </Button>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle>狙うスキットル</SectionTitle>
            <div className="grid grid-cols-6 gap-px border border-rule bg-rule">
              {PIN_NUMBERS.map((pin) => (
                <button
                  key={pin}
                  className={`tabular py-3 font-serif text-[15px] ${
                    targetPin === pin ? 'bg-accent text-paper' : 'bg-surface text-ink'
                  }`}
                  onClick={() => setTargetPin(pin)}
                >
                  {pin}
                </button>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle>距離</SectionTitle>
            <div className="flex gap-2">
              {DISTANCES.map((value) => (
                <Button
                  key={value}
                  variant={distance === value ? 'primary' : 'outline'}
                  className="tabular px-4 py-1.5 text-[13px]"
                  onClick={() => setDistance(value)}
                >
                  {value}m
                </Button>
              ))}
            </div>
          </section>

          <section className="border-t border-rule pt-5 text-center">
            <p>
              <Numeral className="text-5xl">{hits}</Numeral>
              <span className="tabular ml-2 text-[13px] text-muted">/ {results.length} 投</span>
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setResults((current) => [...current, false])}>
                はずれ
              </Button>
              <Button onClick={() => setResults((current) => [...current, true])}>命中</Button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button
                variant="quiet"
                className="py-1.5 text-[12px]"
                disabled={results.length === 0}
                onClick={() => setResults((current) => current.slice(0, -1))}
              >
                1 投取り消す
              </Button>
              <Button
                variant="quiet"
                className="py-1.5 text-[12px] text-accent"
                disabled={results.length === 0 || memberId === ''}
                onClick={save}
              >
                保存する
              </Button>
            </div>
          </section>
        </>
      )}

      <section>
        <SectionTitle>練習の記録</SectionTitle>
        {practices.length === 0 ? (
          <EmptyState>保存した練習がここに並びます</EmptyState>
        ) : (
          <ul className="divide-y divide-rule border-y border-rule">
            {[...practices]
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((practice) => (
                <li key={practice.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px]">
                      {nameOf(practice.memberId)}
                      <span className="tabular ml-2 text-muted">
                        {practice.targetPin} 番・{practice.distance}m
                      </span>
                    </p>
                    <p className="tabular text-[12px] text-muted">
                      命中 {practice.results.filter(Boolean).length} / {practice.results.length}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Numeral className="text-xl">
                      {(
                        (practice.results.filter(Boolean).length / practice.results.length) *
                        100
                      ).toFixed(0)}
                      %
                    </Numeral>
                    <Button
                      variant="quiet"
                      className="px-2 py-0.5 text-[11px] text-alert"
                      onClick={() => removePractice(practice.id)}
                    >
                      削除
                    </Button>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  )
}
