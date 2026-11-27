import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { App } from './App'
import { initializePurchases } from './billing/purchases'
import { keepUpToDate } from './pwa'
// 丸ゴシックと数字の書体は、使う文字の分だけ読み込まれる
import '@fontsource/zen-maru-gothic/500.css'
import '@fontsource/zen-maru-gothic/700.css'
import '@fontsource/fredoka/500.css'
import '@fontsource/fredoka/600.css'
import './index.css'

keepUpToDate()

// 端末のストアに購入が残っていれば、起動時に引き継ぐ
void initializePurchases().catch(() => undefined)

// GitHub Pages など静的ホスティングでもリロードが壊れないよう HashRouter を使う
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
