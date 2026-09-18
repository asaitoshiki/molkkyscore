import { buildScoreSheet } from '../domain/scoresheet'
import { seriesStandings } from '../domain/series'
import type { Game } from '../domain/types'
import { createCanvas, eyebrow, formatDate, hairline } from './canvas'
import { ACCENT, FAINT, INK, MUTED, RULE, SANS, SERIF } from './palette'

const PADDING = 72
const ROUND_COLUMN = 120
const ENTRY_COLUMN = 240
const TITLE_BLOCK = 300
const ROW_HEIGHT = 96
const SUMMARY_ROW = 72

/**
 * 投球記録を参加者 × ラウンドの表として画像にする。
 * 連戦のときは、公式スコアシートと同じ「ゲームごとの得点＋合計」を先頭に載せる。
 */
export const renderScoreSheet = async (
  game: Game,
  seriesGames: Game[],
): Promise<HTMLCanvasElement> => {
  await document.fonts.ready

  const sheet = buildScoreSheet(game)
  const standings = seriesGames.length > 1 ? seriesStandings(seriesGames) : []
  const summaryHeight = standings.length === 0 ? 0 : (standings.length + 1) * SUMMARY_ROW + 80
  const header = TITLE_BLOCK + summaryHeight

  const width = Math.max(1080, PADDING * 2 + ROUND_COLUMN + sheet.rows.length * ENTRY_COLUMN)
  const height = header + (sheet.rounds + 1) * ROW_HEIGHT + 140
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

  if (standings.length > 0) {
    drawSummary(ctx, width, PADDING + 170, seriesGames, standings)
  }

  const columnCenter = (index: number) =>
    PADDING + ROUND_COLUMN + index * ENTRY_COLUMN + ENTRY_COLUMN / 2

  ctx.font = `400 24px ${SANS}`
  ctx.fillStyle = MUTED
  ctx.fillText(`第 ${game.gameNumber} ゲームの投球`, PADDING, header - 110)

  ctx.textAlign = 'center'
  ctx.font = `400 32px ${SANS}`
  sheet.rows.forEach((row, index) => {
    ctx.fillStyle = INK
    ctx.fillText(row.entry.name, columnCenter(index), header - 40, ENTRY_COLUMN - 24)
  })
  ctx.textAlign = 'left'

  hairline(ctx, PADDING, header - 12, width - PADDING * 2)

  // 参加者の列を細い縦罫で分ける
  const tableBottom = header + (sheet.rounds + 1) * ROW_HEIGHT
  ctx.fillStyle = RULE
  sheet.rows.slice(1).forEach((_, index) => {
    const x = PADDING + ROUND_COLUMN + (index + 1) * ENTRY_COLUMN
    ctx.fillRect(x, header - 60, 2, tableBottom - header + 60)
  })

  for (let round = 0; round < sheet.rounds; round += 1) {
    const top = header + round * ROW_HEIGHT

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

  const totalTop = header + sheet.rounds * ROW_HEIGHT
  ctx.font = `400 22px ${SANS}`
  ctx.fillStyle = MUTED
  ctx.fillText('このゲーム', PADDING + 16, totalTop + ROW_HEIGHT / 2 + 8)

  ctx.textAlign = 'center'
  sheet.rows.forEach((row, index) => {
    ctx.font = `500 54px ${SERIF}`
    ctx.fillStyle = INK
    ctx.fillText(
      String(row.cells.at(-1)?.total ?? 0),
      columnCenter(index),
      totalTop + ROW_HEIGHT / 2 + 18,
    )
  })
  ctx.textAlign = 'left'

  ctx.font = `400 24px ${SANS}`
  ctx.fillStyle = FAINT
  ctx.textAlign = 'right'
  ctx.fillText('molkkyscore', width - PADDING, height - PADDING + 10)
  ctx.textAlign = 'left'

  return canvas
}

/** 連戦の「ゲームごとの得点＋合計」。公式スコアシートの上段にあたる。 */
const drawSummary = (
  ctx: CanvasRenderingContext2D,
  width: number,
  top: number,
  seriesGames: Game[],
  standings: ReturnType<typeof seriesStandings>,
) => {
  const right = width - PADDING
  const totalX = right - 40
  const gameWidth = 130
  const gameX = (index: number) => totalX - 200 - (seriesGames.length - 1 - index) * gameWidth

  ctx.font = `400 22px ${SANS}`
  ctx.fillStyle = MUTED
  ctx.fillText('セット', PADDING, top + 24)

  ctx.textAlign = 'right'
  seriesGames.forEach((item, index) => {
    ctx.fillStyle = MUTED
    ctx.fillText(`第${item.gameNumber}G`, gameX(index), top + 24)
  })
  ctx.fillStyle = INK
  ctx.fillText('合計', totalX, top + 24)
  ctx.textAlign = 'left'

  hairline(ctx, PADDING, top + 40, width - PADDING * 2)

  standings.forEach((standing, row) => {
    const y = top + 40 + (row + 1) * SUMMARY_ROW - 18

    ctx.font = `400 30px ${SANS}`
    ctx.fillStyle = INK
    ctx.fillText(standing.entry.name, PADDING, y, 360)

    ctx.textAlign = 'right'
    standing.perGame.forEach((score, index) => {
      ctx.font = `400 30px ${SANS}`
      ctx.fillStyle = MUTED
      ctx.fillText(String(score), gameX(index), y)
    })

    ctx.font = `500 44px ${SERIF}`
    ctx.fillStyle = ACCENT
    ctx.fillText(String(standing.total), totalX, y + 6)
    ctx.textAlign = 'left'

    hairline(ctx, PADDING, top + 40 + (row + 1) * SUMMARY_ROW, width - PADDING * 2, RULE)
  })
}
