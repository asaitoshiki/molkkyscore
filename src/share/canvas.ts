import { PAPER, RULE } from './palette'

/** 用意したキャンバスに紙の地を敷く。以降の描画はすべてこの上に載る。 */
export const createCanvas = (width: number, height: number) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, width, height)
  ctx.textBaseline = 'alphabetic'
  return { canvas, ctx }
}

export const hairline = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  color = RULE,
) => {
  ctx.fillStyle = color
  ctx.fillRect(x, y, width, 2)
}

/** 字間を開けた小見出し。対応していないブラウザでは字間だけ無視される。 */
export const eyebrow = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  font: string,
) => {
  ctx.letterSpacing = '4px'
  ctx.font = `600 22px ${font}`
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
  ctx.letterSpacing = '0px'
}

export const formatDate = (at: number) =>
  new Date(at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })

/**
 * 画像を共有するか、対応していなければ保存する。
 * Web Share は利用者が取り消すと例外を投げるので、その場合は何もしない。
 */
export const shareImage = async (canvas: HTMLCanvasElement, filename: string) => {
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((result) => resolve(result!), 'image/png'),
  )
  const file = new File([blob], filename, { type: 'image/png' })

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] }).catch(() => undefined)
    return
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
