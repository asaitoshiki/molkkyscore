/**
 * 観戦用のリンク。
 * アプリ版は端末内のファイルから動くため、公開先の URL をここに持つ。
 */
export const PUBLIC_WEB_URL = 'https://asaitoshiki.github.io/molkkyscore/'

/** 観戦できる場所。セット単位で見せるので、鍵はセットの識別子。 */
export const watchUrl = (seriesId: string) => `${PUBLIC_WEB_URL}#/watch/${seriesId}`
