import { buildScoreSheet } from '../domain/scoresheet'
import { seriesResult } from '../domain/series'
import type { Game } from '../domain/types'

/**
 * 公式スコアシートと同じ中身を画面で読める形にしたもの。本部が提出を確かめるのに使う。
 * 先頭にゲームごとの得点と合計、その下に各ゲームの 1 投ずつの記録を並べる
 */
export const ScoreSheetView = ({ games }: { games: Game[] }) => {
  const result = seriesResult(games)
  const base = games[0].entries

  return (
    <div className="space-y-5">
      <table className="tabular w-full text-[13px]">
        <thead>
          <tr className="border-b border-rule text-[11px] text-muted">
            <th className="py-1.5 text-left font-normal">チーム</th>
            {games.map((game) => (
              <th key={game.id} className="py-1.5 text-right font-normal">
                第{game.gameNumber}
              </th>
            ))}
            <th className="py-1.5 text-right font-normal">合計</th>
            <th className="py-1.5 text-right font-normal">勝</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {base.map((entry) => {
            const standing = result.standings.find((item) => item.entry.id === entry.id)!
            return (
              <tr key={entry.id} className={entry.id === result.winnerEntryId ? 'text-accent' : ''}>
                <td className="py-2">{entry.name}</td>
                {standing.perGame.map((score, index) => (
                  <td key={games[index].id} className="py-2 text-right">
                    {score}
                  </td>
                ))}
                <td className="py-2 text-right font-semibold">{standing.total}</td>
                <td className="py-2 text-right">{standing.wins}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {games.map((game) => (
        <GameSheet key={game.id} game={game} />
      ))}
    </div>
  )
}

/** 1 ゲーム分。行がラウンド、列がチーム。ミスは公式どおり「−」と書く */
const GameSheet = ({ game }: { game: Game }) => {
  const sheet = buildScoreSheet(game)
  const rounds = Array.from({ length: sheet.rounds }, (_, index) => index)

  return (
    <section>
      <p className="eyebrow mb-1.5 text-muted">
        第 {game.gameNumber} ゲーム{game.timeUpAt !== null && '・時間切れ'}
      </p>
      <table className="tabular w-full border border-rule text-[12px]">
        <thead>
          <tr className="bg-surface text-[11px] text-muted">
            <th className="w-8 border-r border-rule py-1 font-normal" />
            {sheet.rows.map((row) => (
              <th key={row.entry.id} colSpan={2} className="border-r border-rule py-1 font-normal">
                {row.entry.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rounds.map((round) => (
            <tr key={round} className="border-t border-rule">
              <td className="border-r border-rule py-1 text-center text-faint">{round + 1}</td>
              {sheet.rows.map((row) => {
                const cell = row.cells[round]
                return (
                  <SheetCells
                    key={row.entry.id}
                    points={cell === undefined ? '' : cell.pins.length === 0 ? '−' : String(cell.points)}
                    total={cell === undefined ? '' : String(cell.total)}
                  />
                )
              })}
            </tr>
          ))}
          <tr className="border-t border-ink font-semibold">
            <td className="border-r border-rule py-1 text-center text-[10px] text-muted">点</td>
            {sheet.rows.map((row) => (
              <td key={row.entry.id} colSpan={2} className="border-r border-rule py-1 text-center">
                {row.final}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </section>
  )
}

const SheetCells = ({ points, total }: { points: string; total: string }) => (
  <>
    <td className="w-10 py-1 text-center text-muted">{points}</td>
    <td className="w-10 border-r border-rule py-1 text-center">{total}</td>
  </>
)
