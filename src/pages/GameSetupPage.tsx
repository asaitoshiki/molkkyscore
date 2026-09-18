import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, TextInput } from '../components/ui'
import { EntryBuilder } from '../components/EntryBuilder'
import { buildEntries, emptyConfig, isPlayable } from '../domain/entryConfig'
import { DEFAULT_RULES } from '../domain/rules'
import { useAppStore } from '../store/useAppStore'

const RULE_FIELDS = [
  ['targetScore', '目標点'],
  ['penaltyScore', '超過したとき戻る点'],
  ['maxMisses', '失格になる連続ミス数'],
] as const

export const GameSetupPage = () => {
  const navigate = useNavigate()
  const members = useAppStore((state) => state.members)
  const createGame = useAppStore((state) => state.createGame)

  const [config, setConfig] = useState(emptyConfig)
  const [rules, setRules] = useState(DEFAULT_RULES)

  const entries = buildEntries(config, members)
  const ready = isPlayable(entries)

  return (
    <div className="space-y-7">
      <header>
        <p className="eyebrow">NEW GAME</p>
        <h1 className="mt-1 font-serif text-2xl">試合の設定</h1>
      </header>

      <EntryBuilder config={config} onChange={setConfig} />

      <details className="border-t border-rule pt-3">
        <summary className="eyebrow cursor-pointer">ルールを変える</summary>
        <div className="mt-4 space-y-3">
          {RULE_FIELDS.map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-3 text-[14px]">
              {label}
              <TextInput
                type="number"
                className="tabular w-20 text-right"
                value={rules[key]}
                onChange={(event) =>
                  setRules((current) => ({ ...current, [key]: Number(event.target.value) }))
                }
              />
            </label>
          ))}
        </div>
      </details>

      <Button
        className="w-full py-4"
        disabled={!ready}
        onClick={() => navigate(`/games/${createGame(entries, rules, null)}`)}
      >
        {ready ? '試合をはじめる' : '2 組以上そろうと開始できます'}
      </Button>
    </div>
  )
}
