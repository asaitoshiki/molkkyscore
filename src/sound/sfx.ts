import type { ThrowOutcome } from '../domain/outcome'

/**
 * 効果音。音源ファイルは持たず、その場で合成する。
 * 木の棒がピンに当たる「カコン」に寄せた、短く控えめな音にそろえる。
 */

type Note = {
  /** 鳴らし始めの高さ（Hz） */
  freq: number
  /** 鳴らし終わりの高さ。指定すると、そこへ滑らせる */
  to?: number
  /** 鳴らし始めるまでの間（秒） */
  at: number
  length: number
  gain: number
  wave?: OscillatorType
}

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } }

let context: AudioContext | null = null

/** 最初に音を出すときに用意する。ブラウザはタップの中でしか音を出させないため */
const audio = () => {
  if (context !== null) return context
  // iPhone ではマナーモードのときに鳴らさない（対応していない端末では何もしない）
  const session = (navigator as AudioSessionNavigator).audioSession
  if (session) session.type = 'ambient'
  context = new AudioContext()
  return context
}

const play = (notes: Note[]) => {
  const ac = audio()
  void ac.resume()
  const now = ac.currentTime
  for (const note of notes) {
    const start = now + note.at
    const end = start + note.length
    const osc = ac.createOscillator()
    const amp = ac.createGain()
    osc.type = note.wave ?? 'sine'
    osc.frequency.setValueAtTime(note.freq, start)
    if (note.to !== undefined) osc.frequency.exponentialRampToValueAtTime(note.to, end)
    // 立ち上がりを一瞬にして、すぐ減衰させる。打楽器らしく聞こえる
    amp.gain.setValueAtTime(0.0001, start)
    amp.gain.exponentialRampToValueAtTime(note.gain, start + 0.006)
    amp.gain.exponentialRampToValueAtTime(0.0001, end)
    osc.connect(amp).connect(ac.destination)
    osc.start(start)
    osc.stop(end + 0.02)
  }
}

/** 木を叩いた音。基音と、少しだけ高い倍音を重ねる */
const knock = (freq: number, at: number, gain = 0.2): Note[] => [
  { freq, to: freq * 0.7, at, length: 0.09, gain },
  { freq: freq * 2.7, to: freq * 2, at, length: 0.035, gain: gain * 0.25 },
]

const SOUNDS = {
  /** スキットルを選んだとき */
  tap: () => play(knock(1500, 0, 0.06)),
  /** 得点が入ったとき。「カコン」 */
  score: () => play([...knock(880, 0), ...knock(1175, 0.085, 0.16)]),
  /** 1 本も倒れなかったとき */
  miss: () => play([{ freq: 220, to: 150, at: 0, length: 0.2, gain: 0.16 }]),
  /** 50 点を超えて 25 点に戻ったとき */
  overshoot: () =>
    play(
      [660, 523, 392].map((freq, index) => ({
        freq,
        at: index * 0.11,
        length: 0.13,
        gain: 0.1,
        wave: 'triangle' as const,
      })),
    ),
  /** 3 回続けてミスして失格になったとき */
  eliminated: () =>
    play([
      { freq: 330, to: 247, at: 0, length: 0.22, gain: 0.12, wave: 'triangle' },
      { freq: 262, to: 165, at: 0.2, length: 0.34, gain: 0.12, wave: 'triangle' },
    ]),
  /** ちょうど 50 点で勝ったとき */
  win: () =>
    play([
      ...knock(880, 0),
      ...[523, 659, 784, 1047].map((freq, index) => ({
        freq,
        at: 0.12 + index * 0.09,
        length: index === 3 ? 0.7 : 0.16,
        gain: 0.12,
        wave: 'triangle' as const,
      })),
    ]),
  /** 1 つ戻したとき。音を少し持ち上げて「巻き戻し」に聞かせる */
  undo: () => play([{ freq: 600, to: 900, at: 0, length: 0.09, gain: 0.07 }]),
} satisfies Record<string, () => void>

/** 1 投の結果（ThrowOutcome）と同じ名前の音を用意してあるので、結果をそのまま渡せる */
export type SoundName = keyof typeof SOUNDS | ThrowOutcome

export const playSound = (name: SoundName) => SOUNDS[name]()
