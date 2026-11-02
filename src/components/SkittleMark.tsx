/**
 * 白木のスキットルの絵。上が斜めに切られた丸太に番号を書いたもの。
 * ホームの「試合を始める」など、モルックらしさを出したいところに使う
 */
export const SkittleMark = ({ number = 12, size = 64 }: { number?: number; size?: number }) => (
  <svg width={size * 0.72} height={size} viewBox="0 0 72 100" aria-hidden="true">
    {/* 胴 */}
    <path
      d="M6 30 L6 90 Q6 96 12 96 L60 96 Q66 96 66 90 L66 16 Z"
      fill="#f4dcae"
      stroke="#b98a45"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    {/* 斜めに切った上面 */}
    <path d="M6 30 L66 16 L66 22 L6 36 Z" fill="#fbecc9" stroke="#b98a45" strokeWidth="3" strokeLinejoin="round" />
    <text
      x="36"
      y="74"
      textAnchor="middle"
      fontFamily="Fredoka, sans-serif"
      fontWeight="600"
      fontSize="30"
      fill="#23312b"
    >
      {number}
    </text>
  </svg>
)
