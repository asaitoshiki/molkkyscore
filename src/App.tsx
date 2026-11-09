import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { GameSetupPage } from './pages/GameSetupPage'
import { GamePage } from './pages/GamePage'
import { TimelinePage } from './pages/TimelinePage'
import { TeamNamesPage } from './pages/TeamNamesPage'
import { RemoveAdsPage } from './pages/RemoveAdsPage'
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage'
import { WatchPage } from './pages/WatchPage'
import { MovedToTaikai } from './pages/MovedToTaikai'
import { HistoryPage } from './pages/HistoryPage'
import { MembersPage } from './pages/MembersPage'
import { PlayerPage } from './pages/PlayerPage'
import { PracticePage } from './pages/PracticePage'
import { RulesPage } from './pages/RulesPage'
import { StatsPage } from './pages/StatsPage'
import { useWidgetLaunch } from './native/widgetLaunch'
import { useSharePurge } from './sync/useSharePurge'

export const App = () => {
  useWidgetLaunch()
  useSharePurge()

  return (
    <Routes>
      {/* 試合画面はスコア入力に集中させたいのでレイアウトの外に置く */}
      <Route path="/games/new" element={<GameSetupPage />} />
      <Route path="/remove-ads" element={<RemoveAdsPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/watch/:shareId" element={<WatchPage />} />
      {/* 大会の機能は「モルメモ 大会」に移した。配り済みのコートや本部のリンクはそちらへ送る */}
      <Route path="/e/*" element={<MovedToTaikai />} />
      <Route path="/tournaments/*" element={<MovedToTaikai />} />
      <Route path="/hq/*" element={<MovedToTaikai />} />
      <Route path="/games/:gameId" element={<GamePage />} />
      <Route path="/games/:gameId/timeline" element={<TimelinePage />} />
      <Route path="/games/:gameId/teams" element={<TeamNamesPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/members/:memberId" element={<PlayerPage />} />
        <Route path="/practice" element={<PracticePage />} />
        <Route path="/rules" element={<RulesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
