import type { Avatar as AvatarData } from '../domain/avatar'

/** プレイヤーの丸いアイコン。色の上に 1〜2 文字を白で書く */
export const Avatar = ({ avatar, size = 32 }: { avatar: AvatarData; size?: number }) => (
  <span
    aria-hidden="true"
    className="inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white select-none"
    style={{
      backgroundColor: avatar.color,
      width: size,
      height: size,
      // 2 文字のときは少し小さくして丸に収める
      fontSize: size * (Array.from(avatar.mark).length > 1 ? 0.38 : 0.48),
    }}
  >
    {avatar.mark}
  </span>
)
