import { newId } from './id'
import type { Entry } from './types'

/** 大会のチーム編成画面が持つ下書き。確定すると Entry になる。 */
export type TeamDraft = {
  key: string
  name: string
  memberIds: string[]
}

export const emptyTeams = (): TeamDraft[] => [
  { key: newId(), name: '', memberIds: [] },
  { key: newId(), name: '', memberIds: [] },
]

/** 名前が空のチームには通し番号を振る。 */
const displayName = (team: TeamDraft, index: number) =>
  team.name.trim() === '' ? `チーム${index + 1}` : team.name.trim()

export const buildTeamEntries = (teams: TeamDraft[]): Entry[] =>
  teams.map((team, index) => ({
    id: newId(),
    name: displayName(team, index),
    memberIds: team.memberIds,
  }))

/** すべてのチームに 1 人以上いて、2 チーム以上そろっていること。 */
export const isTeamSetReady = (teams: TeamDraft[]) =>
  teams.length >= 2 && teams.every((team) => team.memberIds.length > 0)
