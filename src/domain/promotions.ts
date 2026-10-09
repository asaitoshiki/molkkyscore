/**
 * 広告・アフィリエイトの掲載内容。
 *
 * 掲載先はこのファイルだけで決まる。リンクを増やす・消すときは
 * PROMOTIONS を編集すればよく、画面側は触らない。
 *
 * 置かない場所を明確にしておく:
 * 試合中の入力画面には置かない。記録係が誤タップすると試合が止まるため、
 * 露出より入力の確実さを優先する。
 */

/** 掲載する面。試合中の入力画面は含めない */
export type PromoSlot = 'rules' | 'tournament' | 'practice' | 'result'

export type Promotion = {
  id: string
  /** 何のリンクかを一目で示す見出し */
  title: string
  /** 何が買えるのか・何の店なのかを先に言う一行 */
  note: string
  url: string
  /** どの面に出すか */
  slots: PromoSlot[]
}

/** 楽天アフィリエイト ID。リンクに現れるため秘密ではない */
const RAKUTEN_AFFILIATE_ID = '58586e3d.b0840aae.58586e3e.c0f2dbe4'

/**
 * 楽天市場の検索結果へのアフィリエイトリンクを作る。
 *
 * 個別の商品ではなく検索結果に送る。商品が売り切れたり入れ替わったりしても
 * リンクが死なないため、貼りっぱなしにできる。
 */
const rakutenSearch = (keyword: string): string => {
  const target = `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(keyword)}/`
  const encoded = encodeURIComponent(target)
  return `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=${encoded}&m=${encoded}`
}

export const PROMOTIONS: Promotion[] = [
  {
    id: 'molkky-set',
    title: 'モルックセット',
    note: 'これから始めるなら。棒とスキットル 12 本の一式',
    url: rakutenSearch('モルック'),
    slots: ['rules', 'tournament', 'result'],
  },
  {
    id: 'molkky-skittle',
    title: '予備のスキットル',
    note: '欠けたり割れたりしたときの買い替えに',
    url: rakutenSearch('モルック スキットル'),
    slots: ['practice'],
  },
  {
    id: 'line-tape',
    title: 'ラインテープ',
    note: '投擲ラインを引くのに。芝でも土でも使えるもの',
    url: rakutenSearch('ラインテープ 白'),
    slots: ['tournament'],
  },
]

export const promotionsFor = (slot: PromoSlot): Promotion[] =>
  PROMOTIONS.filter((promotion) => promotion.slots.includes(slot))
