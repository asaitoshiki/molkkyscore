import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'

/**
 * お知らせのプッシュ通知を受け取れるようにする（アプリ版だけ）。
 *
 * 送るのは Firebase コンソールの Messaging から。送る側にサーバーは要らない。
 * 起動したときにまだ聞いていなければ許可を聞き、許可された端末だけを登録する。
 * 通知に「path」（例：/rules）を付けて送ると、押したときにその画面を開く
 */
export const usePushNotifications = () => {
  const navigate = useNavigate()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const opened = PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const path = action.notification.data?.path
      if (typeof path === 'string' && path.startsWith('/')) navigate(path)
    })

    void PushNotifications.checkPermissions()
      .then((status) => (status.receive === 'prompt' ? PushNotifications.requestPermissions() : status))
      .then((status) => {
        if (status.receive !== 'granted') return
        return PushNotifications.register()
      })

    return () => {
      void opened.then((handle) => handle.remove())
    }
  }, [navigate])
}
