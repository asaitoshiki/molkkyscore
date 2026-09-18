import { useMemo, useState } from 'react'
import { Button } from './ui'
import { shareImage } from '../share/canvas'
import { renderResultCard } from '../share/resultCard'
import { renderScoreSheet } from '../share/scoreSheetImage'
import { gamesOfSeries } from '../domain/series'
import type { Game } from '../domain/types'
import { useAppStore } from '../store/useAppStore'

type Renderer = (game: Game, seriesGames: Game[]) => Promise<HTMLCanvasElement>

const actions: { key: string; label: string; suffix: string; render: Renderer }[] = [
  { key: 'result', label: '結果を画像に', suffix: 'result', render: renderResultCard },
  { key: 'sheet', label: 'スコアシート', suffix: 'sheet', render: renderScoreSheet },
]

/** 試合結果とスコアシートを画像にして共有・保存する。 */
export const ShareActions = ({ game, size = 'normal' }: { game: Game; size?: 'normal' | 'small' }) => {
  const games = useAppStore((state) => state.games)
  const seriesGames = useMemo(() => gamesOfSeries(games, game.seriesId), [games, game.seriesId])
  const [busy, setBusy] = useState<string | null>(null)
  const date = new Date(game.createdAt).toISOString().slice(0, 10)

  const run = async (key: string, suffix: string, render: Renderer) => {
    setBusy(key)
    const canvas = await render(game, seriesGames)
    await shareImage(canvas, `molkky-${suffix}-${date}.png`)
    setBusy(null)
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map((action) => (
        <Button
          key={action.key}
          variant="outline"
          className={size === 'small' ? 'px-3 py-1.5 text-[12px]' : ''}
          disabled={busy !== null}
          onClick={() => run(action.key, action.suffix, action.render)}
        >
          {busy === action.key ? '作成中…' : action.label}
        </Button>
      ))}
    </div>
  )
}
