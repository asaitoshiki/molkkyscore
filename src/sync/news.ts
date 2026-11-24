import { useEffect, useState } from 'react'
import { parseNews } from '../domain/news'
import type { NewsItem } from '../domain/news'
import { PUBLIC_WEB_URL } from '../domain/sharing'

/** お知らせの置き場。アプリを作り直さなくても、ここを書き換えれば全員に届く */
const NEWS_URL = `${PUBLIC_WEB_URL}news.json`

export type NewsState = { kind: 'loading' } | { kind: 'offline' } | { kind: 'ready'; news: NewsItem[] }

/**
 * 公開先からお知らせを読む。電波が無ければ offline にする。
 * 中身の形が崩れているときは直すべき誤りなので、握りつぶさずに落とす
 */
export const useNews = (): NewsState => {
  const [state, setState] = useState<NewsState>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    fetch(NEWS_URL, { cache: 'no-cache' })
      .then((response) => response.json() as Promise<unknown>)
      .then(
        (raw) => {
          if (!cancelled) setState({ kind: 'ready', news: parseNews(raw) })
        },
        () => {
          if (!cancelled) setState({ kind: 'offline' })
        },
      )
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
