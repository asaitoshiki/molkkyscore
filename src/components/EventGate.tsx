import type { ReactNode } from 'react'
import { AppBar } from './AppBar'
import { EmptyState } from './ui'
import type { EventInfo } from '../domain/event'
import { useEventInfo } from '../sync/useEvent'

const MESSAGES = {
  loading: 'つないでいます…',
  missing: 'この大会は見つかりませんでした。本部に QR をもう一度見せてもらってください',
  ended: 'この大会は終了しました',
} as const

/** 大会の設定が届くまでの待ちと、見つからない・終わった大会の案内をまとめて受け持つ */
export const EventGate = ({
  eventId,
  children,
}: {
  eventId: string
  children: (info: EventInfo) => ReactNode
}) => {
  const state = useEventInfo(eventId)
  if (state.kind !== 'ready') {
    return (
      <div className="mx-auto min-h-full max-w-md bg-paper">
        <AppBar title="大会" />
        <div className="px-5 py-10">
          <EmptyState>{MESSAGES[state.kind]}</EmptyState>
        </div>
      </div>
    )
  }
  return children(state.info)
}
