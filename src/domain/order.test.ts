import { describe, expect, it } from 'vitest'
import { moveItem } from './order'

describe('並べ替え', () => {
  it('前から後ろへ、後ろから前へ動かせる', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c'])
  })

  it('同じ場所なら並びは変わらず、元の配列も変えない', () => {
    const list = ['a', 'b']
    expect(moveItem(list, 1, 1)).toEqual(['a', 'b'])
    expect(moveItem(list, 0, 1)).toEqual(['b', 'a'])
    expect(list).toEqual(['a', 'b'])
  })

  it('同じ名前が並んでいても位置で動かす', () => {
    expect(moveItem(['同じ', '同じ', '別'], 2, 0)).toEqual(['別', '同じ', '同じ'])
  })
})
