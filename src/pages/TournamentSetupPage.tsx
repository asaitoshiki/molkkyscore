import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, SectionTitle, TextInput } from '../components/ui'
import { EntryBuilder } from '../components/EntryBuilder'
import { buildEntries, isPlayable } from '../domain/entryConfig'
import { DEFAULT_RULES } from '../domain/rules'
import type { TournamentFormat } from '../domain/types'
import { useAppStore } from '../store/useAppStore'

const FORMATS: { value: TournamentFormat; label: string; note: string }[] = [
  { value: 'roundRobin', label: '総当たり', note: '全員と 1 回ずつ対戦し、順位表で決める' },
  { value: 'knockout', label: 'トーナメント', note: '勝ち上がり式。半端な枠は不戦勝になる' },
]

export const TournamentSetupPage = () => {
  const navigate = useNavigate()
  const members = useAppStore((state) => state.members)
  const createTournament = useAppStore((state) => state.createTournament)

  const [name, setName] = useState('')
  const [format, setFormat] = useState<TournamentFormat>('roundRobin')
  const [selected, setSelected] = useState<string[]>([])

  const entries = buildEntries(selected, members)
  const ready = isPlayable(entries) && name.trim() !== ''

  return (
    <div className="space-y-7">
      <header>
        <p className="eyebrow">NEW TOURNAMENT</p>
        <h1 className="mt-1 font-serif text-2xl">大会をつくる</h1>
      </header>

      <section>
        <SectionTitle>大会名</SectionTitle>
        <TextInput
          value={name}
          placeholder="大会の名前"
          onChange={(event) => setName(event.target.value)}
        />
      </section>

      <section>
        <SectionTitle>方式</SectionTitle>
        <div className="divide-y divide-rule border-y border-rule">
          {FORMATS.map((item) => (
            <button
              key={item.value}
              className="flex w-full items-center gap-3 py-3.5 text-left"
              onClick={() => setFormat(item.value)}
            >
              <span
                className={`h-4 w-4 shrink-0 rounded-full border ${
                  format === item.value ? 'border-accent bg-accent' : 'border-rule'
                }`}
              />
              <span>
                <span className="block text-[15px]">{item.label}</span>
                <span className="block text-[12px] text-muted">{item.note}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <EntryBuilder selected={selected} onChange={setSelected} />

      <Button className="w-full py-4" disabled={!ready} onClick={() => navigate(`/tournaments/${createTournament(name, format, entries, DEFAULT_RULES)}`)}>
        {ready ? '対戦表をつくる' : '大会名と 2 組以上の参加者が必要です'}
      </Button>
    </div>
  )
}
