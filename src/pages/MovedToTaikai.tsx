import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { TAIKAI_APP_URL } from '../domain/sharing'

/**
 * 大会の画面は「モルメモ 大会」に移った。古いリンクから来た人は同じ画面へ送る。
 * 本部とコートの記録は Firebase にあるので、行き先でもそのまま続けられる
 */
export const MovedToTaikai = () => {
  const { pathname } = useLocation()
  const target = `${TAIKAI_APP_URL}#${pathname}`

  useEffect(() => {
    window.location.replace(target)
  }, [target])

  return (
    <p className="px-5 py-10 text-center text-[13px] text-muted">
      大会は「モルメモ 大会」に移りました。
      <a className="mt-2 block text-accent" href={target}>
        モルメモ 大会で開く
      </a>
    </p>
  )
}
