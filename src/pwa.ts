import { registerSW } from 'virtual:pwa-register'

/** 新しい版が出ていないか確かめる間隔。開いたままの本部の画面でも切り替わるように */
const CHECK_INTERVAL_MS = 30 * 60 * 1000

/**
 * 新しい版を公開したら、次に開いたときを待たずにすぐ切り替える。
 * 新しい版が届いた時点で自動で読み込み直す（記録は端末に保存済みなので消えない）。
 * ホーム画面から開いた Web アプリは閉じずに戻ってくることが多いので、前面に戻ったときにも確かめる
 */
export const keepUpToDate = () =>
  registerSW({
    immediate: true,
    onRegisteredSW: (_url, registration) => {
      if (registration === undefined) return
      const check = () => void registration.update()
      setInterval(check, CHECK_INTERVAL_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    },
  })
