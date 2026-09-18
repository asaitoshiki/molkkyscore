import { useState } from 'react'
import { Button, SectionTitle, TextInput } from './ui'
import { TEAM_LABELS, teamIndexOf } from '../domain/entryConfig'
import type { EntryConfig } from '../domain/entryConfig'
import { useAppStore } from '../store/useAppStore'

type Props = {
  config: EntryConfig
  onChange: (config: EntryConfig) => void
  maxTeams?: number
}

export const EntryBuilder = ({ config, onChange, maxTeams = 4 }: Props) => {
  const members = useAppStore((state) => state.members)
  const addMember = useAppStore((state) => state.addMember)
  const [newName, setNewName] = useState('')

  const toggle = (memberId: string) =>
    onChange({
      ...config,
      selected: config.selected.includes(memberId)
        ? config.selected.filter((id) => id !== memberId)
        : [...config.selected, memberId],
    })

  const add = () => {
    const name = newName.trim()
    if (name === '') return
    const member = addMember(name)
    onChange({ ...config, selected: [...config.selected, member.id] })
    setNewName('')
  }

  return (
    <>
      <section>
        <SectionTitle>形式</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {(['solo', 'team'] as const).map((mode) => (
            <Button
              key={mode}
              variant={config.mode === mode ? 'primary' : 'outline'}
              onClick={() => onChange({ ...config, mode })}
            >
              {mode === 'solo' ? '個人戦' : 'チーム戦'}
            </Button>
          ))}
        </div>
        {config.mode === 'team' && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[13px] text-muted">チーム数</span>
            {Array.from({ length: maxTeams - 1 }, (_, index) => index + 2).map((count) => (
              <Button
                key={count}
                variant={config.teamCount === count ? 'primary' : 'outline'}
                className="tabular px-3 py-1.5 text-[13px]"
                onClick={() => onChange({ ...config, teamCount: count })}
              >
                {count}
              </Button>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle>参加者　{config.selected.length} 人</SectionTitle>
        <div className="mb-4 flex gap-2">
          <TextInput
            value={newName}
            placeholder="名前を入力して追加"
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && add()}
          />
          <Button className="shrink-0 px-4 py-2.5" onClick={add}>
            追加
          </Button>
        </div>
        <ul className="divide-y divide-rule border-y border-rule">
          {members.map((member) => {
            const picked = config.selected.includes(member.id)
            return (
              <li key={member.id} className="flex items-center justify-between gap-3 py-2.5">
                <button className="flex flex-1 items-center gap-3 text-left" onClick={() => toggle(member.id)}>
                  <span
                    className={`h-4 w-4 shrink-0 rounded-full border ${
                      picked ? 'border-accent bg-accent' : 'border-rule'
                    }`}
                  />
                  <span className={`text-[15px] ${picked ? '' : 'text-muted'}`}>{member.name}</span>
                </button>
                {picked && config.mode === 'team' && (
                  <div className="flex flex-wrap justify-end gap-1">
                    {TEAM_LABELS.slice(0, config.teamCount).map((label, team) => (
                      <button
                        key={label}
                        className={`h-7 w-7 rounded border text-[12px] ${
                          teamIndexOf(config, member.id) === team
                            ? 'border-accent bg-accent text-paper'
                            : 'border-rule text-muted'
                        }`}
                        onClick={() =>
                          onChange({ ...config, teamOf: { ...config.teamOf, [member.id]: team } })
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </>
  )
}
