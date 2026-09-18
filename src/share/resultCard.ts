import { computeGameState } from '../domain/game'
import type { Game } from '../domain/types'
import { createCanvas, eyebrow, formatDate, hairline } from './canvas'
import { ACCENT, ACCENT_SOFT, FAINT, INK, MUTED, SANS, SERIF } from './palette'

const WIDTH = 1080
const PADDING = 88
const ROW_HEIGHT = 128

/** 試合結果を 1 枚の画像にする。順位・最終得点・勝者が一目で分かる形にまとめる。 */
export const renderResultCard = async (game: Game): Promise<HTMLCanvasElement> => {
  await document.fonts.ready

  const state = computeGameState(game)
  const nameOf = (entryId: string) => game.entries.find((entry) => entry.id === entryId)!.name
  const ranked = [...state.entries].sort(
    (a, b) =>
      Number(b.entryId === state.winnerEntryId) - Number(a.entryId === state.winnerEntryId) ||
      b.score - a.score,
  )

  // 中身の高さに合わせる。余った下端があると作りかけに見える
  const height = PADDING * 2 + 190 + ranked.length * ROW_HEIGHT + 124
  const { canvas, ctx } = createCanvas(WIDTH, height)

  eyebrow(ctx, 'MÖLKKY NOTE', PADDING, PADDING + 26, ACCENT, SANS)

  ctx.font = `400 26px ${SANS}`
  ctx.fillStyle = MUTED
  ctx.textAlign = 'right'
  ctx.fillText(formatDate(game.finishedAt ?? game.createdAt), WIDTH - PADDING, PADDING + 26)
  ctx.textAlign = 'left'

  ctx.font = `500 76px ${SERIF}`
  ctx.fillStyle = INK
  ctx.fillText('試合結果', PADDING, PADDING + 130)

  let y = PADDING + 190
  hairline(ctx, PADDING, y, WIDTH - PADDING * 2)

  ranked.forEach((entryState, index) => {
    const top = y + index * ROW_HEIGHT
    const won = entryState.entryId === state.winnerEntryId

    if (won) {
      ctx.fillStyle = ACCENT_SOFT
      ctx.fillRect(PADDING, top + 2, WIDTH - PADDING * 2, ROW_HEIGHT - 2)
    }

    ctx.font = `400 30px ${SERIF}`
    ctx.fillStyle = FAINT
    ctx.fillText(String(index + 1), PADDING + 24, top + ROW_HEIGHT / 2 + 12)

    ctx.font = `400 42px ${SANS}`
    ctx.fillStyle = INK
    ctx.fillText(nameOf(entryState.entryId), PADDING + 90, top + ROW_HEIGHT / 2 + 15)

    if (entryState.eliminated) {
      ctx.font = `400 24px ${SANS}`
      ctx.fillStyle = MUTED
      ctx.fillText('失格', PADDING + 92, top + ROW_HEIGHT / 2 + 50)
    }

    ctx.textAlign = 'right'
    ctx.font = `500 72px ${SERIF}`
    ctx.fillStyle = won ? ACCENT : INK
    ctx.fillText(String(entryState.score), WIDTH - PADDING - 24, top + ROW_HEIGHT / 2 + 26)
    ctx.textAlign = 'left'

    hairline(ctx, PADDING, top + ROW_HEIGHT, WIDTH - PADDING * 2)
  })

  y += ranked.length * ROW_HEIGHT + 60

  ctx.font = `400 26px ${SANS}`
  ctx.fillStyle = MUTED
  ctx.fillText(`${game.throws.length} 投　${state.round} ラウンド`, PADDING, y + 24)

  ctx.textAlign = 'right'
  ctx.fillStyle = FAINT
  ctx.fillText('molkkyscore', WIDTH - PADDING, y + 24)
  ctx.textAlign = 'left'

  return canvas
}
