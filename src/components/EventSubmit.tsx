import { useState } from 'react'
import { Button } from './ui'
import { SubmissionBadge } from './SubmissionBadge'
import { seriesResult } from '../domain/series'
import type { Game } from '../domain/types'
import { encodeSeries } from '../domain/watchSnapshot'
import { submitSeries } from '../sync/eventChannel'
import { useSubmission } from '../sync/useEvent'
import { useAppStore } from '../store/useAppStore'
import type { EventSeriesLink } from '../store/useAppStore'

/** これを過ぎても届いた知らせがなければ、送信待ちとして案内する */
const SEND_TIMEOUT_MS = 8_000

type Sending = 'idle' | 'sending' | 'waiting'

/**
 * 大会の試合を本部へ提出する。セルフジャッジなので、送る前に両チームが点数を確かめる。
 * 送ったあとに記録を直したら、本部の記録と食い違うので送り直しを促す
 */
export const EventSubmit = ({ link, seriesGames }: { link: EventSeriesLink; seriesGames: Game[] }) => {
  const members = useAppStore((state) => state.members)
  const seriesId = seriesGames[0].seriesId
  const submission = useSubmission(link.eventId, seriesId)
  const [confirmed, setConfirmed] = useState<string[]>([])
  const [sending, setSending] = useState<Sending>('idle')

  const entries = seriesGames[0].entries
  const result = seriesResult(seriesGames)
  const payload = encodeSeries(seriesGames, members)
  const changed = submission !== null && submission !== undefined && submission.payload !== payload
  const needsSend =
    submission === null || submission?.status === 'returned' || (changed && submission?.status !== 'approved')
  const allConfirmed = entries.every((entry) => confirmed.includes(entry.id))
  const decided = result.winnerEntryId !== null

  const send = async () => {
    setSending('sending')
    const timer = setTimeout(() => setSending('waiting'), SEND_TIMEOUT_MS)
    await submitSeries(link.eventId, seriesId, link.court, seriesGames, members)
    clearTimeout(timer)
    setSending('idle')
    setConfirmed([])
  }

  return (
    <section className="border-b border-rule px-5 py-5">
      <div className="flex items-center justify-between">
        <p className="eyebrow text-muted">本部への提出・コート {link.court}</p>
        <SubmissionBadge status={submission?.status ?? 'none'} />
      </div>

      {submission?.status === 'returned' && submission.note !== '' && (
        <p className="mt-2 rounded border border-alert px-3 py-2 text-[13px] text-alert">
          本部から：{submission.note}
        </p>
      )}
      {submission?.status === 'approved' && (
        <p className="mt-2 text-[13px] text-accent">本部が承認しました。おつかれさまでした。</p>
      )}
      {changed && submission?.status !== 'approved' && (
        <p className="mt-2 text-[12px] text-alert">送ったあとに記録が変わっています。送り直してください。</p>
      )}

      {needsSend && (
        <>
          <p className="mt-3 text-[12px] text-muted">
            両チームで点数を確かめ、それぞれのボタンを押してから送ってください。
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {entries.map((entry) => {
              const done = confirmed.includes(entry.id)
              return (
                <button
                  key={entry.id}
                  className={`truncate rounded border px-3 py-2 text-[13px] ${
                    done ? 'border-accent bg-accent-soft text-accent' : 'border-rule bg-surface'
                  }`}
                  onClick={() =>
                    setConfirmed(done ? confirmed.filter((id) => id !== entry.id) : [...confirmed, entry.id])
                  }
                >
                  {done ? '✓ ' : ''}
                  {entry.name} 確認
                </button>
              )
            })}
          </div>
          {!decided && (
            <p className="mt-2 text-[12px] text-alert">モルックアウトの勝者を選んでから送ってください。</p>
          )}
          <Button
            className="mt-3 w-full"
            disabled={!allConfirmed || !decided || sending !== 'idle'}
            onClick={send}
          >
            {sending === 'idle' ? (submission === null ? '本部に送る' : '送り直す') : '送っています…'}
          </Button>
          {sending === 'waiting' && (
            <p className="mt-2 text-[12px] text-muted">
              電波が弱いため送信待ちです。この画面を開いたままにすると、つながったときに自動で送ります。
            </p>
          )}
        </>
      )}
    </section>
  )
}
