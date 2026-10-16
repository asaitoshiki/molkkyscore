import { withGameDefaults } from './legacy'
import type { LegacyGame } from './legacy'
import type { Game, Member } from './types'

/**
 * 観戦用に送る記録の形。
 *
 * 送るのはセットの試合と、投げた人の名前だけ。得点・手番・失格は投球記録から
 * 毎回導き出す作りなので、受け取った側でも同じ計算で同じ画面になる。
 *
 * 中身は JSON 文字列 1 つにまとめて送る。Realtime Database は空の配列や null を
 * 保存しないため、そのまま送るとミス（倒した本数 0 の投球）が消えて壊れる。
 */
export type WatchRecord = {
  /** 送った人。書き換えられるのはこの人だけ（database.rules.json で縛る） */
  ownerUid: string
  updatedAt: number
  /** これを過ぎたら観戦側は「終了」と見なす */
  expiresAt: number
  payload: string
}

/** 試合（セット）の記録を送るときの中身。観戦と大会の提出で同じ形を使う */
export type SeriesPayload = {
  games: Game[]
  /** メンバー ID は端末ごとの値なので、受け取った側でも引けるよう名前を添える */
  memberNames: Record<string, string>
}

/** Realtime Database が空の配列や null を消さないよう、JSON 文字列 1 つにまとめる */
export const encodeSeries = (games: Game[], members: Member[]): string => {
  const involved = new Set(games.flatMap((game) => game.entries.flatMap((entry) => entry.memberIds)))
  const memberNames = Object.fromEntries(
    members.filter((member) => involved.has(member.id)).map((member) => [member.id, member.name]),
  )
  const payload: SeriesPayload = { games, memberNames }
  return JSON.stringify(payload)
}

/** 古い版のアプリから届いた記録でも同じ計算ができるよう、欠けた項目を補って戻す */
export const decodeSeries = (raw: string): SeriesPayload => {
  const payload = JSON.parse(raw) as Omit<SeriesPayload, 'games'> & { games: LegacyGame[] }
  return { games: payload.games.map(withGameDefaults), memberNames: payload.memberNames }
}

/** 最後に記録を送ってから、観戦できる時間 */
export const SHARE_TTL_MS = 12 * 60 * 60 * 1000

export const buildWatchRecord = (
  ownerUid: string,
  games: Game[],
  members: Member[],
  now: number,
): WatchRecord => ({
  ownerUid,
  updatedAt: now,
  expiresAt: now + SHARE_TTL_MS,
  payload: encodeSeries(games, members),
})

/** セットで最後に何かが起きた時刻。観戦の期限はここから数える */
export const lastActivityOf = (games: Game[]): number =>
  Math.max(0, ...games.flatMap((game) => [game.createdAt, ...game.throws.map((record) => record.at)]))

/**
 * 記録係の端末から見て、この共有はもう期限切れか。
 * 送った記録の期限（expiresAt）と同じ数え方にして、両側の判断を揃える。
 */
export const isShareExpired = (games: Game[], now: number): boolean =>
  lastActivityOf(games) + SHARE_TTL_MS < now

/** 観戦画面が取りうる状態 */
export type WatchState =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'ended' }
  | { kind: 'live'; games: Game[]; memberNames: Record<string, string> }

/** データベースから届いた値を、観戦画面の状態に直す */
export const toWatchState = (record: WatchRecord | null, now: number): WatchState => {
  if (record === null) return { kind: 'missing' }
  if (record.expiresAt < now) return { kind: 'ended' }
  return { kind: 'live', ...decodeSeries(record.payload) }
}

/**
 * 観戦リンクの鍵。推測されないことだけが守りなので、十分に長いランダム値にする。
 * 一覧は誰にも読めない（database.rules.json）ため、鍵を知る人だけが見られる。
 */
export const newShareId = (): string => {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(20))
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}
