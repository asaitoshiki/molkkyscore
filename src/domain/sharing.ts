/**
 * 観戦用のリンク。
 * アプリ版は端末内のファイルから動くため、公開先の URL をここに持つ。
 */
export const PUBLIC_WEB_URL = 'https://asaitoshiki.github.io/molkkyscore/'

/** 観戦できる場所。鍵は推測できないランダム値で、知っている人だけが見られる */
export const watchUrl = (shareId: string) => `${PUBLIC_WEB_URL}#/watch/${shareId}`

/** 大会の運営は別アプリ「モルメモ 大会」で行う */
export const TAIKAI_APP_URL = 'https://asaitoshiki.github.io/molmemo-taikai/'
