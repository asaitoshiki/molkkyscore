import { newId } from './id'
import type { Entry, Member } from './types'

export const TEAM_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

/** 参加者選択画面が持つ入力状態。ここから参加単位を組み立てる。 */
export type EntryConfig = {
  mode: 'solo' | 'team'
  selected: string[]
  teamCount: number
  teamOf: Record<string, number>
}

export const emptyConfig: EntryConfig = { mode: 'solo', selected: [], teamCount: 2, teamOf: {} }

/** 未割り当てのメンバーは選択順に各チームへ配る */
export const teamIndexOf = (config: EntryConfig, memberId: string) =>
  config.teamOf[memberId] ?? config.selected.indexOf(memberId) % config.teamCount

/** 選択状態から参加単位（個人 or チーム）を組み立てる。 */
export const buildEntries = (config: EntryConfig, members: Member[]): Entry[] => {
  const nameOf = (memberId: string) => members.find((member) => member.id === memberId)!.name
  return config.mode === 'solo'
    ? config.selected.map((memberId) => ({
        id: newId(),
        name: nameOf(memberId),
        memberIds: [memberId],
      }))
    : Array.from({ length: config.teamCount }, (_, team) => ({
        id: newId(),
        name: `チーム${TEAM_LABELS[team]}`,
        memberIds: config.selected.filter((memberId) => teamIndexOf(config, memberId) === team),
      }))
}

/** 参加単位が 2 組以上そろい、どのチームも空でないこと。 */
export const isPlayable = (entries: Entry[]) =>
  entries.length >= 2 && entries.every((entry) => entry.memberIds.length > 0)
