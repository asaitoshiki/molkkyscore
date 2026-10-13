import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { App as NativeApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

/** ウィジェットがアプリを起こすときの URL。PlayWidgetProvider.java と揃えること */
const PLAY_URL = 'molkkyscore://play'

/**
 * ホーム画面のウィジェットから起動されたら、試合の準備画面を開く。
 *
 * 閉じた状態から起こされたときも、裏で開いていたときも同じイベントで届く。
 * Capacitor が受け取り手が現れるまで URL を保持しておいてくれるため。
 */
export const useWidgetLaunch = () => {
  const navigate = useNavigate()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const listener = NativeApp.addListener('appUrlOpen', (event) => {
      if (event.url.startsWith(PLAY_URL)) navigate('/games/new')
    })
    return () => {
      void listener.then((handle) => handle.remove())
    }
  }, [navigate])
}
