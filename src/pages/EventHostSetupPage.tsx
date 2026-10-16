import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RulesEditor } from '../components/RulesEditor'
import { Button, SectionTitle, TextInput } from '../components/ui'
import { TOURNAMENT_PRESETS } from '../domain/formats'
import { DEFAULT_RULES, clampNumber } from '../domain/rules'
import type { GameRules } from '../domain/types'
import { createEvent } from '../sync/eventChannel'
import { useAppStore } from '../store/useAppStore'

/** 電波が無いと書き込みが返ってこないため、待つのはここまでにする */
const CONNECT_TIMEOUT_MS = 10_000

/**
 * 本部として大会を開く。
 * ルールとコート数を決めると、各コートに配る QR ができる。チーム名は入れておくと
 * コートの記録係が選ぶだけで済み、本部で集計するときに名前の揺れが出ない
 */
export const EventHostSetupPage = () => {
  const navigate = useNavigate()
  const addHostedEvent = useAppStore((state) => state.addHostedEvent)

  const [name, setName] = useState('')
  const [courtCount, setCourtCount] = useState(8)
  const [teamsText, setTeamsText] = useState('')
  const [rules, setRules] = useState<GameRules>({ ...DEFAULT_RULES, gameCount: 2 })
  const [status, setStatus] = useState<'idle' | 'creating' | 'failed'>('idle')

  const teams = [...new Set(teamsText.split('\n').map((line) => line.trim()))].filter(
    (line) => line !== '',
  )

  const create = async () => {
    setStatus('creating')
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), CONNECT_TIMEOUT_MS),
    )
    const eventId = await Promise.race([createEvent(name, rules, teams, courtCount), timeout]).catch(
      () => null,
    )
    if (eventId === null) return setStatus('failed')
    addHostedEvent({ eventId, name: name.trim(), createdAt: Date.now() })
    navigate(`/e/${eventId}/hq`, { replace: true })
  }

  return (
    <div className="space-y-7">
      <header>
        <p className="eyebrow text-muted">HEADQUARTERS</p>
        <h1 className="mt-1 font-serif text-2xl">本部で大会を開く</h1>
        <p className="mt-2 text-[13px] text-muted">
          各コートの選手が自分のスマホで記録し、終わった試合のスコアシートが本部に届きます。
          コート側はアプリがなくても、QR を読み取るだけで参加できます。
        </p>
      </header>

      <section>
        <SectionTitle>大会名</SectionTitle>
        <TextInput
          value={name}
          maxLength={100}
          placeholder="例：第 3 回 ○○モルック大会"
          onChange={(event) => setName(event.target.value)}
        />
      </section>

      <section>
        <SectionTitle>コート数</SectionTitle>
        <div className="flex items-center gap-2">
          <span className="w-20">
            <TextInput
              key={courtCount}
              type="number"
              inputMode="numeric"
              className="tabular text-right"
              defaultValue={courtCount}
              onBlur={(event) => setCourtCount(clampNumber(event.target.value, 1, 100))}
            />
          </span>
          <span className="text-[13px] text-muted">面</span>
        </div>
      </section>

      <section>
        <SectionTitle>試合ルール</SectionTitle>
        <RulesEditor rules={rules} presets={TOURNAMENT_PRESETS} onChange={setRules} />
      </section>

      <section>
        <SectionTitle>参加チーム（任意）</SectionTitle>
        <textarea
          className="h-36 w-full rounded border border-rule bg-surface px-3 py-2.5 text-[15px] outline-none placeholder:text-faint focus:border-accent"
          placeholder={'1 行に 1 チーム\nひまわり\nたんぽぽ'}
          value={teamsText}
          onChange={(event) => setTeamsText(event.target.value)}
        />
        <p className="mt-1 text-[12px] text-muted">
          {teams.length} チーム。入れておくと、コートでは一覧から選べます。
        </p>
      </section>

      {status === 'failed' && (
        <p className="text-[13px] text-alert">
          インターネットにつながらないため、大会を開けませんでした。電波のよい場所でもう一度お試しください。
        </p>
      )}

      <Button
        className="w-full py-4"
        disabled={name.trim() === '' || status === 'creating'}
        onClick={create}
      >
        {status === 'creating' ? '準備しています…' : '大会を開く'}
      </Button>
    </div>
  )
}
