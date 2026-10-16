/**
 * 観戦用のリンク。
 * アプリ版は端末内のファイルから動くため、公開先の URL をここに持つ。
 */
export const PUBLIC_WEB_URL = 'https://asaitoshiki.github.io/molkkyscore/'

/** 観戦できる場所。鍵は推測できないランダム値で、知っている人だけが見られる */
export const watchUrl = (shareId: string) => `${PUBLIC_WEB_URL}#/watch/${shareId}`

/** 大会のコートが参加する場所。本部が QR で配る */
export const eventCourtUrl = (eventId: string) => `${PUBLIC_WEB_URL}#/e/${eventId}`

/** 本部の画面。別の端末（パソコンなど）で開き直すときに使う */
export const eventHqUrl = (eventId: string) => `${PUBLIC_WEB_URL}#/e/${eventId}/hq`
