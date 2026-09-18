import { useState } from 'react'
import { Button, Numeral, SectionTitle, TextInput } from './ui'
import { useAppStore } from '../store/useAppStore'

type Props = {
  selected: string[]
  onChange: (selected: string[]) => void
}

/** 参加者を選んで並べる。選んだ順がそのまま投球順になる。 */
export const EntryBuilder = ({ selected, onChange }: Props) => {
  const members = useAppStore((state) => state.members)
  const addMember = useAppStore((state) => state.addMember)
  const [newName, setNewName] = useState('')

  const toggle = (memberId: string) =>
    onChange(
      selected.includes(memberId)
        ? selected.filter((id) => id !== memberId)
        : [...selected, memberId],
    )

  const move = (memberId: string, step: number) => {
    const from = selected.indexOf(memberId)
    const to = from + step
    const reordered = [...selected]
    reordered.splice(to, 0, ...reordered.splice(from, 1))
    onChange(reordered)
  }

  const add = () => {
    const name = newName.trim()
    if (name === '') return
    const member = addMember(name)
    onChange([...selected, member.id])
    setNewName('')
  }

  return (
    <section>
      <SectionTitle>参加者　{selected.length} 組</SectionTitle>
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
          const order = selected.indexOf(member.id)
          const picked = order >= 0
          return (
            <li key={member.id} className="flex items-center gap-3 py-2.5">
              <button className="flex flex-1 items-center gap-3 text-left" onClick={() => toggle(member.id)}>
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                    picked ? 'border-accent bg-accent text-paper' : 'border-rule'
                  }`}
                >
                  {picked && <Numeral className="text-[12px]">{order + 1}</Numeral>}
                </span>
                <span className={`text-[15px] ${picked ? '' : 'text-muted'}`}>{member.name}</span>
              </button>
              {picked && (
                <span className="flex gap-1">
                  <OrderButton label="上へ" disabled={order === 0} onClick={() => move(member.id, -1)}>
                    ↑
                  </OrderButton>
                  <OrderButton
                    label="下へ"
                    disabled={order === selected.length - 1}
                    onClick={() => move(member.id, 1)}
                  >
                    ↓
                  </OrderButton>
                </span>
              )}
            </li>
          )
        })}
      </ul>
      <p className="mt-2 text-[11px] text-faint">番号の順に投げます。矢印で入れ替えられます。</p>
    </section>
  )
}

const OrderButton = ({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: string
}) => (
  <button
    aria-label={label}
    disabled={disabled}
    onClick={onClick}
    className="h-7 w-7 rounded border border-rule text-[12px] text-muted disabled:opacity-25"
  >
    {children}
  </button>
)
