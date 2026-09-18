import { useState } from 'react'
import { Icon } from './Icon'
import { Button, SectionTitle, TextInput } from './ui'
import { newId } from '../domain/id'
import type { TeamDraft } from '../domain/teamDraft'
import { useAppStore } from '../store/useAppStore'

/**
 * 大会用のチーム編成。チーム名とメンバーを登録し、誰が投げたかを記録できるようにする。
 * 同じ名前のメンバーが既にいれば使い回し、いなければ新しく登録する。
 */
export const TeamBuilder = ({
  teams,
  onChange,
}: {
  teams: TeamDraft[]
  onChange: (teams: TeamDraft[]) => void
}) => {
  const members = useAppStore((state) => state.members)
  const addMember = useAppStore((state) => state.addMember)

  const update = (key: string, patch: Partial<TeamDraft>) =>
    onChange(teams.map((team) => (team.key === key ? { ...team, ...patch } : team)))

  const addMemberTo = (key: string, rawName: string) => {
    const name = rawName.trim()
    if (name === '') return
    const member = members.find((item) => item.name === name) ?? addMember(name)
    const team = teams.find((item) => item.key === key)!
    update(key, { memberIds: [...new Set([...team.memberIds, member.id])] })
  }

  return (
    <section>
      <SectionTitle>参加チーム　{teams.length} 組</SectionTitle>
      <div className="space-y-5">
        {teams.map((team, index) => (
          <div key={team.key} className="border-t border-rule pt-3">
            <div className="flex items-center gap-2">
              <TextInput
                value={team.name}
                placeholder={`チーム${index + 1}`}
                onChange={(event) => update(team.key, { name: event.target.value })}
              />
              <Button
                variant="quiet"
                className="shrink-0 px-2 py-2 text-alert disabled:opacity-25"
                aria-label="このチームを削除"
                disabled={teams.length <= 2}
                onClick={() => onChange(teams.filter((item) => item.key !== team.key))}
              >
                <Icon name="close" size={16} />
              </Button>
            </div>

            <ul className="mt-2 flex flex-wrap gap-1.5">
              {team.memberIds.map((memberId) => (
                <li key={memberId}>
                  <button
                    className="flex items-center gap-1.5 rounded-full border border-rule bg-surface px-3 py-1 text-[12px]"
                    onClick={() =>
                      update(team.key, {
                        memberIds: team.memberIds.filter((id) => id !== memberId),
                      })
                    }
                  >
                    {members.find((member) => member.id === memberId)!.name}
                    <span className="text-faint">
                      <Icon name="close" size={12} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <MemberField onAdd={(name) => addMemberTo(team.key, name)} />
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        className="mt-5 flex w-full items-center justify-center gap-2 py-2.5 text-[13px]"
        onClick={() => onChange([...teams, { key: newId(), name: '', memberIds: [] }])}
      >
        <Icon name="plus" size={16} />
        チームを追加
      </Button>
      <p className="mt-2 text-[11px] text-faint">
        メンバーを入れておくと、誰が何番のスキットルを倒したかまで記録されます。
      </p>
    </section>
  )
}

const MemberField = ({ onAdd }: { onAdd: (name: string) => void }) => {
  const members = useAppStore((state) => state.members)
  const [name, setName] = useState('')

  const submit = () => {
    onAdd(name)
    setName('')
  }

  return (
    <div className="mt-2 flex gap-2">
      <TextInput
        list="registered-members"
        value={name}
        placeholder="メンバーを追加"
        className="py-2 text-[14px]"
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && submit()}
      />
      <datalist id="registered-members">
        {members.map((member) => (
          <option key={member.id} value={member.name} />
        ))}
      </datalist>
      <Button variant="outline" className="shrink-0 px-3 py-2 text-[13px]" onClick={submit}>
        追加
      </Button>
    </div>
  )
}
