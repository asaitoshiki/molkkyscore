import { describe, expect, it } from 'vitest'
import { hasUnreadNews, parseNews } from './news'

const item = { id: 'a', date: '2026-11-25', title: 'タイトル', body: '本文' }

describe('お知らせ', () => {
  it('形の正しいお知らせはそのまま読める', () => {
    expect(parseNews([item, { ...item, id: 'b', path: '/rules' }])).toHaveLength(2)
  })

  it('形が崩れていれば何件目が悪いか分かるように落とす', () => {
    expect(() => parseNews([item, { id: 'b' }])).toThrow('2 件目')
    expect(() => parseNews({})).toThrow('配列')
    expect(() => parseNews([{ ...item, path: 'https://example.com' }])).toThrow('1 件目')
  })

  it('先頭のお知らせを見ていなければ未読', () => {
    expect(hasUnreadNews([item], null)).toBe(true)
    expect(hasUnreadNews([item], 'a')).toBe(false)
    expect(hasUnreadNews([{ ...item, id: 'new' }, item], 'a')).toBe(true)
    expect(hasUnreadNews([], null)).toBe(false)
  })
})
