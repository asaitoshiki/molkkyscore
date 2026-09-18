import { useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { Button, Numeral, SectionTitle } from '../components/ui'
import { championOf, computeStandings } from '../domain/tournament'
import type { Tournament, TournamentMatch } from '../domain/types'
import { useAppStore } from '../store/useAppStore'

export const TournamentDetailPage = () => {
  const { tournamentId } = useParams()
  const navigate = useNavigate()
  const tournament = useAppStore((state) =>
    state.tournaments.find((item) => item.id === tournamentId),
  )!
  const games = useAppStore((state) => state.games)
  const createGame = useAppStore((state) => state.createGame)
  const deleteTournament = useAppStore((state) => state.deleteTournament)

  const nameOf = (entryId: string | null) =>
    entryId === null ? '—' : (tournament.entries.find((entry) => entry.id === entryId)?.name ?? '—')

  const openMatch = (match: TournamentMatch) => {
    const gameId =
      match.gameId ??
      createGame(
        match.entryIds.map((entryId) => tournament.entries.find((entry) => entry.id === entryId)!),
        tournament.rules,
        { tournamentId: tournament.id, matchId: match.id },
      )
    navigate(`/games/${gameId}`)
  }

  const champion = championOf(tournament, games)
  const rounds = [...new Set(tournament.matches.map((match) => match.round))].sort((a, b) => a - b)

  return (
    <div className="space-y-7">
      <header>
        <p className="eyebrow text-muted">{tournament.format === 'roundRobin' ? 'ROUND ROBIN' : 'KNOCKOUT'}</p>
        <h1 className="mt-1 font-serif text-2xl">{tournament.name}</h1>
        <p className="tabular mt-1 text-[12px] text-muted">{tournament.entries.length} 組が参加</p>
      </header>

      {champion && (
        <section className="border-y border-accent py-5 text-center">
          <p className="eyebrow text-accent">CHAMPION</p>
          <p className="mt-1 font-serif text-2xl">{champion.name}</p>
        </section>
      )}

      {tournament.format === 'roundRobin' && <Standings tournament={tournament} />}

      {rounds.map((round) => (
        <section key={round}>
          <SectionTitle>
            {tournament.format === 'knockout' ? roundLabel(round, rounds.length) : `第 ${round} 節`}
          </SectionTitle>
          <ul className="divide-y divide-rule border-y border-rule">
            {tournament.matches
              .filter((match) => match.round === round)
              .map((match) => {
                const playable = match.entryIds.every((entryId) => entryId !== null)
                const decided = match.winnerEntryId !== null
                return (
                  <li key={match.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14px]">
                        {nameOf(match.entryIds[0])}
                        <span className="mx-2 text-faint">対</span>
                        {nameOf(match.entryIds[1] ?? null)}
                      </p>
                      {decided && (
                        <p className="flex items-center gap-1 text-[12px] text-accent">
                          <Icon name="flag" size={12} />
                          {nameOf(match.winnerEntryId)}
                        </p>
                      )}
                    </div>
                    <Button
                      variant={decided ? 'quiet' : 'outline'}
                      className="shrink-0 px-3 py-1.5 text-[12px]"
                      disabled={!playable}
                      onClick={() => openMatch(match)}
                    >
                      {match.gameId === null ? '開始' : decided ? '記録' : '再開'}
                    </Button>
                  </li>
                )
              })}
          </ul>
        </section>
      ))}

      <Button
        variant="danger"
        className="w-full py-2 text-[12px]"
        onClick={() => {
          deleteTournament(tournament.id)
          navigate('/tournaments')
        }}
      >
        この大会を削除する
      </Button>
    </div>
  )
}

/** 決勝から数えたラウンド名 */
const roundLabel = (round: number, total: number) => {
  const fromFinal = total - round
  return ['決勝', '準決勝', '準々決勝'][fromFinal] ?? `${round} 回戦`
}

const Standings = ({ tournament }: { tournament: Tournament }) => {
  const games = useAppStore((state) => state.games)
  const standings = computeStandings(tournament, games)

  return (
    <section>
      <SectionTitle>順位表</SectionTitle>
      <table className="tabular w-full text-[13px]">
        <thead>
          <tr className="border-b border-rule text-[11px] text-muted">
            <th className="py-2 text-left font-normal">組</th>
            <th className="py-2 pl-2 text-right font-normal">試合</th>
            <th className="py-2 pl-2 text-right font-normal">勝</th>
            <th className="py-2 pl-2 text-right font-normal">負</th>
            <th className="py-2 pl-3 text-right font-normal">得失点</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {standings.map((standing) => (
            <tr key={standing.entry.id}>
              <td className="py-2.5">{standing.entry.name}</td>
              <td className="py-2.5 pl-2 text-right text-muted">{standing.played}</td>
              <td className="py-2.5 pl-2 text-right">
                <Numeral className="text-base">{standing.wins}</Numeral>
              </td>
              <td className="py-2.5 pl-2 text-right text-muted">{standing.losses}</td>
              <td className="py-2.5 pl-3 text-right text-muted">
                {standing.pointsFor - standing.pointsAgainst > 0 ? '+' : ''}
                {standing.pointsFor - standing.pointsAgainst}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
