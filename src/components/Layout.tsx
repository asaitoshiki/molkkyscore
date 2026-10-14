import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import { PromoBar } from './PromoBar'
import type { PromoSlot } from '../domain/promotions'
import { useAppStore } from '../store/useAppStore'

const tabs: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: '試合', icon: 'play' },
  { to: '/tournaments', label: '大会', icon: 'bracket' },
  { to: '/stats', label: '戦績', icon: 'chart' },
  { to: '/members', label: 'メンバー', icon: 'people' },
  { to: '/rules', label: 'ルール', icon: 'book' },
]

/** 広告の帯を出す画面。ここに無い画面には出さない */
const PROMO_ROUTES: { prefix: string; slot: PromoSlot }[] = [
  { prefix: '/rules', slot: 'rules' },
  { prefix: '/tournaments', slot: 'tournament' },
  { prefix: '/practice', slot: 'practice' },
]

/** 下タブ付きの共通レイアウト。試合画面だけはタブを隠して入力に集中させる。 */
export const Layout = () => {
  const { pathname } = useLocation()
  const adFree = useAppStore((state) => state.adFree)
  // 広告除去を買った人には、楽天の帯も出さない。「広告なし」の約束を AdMob だけで終わらせない
  const slot = adFree ? undefined : PROMO_ROUTES.find((route) => pathname.startsWith(route.prefix))?.slot

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      {/* 帯のぶんだけ下の余白を増やし、本文が隠れないようにする */}
      <main className={`safe-top flex-1 px-5 pt-6 ${slot === undefined ? 'pb-28' : 'pb-44'}`}>
        <Outlet />
      </main>
      <nav className="safe-bottom fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-rule bg-paper/95 backdrop-blur">
        {slot !== undefined && <PromoBar slot={slot} />}
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
}
