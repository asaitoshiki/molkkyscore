import { buildScoreSheet } from '../domain/scoresheet'
import type { Game } from '../domain/types'
import { createCanvas, eyebrow, formatDate, hairline } from './canvas'
import { ACCENT, FAINT, INK, MUTED, RULE, SANS, SERIF } from './palette'

const PADDING = 72
const ROUND_COLUMN = 120
const ENTRY_COLUMN = 240
const HEADER = 300
const ROW_HEIGHT = 96

/** 投球記録を参加者 × ラウンドの表として画像にする。紙のスコアシートの代わりになる。 */
export const renderScoreSheet = async (game: Game): Promise<HTMLCanvasElement> => {
  await document.fonts.ready

  const sheet = buildScoreSheet(game)
  const width = Math.max(1080, PADDING * 2 + ROUND_COLUMN + sheet.rows.length * ENTRY_COLUMN)
  const height = HEADER + (sheet.rounds + 1) * ROW_HEIGHT + 140
  const { canvas, ctx } = createCanvas(width, height)

  eyebrow(ctx, 'SCORE SHEET', PADDING, PADDING + 26, ACCENT, SANS)

  ctx.font = `400 26px ${SANS}`
  ctx.fillStyle = MUTED
  ctx.textAlign = 'right'
  ctx.fillText(formatDate(game.createdAt), width - PADDING, PADDING + 26)
  ctx.textAlign = 'left'

  ctx.font = `500 64px ${SERIF}`
  ctx.fillStyle = INK
  ctx.fillText('スコアシート', PADDING, PADDING + 120)

  // 参加者名の見出し。列の中央に置く
  const columnCenter = (index: number) =>
    PADDING + ROUND_COLUMN + index * ENTRY_COLUMN + ENTRY_COLUMN / 2

  ctx.textAlign = 'center'
  ctx.font = `400 32px ${SANS}`
  sheet.rows.forEach((row, index) => {
    ctx.fillStyle = INK
    ctx.fillText(row.entry.name, columnCenter(index), HEADER - 40, ENTRY_COLUMN - 24)
  })
  ctx.textAlign = 'left'

  hairline(ctx, PADDING, HEADER - 12, width - PADDING * 2)

  // 参加者の列を細い縦罫で分ける
  const tableBottom = HEADER + (sheet.rounds + 1) * ROW_HEIGHT
  ctx.fillStyle = RULE
  sheet.rows.slice(1).forEach((_, index) => {
    const x = PADDING + ROUND_COLUMN + (index + 1) * ENTRY_COLUMN
    ctx.fillRect(x, HEADER - 60, 2, tableBottom - HEADER + 60)
  })

  for (let round = 0; round < sheet.rounds; round += 1) {
    const top = HEADER + round * ROW_HEIGHT

    ctx.font = `400 26px ${SERIF}`
    ctx.fillStyle = FAINT
    ctx.fillText(String(round + 1), PADDING + 24, top + ROW_HEIGHT / 2 + 10)

    ctx.textAlign = 'center'
    sheet.rows.forEach((row, index) => {
      const cell = row.cells[round]
      if (cell === undefined) return

      ctx.font = `400 34px ${SANS}`
      ctx.fillStyle = cell.points === 0 ? MUTED : INK
      ctx.fillText(
        cell.points === 0 ? 'ミス' : `+${cell.points}`,
        columnCenter(index) - 36,
        top + ROW_HEIGHT / 2 + 12,
      )

      ctx.font = `500 38px ${SERIF}`
      ctx.fillStyle = ACCENT
      ctx.fillText(String(cell.total), columnCenter(index) + 52, top + ROW_HEIGHT / 2 + 12)
    })
    ctx.textAlign = 'left'

    hairline(ctx, PADDING, top + ROW_HEIGHT, width - PADDING * 2, RULE)
  }

  // 最終行に合計を置いて、表の締めにする
  const totalTop = HEADER + sheet.rounds * ROW_HEIGHT
  ctx.font = `400 22px ${SANS}`
  ctx.fillStyle = MUTED
  ctx.fillText('合計', PADDING + 16, totalTop + ROW_HEIGHT / 2 + 8)

  ctx.textAlign = 'center'
  sheet.rows.forEach((row, index) => {
    ctx.font = `500 54px ${SERIF}`
    ctx.fillStyle = INK
    ctx.fillText(String(row.cells.at(-1)?.total ?? 0), columnCenter(index), totalTop + ROW_HEIGHT / 2 + 18)
  })
  ctx.textAlign = 'left'

  ctx.font = `400 24px ${SANS}`
  ctx.fillStyle = FAINT
  ctx.textAlign = 'right'
  ctx.fillText('molkkyscore', width - PADDING, height - PADDING + 10)
  ctx.textAlign = 'left'

  return canvas
}
