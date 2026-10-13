import { useEffect } from 'react'
import { gamesOfSeries } from '../domain/series'
import { isShareExpired } from '../domain/watchSnapshot'
import { useAppStore } from '../store/useAppStore'
import { removeWatch } from './watchChannel'

/**
 * 起動したときに、期限の切れた共有をデータベースから消す。
 * 観戦側は期限を過ぎると「終了」と出すが、送った記録そのものも残さない。
 * 消せたものだけ共有中の一覧から外し、電波が無ければ次の起動に持ち越す。
 */
export const useSharePurge = () => {
  useEffect(() => {
    const { shares, games, endShare } = useAppStore.getState()
    const now = Date.now()
    Object.entries(shares)
      .filter(([seriesId]) => isShareExpired(gamesOfSeries(games, seriesId), now))
      .forEach(([seriesId, shareId]) => {
        removeWatch(shareId)
          .then(() => endShare(seriesId))
          .catch(() => undefined)
      })
  }, [])
}
