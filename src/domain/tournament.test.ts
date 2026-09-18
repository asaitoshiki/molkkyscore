import { describe, expect, it } from 'vitest'
import { createMatches, propagateWinners } from './tournament'
import type { Entry } from './types'

const entriesOf = (count: number): Entry[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `e${index + 1}`,
    name: `E${index + 1}`,
    memberIds: [`m${index + 1}`],
  }))

describe('総当たり', () => {
  it('全員が 1 回ずつ対戦する組み合わせになる', () => {
    const matches = createMatches('roundRobin', entriesOf(4))
    expect(matches).toHaveLength(6)

    const pairs = matches.map((match) => [...match.entryIds].sort().join('-'))
    expect(new Set(pairs).size).toBe(6)
  })

  it('同じラウンドに同じ参加者が 2 度出ない', () => {
    const matches = createMatches('roundRobin', entriesOf(6))
    for (let round = 1; round <= 5; round += 1) {
      const ids = matches.filter((match) => match.round === round).flatMap((match) => match.entryIds)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('奇数人数では毎ラウンド 1 人が休みになる', () => {
    const matches = createMatches('roundRobin', entriesOf(5))
    expect(matches).toHaveLength(10)
    expect(matches.filter((match) => match.round === 1)).toHaveLength(2)
  })
})

describe('トーナメント', () => {
  it('参加者数が 2 のべき乗なら 1 回戦から全枠が埋まる', () => {
    const matches = createMatches('knockout', entriesOf(4))
    expect(matches.filter((match) => match.round === 1)).toHaveLength(2)
    expect(matches.filter((match) => match.round === 2)).toHaveLength(1)
    expect(matches[0].entryIds).toEqual(['e1', 'e2'])
  })

  it('空き枠に当たった参加者は不戦勝で次のラウンドに進む', () => {
    const matches = createMatches('knockout', entriesOf(3))
    const bye = matches.find((match) => match.entryIds.includes(null))!
    expect(bye.winnerEntryId).toBe('e3')
    expect(matches.find((match) => match.round === 2)!.entryIds).toContain('e3')
  })

  it('勝者を決めると次のラウンドの対戦相手が埋まる', () => {
    const matches = createMatches('knockout', entriesOf(4))
    matches[0].winnerEntryId = 'e2'
    matches[1].winnerEntryId = 'e3'
    const advanced = propagateWinners(matches)
    expect(advanced.find((match) => match.round === 2)!.entryIds).toEqual(['e2', 'e3'])
  })
})
