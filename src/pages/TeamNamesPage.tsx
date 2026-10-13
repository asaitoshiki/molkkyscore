import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppBar } from '../components/AppBar'
import { Icon } from '../components/Icon'
import { MissingRecord } from '../components/MissingRecord'
import { Button, TextInput } from '../components/ui'
import { useAppStore } from '../store/useAppStore'

/** 記録が残っているかだけ先に見る。消えた試合の URL でも画面が落ちないようにする。 */
export const TeamNamesPage = () => {
  const gameId = useParams().gameId!
  const exists = useAppStore((state) => state.games.some((item) => item.id === gameId))
  if (!exists) return <MissingRecord label="この試合" to="/history" />
  return <TeamNamesView gameId={gameId} />
}

/**
 * 試合を始めたあとでチーム名を直す画面。
 * 名前だけを変える。点数・手番・投球の記録はそのまま残る。
 */
const TeamNamesView = ({ gameId }: { gameId: string }) => {
  const navigate = useNavigate()
  const game = useAppStore((state) => state.games.find((item) => item.id === gameId))!
  const renameEntries = useAppStore((state) => state.renameEntries)
  const [names, setNames] = useState(() => game.entries.map((entry) => entry.name))
  const filled = names.every((name) => name.trim() !== '')

  const save = () => {
    renameEntries(Object.fromEntries(game.entries.map((entry, index) => [entry.id, names[index]])))
    navigate(-1)
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-paper">
      <AppBar
        title="チーム名の変更"
        left={
          <button onClick={() => navigate(-1)} aria-label="変更せずに戻る">
            <Icon name="chevronLeft" size={22} />
          </button>
        }
      />

      <section className="flex flex-1 flex-col px-5 py-8">
        <p className="text-center text-[15px]">チーム名を変更できます</p>
        <p className="mt-1 mb-6 text-center text-[12px] text-muted">点数と投球の記録はそのまま残ります</p>
        <div className="space-y-4">
          {names.map((name, index) => (
            <label key={game.entries[index].id} className="block">
              <span className="eyebrow text-muted">{index + 1} 番目に投げるチーム</span>
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

        <Button className="mt-8 w-full py-3.5" disabled={!filled} onClick={save}>
          保存
        </Button>
      </section>
    </div>
  )
}
