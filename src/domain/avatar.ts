/**
 * プレイヤーのアバター。色と、丸の中に書く 1〜2 文字（名前の頭文字や好きな記号）。
 * 画像は端末の保存領域を圧迫するので持たない
 */
export type Avatar = { color: string; mark: string }

/** 選べる色。どれも白い文字が読める濃さにしてある */
export const AVATAR_COLORS = [
  '#1f5f4a',
  '#2d6a8e',
  '#8e3b46',
  '#b0601f',
  '#6b5b95',
  '#3d7d3a',
  '#7a6a4f',
  '#b14f78',
  '#3f4a55',
  '#2f8484',
]

/** 文字で数えて 2 文字まで。絵文字や漢字も 1 文字として数える */
export const clampMark = (raw: string): string => Array.from(raw.trim()).slice(0, 2).join('')

/** 名前の頭文字と、ID から決まる色。登録したときの初期のアバター */
export const defaultAvatar = (name: string, id: string): Avatar => {
  const hash = Array.from(id).reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 997, 7)
  return { color: AVATAR_COLORS[hash % AVATAR_COLORS.length], mark: clampMark(name).slice(0, 1) || '?' }
}
