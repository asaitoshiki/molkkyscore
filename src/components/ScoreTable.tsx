import { computeGameState } from '../domain/game'
import { seriesStandings } from '../domain/series'
import type { Game } from '../domain/types'

/**
 * 公式スコアシートと同じ「ゲームごとの得点＋合計」。
 * 入力中もつねに見えるよう画面の最下部に固定し、手番には印を付ける。
 */
export const ScoreTable = ({
  seriesGames,
  currentGame,
}: {
  seriesGames: Game[]
  currentGame: Game
}) => {
  const standings = seriesStandings(seriesGames)
  const state = computeGameState(currentGame)
  const stateOf = (entryId: string) => state.entries.find((item) => item.entryId === entryId)!

  return (
    <table className="tabular w-full text-[13px]">
      <thead className="bg-accent-soft text-[10px] tracking-wide text-accent">
        <tr>
          <th className="py-1.5 pl-7 text-left font-normal">チーム</th>
          {seriesGames.map((game) => (
            <th key={game.id} className="w-16 py-1.5 text-center font-normal">
              第{game.gameNumber}ゲーム
            </th>
          ))}
          <th className="w-16 py-1.5 pr-4 text-center font-normal">合計</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-rule border-t border-rule">
        {standings.map((standing) => {
          const entryState = stateOf(standing.entry.id)
          const active = standing.entry.id === state.currentEntryId
          return (
            <tr key={standing.entry.id} className={active ? 'bg-accent-soft/60' : ''}>
              <td className="py-2 pl-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 shrink-0 text-[10px] text-accent">{active ? '▶' : ''}</span>
                  <span className="min-w-0">
                    <span
                      className={`block max-w-[8.5rem] truncate ${
                        entryState.eliminated ? 'text-faint line-through' : ''
                      }`}
                    >
                      {standing.entry.name}
                    </span>
                    <MissDots used={entryState.consecutiveMisses} total={currentGame.rules.maxMisses} />
                  </span>
                </span>
              </td>
              {standing.perGame.map((score, index) => (
                <td key={seriesGames[index].id} className="py-2 text-center">
                  <Chip tone={seriesGames[index].id === currentGame.id ? 'accent' : 'quiet'}>
                    {score}
                  </Chip>
                </td>
              ))}
              <td className="py-2 pr-4 text-center">
                <Chip tone="ink">{standing.total}</Chip>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

const tones = {
  accent: 'bg-accent text-paper',
  ink: 'bg-ink text-paper',
  quiet: 'bg-surface text-muted border border-rule',
} as const

const Chip = ({ tone, children }: { tone: keyof typeof tones; children: number }) => (
  <span className={`inline-flex min-w-11 justify-center rounded px-1.5 py-1 ${tones[tone]}`}>
    {children}
  </span>
)

/** 連続ミスの回数。失格までの猶予をつねに示す。 */
const MissDots = ({ used, total }: { used: number; total: number }) => (
  <span className="mt-0.5 flex gap-1" aria-label={`連続ミス ${used} / ${total}`}>
    {Array.from({ length: total }, (_, index) => (
      <span
        key={index}
        className={`h-1.5 w-1.5 rounded-full ${index < used ? 'bg-alert' : 'bg-rule'}`}
      />
    ))}
  </span>
)
