import { NavLink, Outlet } from 'react-router-dom'
import { Icon } from './Icon'
import type { IconName } from './Icon'

const tabs: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: '試合', icon: 'play' },
  { to: '/tournaments', label: '大会', icon: 'bracket' },
  { to: '/stats', label: '戦績', icon: 'chart' },
  { to: '/members', label: 'メンバー', icon: 'people' },
  { to: '/rules', label: 'ルール', icon: 'book' },
]

/** 下タブ付きの共通レイアウト。試合画面だけはタブを隠して入力に集中させる。 */
export const Layout = () => (
  <div className="mx-auto flex min-h-full max-w-md flex-col">
    <main className="safe-top flex-1 px-5 pt-6 pb-28">
      <Outlet />
    </main>
    <nav className="safe-bottom fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-rule bg-paper/95 backdrop-blur">
      <ul className="flex">
        {tabs.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-[10px] tracking-wide ${
                  isActive ? 'text-accent' : 'text-faint'
                }`
              }
            >
              <Icon name={tab.icon} size={22} />
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  </div>
)
