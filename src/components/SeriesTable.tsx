import { computeGameState } from '../domain/game'
import { seriesStandings } from '../domain/series'
import type { Game } from '../domain/types'
import { Numeral } from './ui'

/**
 * 公式スコアシートと同じ「ゲームごとの得点＋合計」の表。
 * 入力中もつねに見えるよう、試合画面の最下部に置く。
 */
export const SeriesTable = ({
  seriesGames,
  currentGame,
}: {
  seriesGames: Game[]
  currentGame: Game
}) => {
  const standings = seriesStandings(seriesGames)
  const state = computeGameState(currentGame)
  const missesOf = (entryId: string) =>
    state.entries.find((item) => item.entryId === entryId)!.consecutiveMisses

  return (
    <table className="tabular w-full border-t border-rule text-[13px]">
      <thead>
        <tr className="text-[10px] tracking-wide text-muted">
          <th className="py-1.5 pl-5 text-left font-normal">組</th>
          {seriesGames.map((game) => (
            <th
              key={game.id}
              className={`w-14 py-1.5 text-right font-normal ${
                game.id === currentGame.id ? 'text-accent' : ''
              }`}
            >
              第{game.gameNumber}G
            </th>
          ))}
          <th className="w-16 py-1.5 pr-5 text-right font-normal">合計</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-rule border-t border-rule">
        {standings.map((standing) => {
          const active = standing.entry.id === state.currentEntryId
          const eliminated = state.entries.find(
            (item) => item.entryId === standing.entry.id,
          )!.eliminated
          return (
            <tr key={standing.entry.id} className={active ? 'bg-accent-soft' : ''}>
              <td className={`py-2 pl-5 ${eliminated ? 'text-faint line-through' : ''}`}>
                <span className="flex items-center gap-2">
                  <span className="max-w-[9rem] truncate">{standing.entry.name}</span>
                  <MissDots used={missesOf(standing.entry.id)} total={currentGame.rules.maxMisses} />
                </span>
              </td>
              {standing.perGame.map((score, index) => (
                <td
                  key={seriesGames[index].id}
                  className={`py-2 text-right ${
                    seriesGames[index].id === currentGame.id ? 'text-ink' : 'text-muted'
                  }`}
                >
                  {score}
                </td>
              ))}
              <td className="py-2 pr-5 text-right">
                <Numeral className="text-lg">{standing.total}</Numeral>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

/** 連続ミスの回数。失格までの猶予をその場で示す。 */
const MissDots = ({ used, total }: { used: number; total: number }) => (
  <span className="flex gap-0.5" aria-label={`連続ミス ${used} / ${total}`}>
    {Array.from({ length: used === 0 ? 0 : total }, (_, index) => (
      <span
        key={index}
        className={`h-1.5 w-1.5 rounded-full ${index < used ? 'bg-alert' : 'bg-rule'}`}
      />
    ))}
  </span>
)
