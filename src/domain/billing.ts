/**
 * 広告除去の買い切り課金。
 * 実際の決済はストアの課金（App Store / Google Play）で行うため、
 * ここには表示に必要な情報と、ストアに登録する商品 ID だけを持つ。
 */
export const AD_FREE_PRODUCT_ID = 'molkkyscore.adfree'

/** 表示価格。ストアに登録する価格と揃える */
export const AD_FREE_PRICE = '¥480'

/** 何ゲームおきに全画面広告を挟むか */
export const INTERSTITIAL_INTERVAL = 2
