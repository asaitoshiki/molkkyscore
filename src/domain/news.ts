/**
 * お知らせ 1 件。公開先の news.json に新しいものから順に並べて置く。
 * アプリを作り直さなくても、news.json を書き換えるだけで全員に届く
 */
export type NewsItem = {
  /** 既読の目印。重ならない文字列にする（例：2026-11-25-taikai） */
  id: string
  /** 表示する日付（例：2026-11-25） */
  date: string
  title: string
  body: string
  /** 押したときに開くアプリ内の画面（例：/rules）。無ければ本文だけ */
  path?: string
}

/** 届いた news.json の中身を確かめる。形が崩れていれば、どこが悪いか分かるように落とす */
export const parseNews = (raw: unknown): NewsItem[] => {
  if (!Array.isArray(raw)) throw new Error('news.json は配列にしてください')
  return raw.map((item, index) => {
    const valid =
      typeof item?.id === 'string' &&
      typeof item.date === 'string' &&
      typeof item.title === 'string' &&
      typeof item.body === 'string' &&
      (item.path === undefined || (typeof item.path === 'string' && item.path.startsWith('/')))
    if (!valid) throw new Error(`news.json の ${index + 1} 件目の形が正しくありません`)
    return item as NewsItem
  })
}

/** まだ見ていないお知らせがあるか。最後に見たときの先頭と、今の先頭を比べる */
export const hasUnreadNews = (news: NewsItem[], seenId: string | null): boolean =>
  news.length > 0 && news[0].id !== seenId
