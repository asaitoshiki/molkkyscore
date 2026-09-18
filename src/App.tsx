import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { GameSetupPage } from './pages/GameSetupPage'
import { GamePage } from './pages/GamePage'
import { HistoryPage } from './pages/HistoryPage'
import { MembersPage } from './pages/MembersPage'
import { PracticePage } from './pages/PracticePage'
import { RulesPage } from './pages/RulesPage'
import { StatsPage } from './pages/StatsPage'
import { TournamentDetailPage } from './pages/TournamentDetailPage'
import { TournamentSetupPage } from './pages/TournamentSetupPage'
import { TournamentsPage } from './pages/TournamentsPage'

export const App = () => (
  <Routes>
    {/* 試合画面はスコア入力に集中させたいのでレイアウトの外に置く */}
    <Route path="/games/:gameId" element={<GamePage />} />
    <Route element={<Layout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/games/new" element={<GameSetupPage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/stats" element={<StatsPage />} />
      <Route path="/members" element={<MembersPage />} />
      <Route path="/practice" element={<PracticePage />} />
      <Route path="/rules" element={<RulesPage />} />
      <Route path="/tournaments" element={<TournamentsPage />} />
      <Route path="/tournaments/new" element={<TournamentSetupPage />} />
      <Route path="/tournaments/:tournamentId" element={<TournamentDetailPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
)
