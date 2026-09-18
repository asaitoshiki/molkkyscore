/**
 * 絵文字を使わず、細線のアイコンで統一する。
 * すべて 24 グリッド・線幅 1.5 で描き、色は currentColor に任せる。
 */
const paths = {
  // スコアシート
  play: 'M6 3h9l3 3v15H6zM15 3v3h3M9 10h6M9 14h6M9 18h3',
  // 優勝カップ
  bracket:
    'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v4M9 21h6l-1-4h-4z',
  // 棒グラフ
  chart: 'M4 20h16M8 20v-6M12 20V8M16 20v-9',
  // 人が二人
  people:
    'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1M16 4.5a3.5 3.5 0 0 1 0 7M18 14a5 5 0 0 1 3 4.5V20',
  // 開いた冊子
  book: 'M4 5v13a1 1 0 0 0 1 1h5a2 2 0 0 1 2 2 2 2 0 0 1 2-2h5a1 1 0 0 0 1-1V5M12 8v13M4 5a1 1 0 0 1 1-1h4a3 3 0 0 1 3 3M20 5a1 1 0 0 0-1-1h-4a3 3 0 0 0-3 3',
  // 的
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  // 月桂冠のかわりの優勝マーク（旗）
  flag: 'M5 21V4M5 5h11l-2 3 2 3H5',
  plus: 'M12 5v14M5 12h14',
  arrowRight: 'M5 12h13M13 7l5 5-5 5',
  arrowLeft: 'M19 12H6M11 7l-5 5 5 5',
  undo: 'M4 9h10a5 5 0 0 1 0 10h-5M4 9l4-4M4 9l4 4',
  close: 'M6 6l12 12M18 6 6 18',
  // 投球の一覧
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  check: 'M5 13l4 4L19 7',
} as const

export type IconName = keyof typeof paths

export const Icon = ({ name, size = 20 }: { name: IconName; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={paths[name]} />
  </svg>
)
