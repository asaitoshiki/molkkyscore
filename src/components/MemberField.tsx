import { useState } from 'react'
import { Icon } from './Icon'
import { Button, TextInput } from './ui'
import { useAppStore } from '../store/useAppStore'

/**
 * チームにメンバーを足す入力欄。登録済みの名前は候補に出し、＋か Enter で足す。
 * 空のまま押したときは何もしない
 */
export const MemberField = ({ onAdd }: { onAdd: (name: string) => void }) => {
  const members = useAppStore((state) => state.members)
  const [name, setName] = useState('')

  const submit = () => {
    if (name.trim() === '') return
    onAdd(name.trim())
    setName('')
  }

  return (
    <div className="mt-2 flex gap-2">
      <TextInput
        list="registered-members"
        value={name}
        placeholder="メンバーの名前"
        className="py-2 text-[14px]"
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && submit()}
      />
      <datalist id="registered-members">
        {/* 候補は登録したメンバーだけ。チーム名で記録しただけの名前は出さない */}
        {members
          .filter((member) => member.listed)
          .map((member) => (
            <option key={member.id} value={member.name} />
          ))}
      </datalist>
      <Button
        variant="outline"
        aria-label="メンバーを追加"
        className="shrink-0 px-3 py-2 text-accent"
        onClick={submit}
      >
        <Icon name="plus" size={16} />
      </Button>
    </div>
  )
}
