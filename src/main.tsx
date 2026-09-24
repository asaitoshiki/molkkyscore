import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { App } from './App'
import { initializeAds } from './ads/admob'
import { useAppStore } from './store/useAppStore'
import './index.css'

// 広告を購入で消している人には、広告の仕組みごと動かさない
if (!useAppStore.getState().adFree) {
  void initializeAds()
}

// GitHub Pages など静的ホスティングでもリロードが壊れないよう HashRouter を使う
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
