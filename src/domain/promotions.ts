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

/**
 * 掲載中のリンク。
 *
 * 例:
 * {
 *   id: 'molkky-set',
 *   title: 'モルックセット',
 *   note: 'これから始める人向け。棒とスキットル一式',
 *   url: 'https://…',            // 楽天アフィリエイトのリンク
 *   slots: ['rules', 'practice'],
 * }
 */
export const PROMOTIONS: Promotion[] = []

export const promotionsFor = (slot: PromoSlot): Promotion[] =>
  PROMOTIONS.filter((promotion) => promotion.slots.includes(slot))
