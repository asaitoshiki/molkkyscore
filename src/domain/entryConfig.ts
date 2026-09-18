import { newId } from './id'
import type { Entry, Member } from './types'

/**
 * 参加者は名前を並べるだけ。個人でもチームでも扱いは同じなので形式は分けない。
 * 並べた順がそのまま投げる順になる。
 */
export const buildEntries = (selected: string[], members: Member[]): Entry[] =>
  selected.map((memberId) => ({
    id: newId(),
    name: members.find((member) => member.id === memberId)!.name,
    memberIds: [memberId],
  }))

/** 2 組そろえば試合として成立する。 */
export const isPlayable = (entries: Entry[]) => entries.length >= 2
