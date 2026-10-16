import { SUBMISSION_LABEL } from '../domain/event'
import type { SubmissionStatus } from '../domain/event'

const LABELS: Record<SubmissionStatus | 'none', string> = { none: '未提出', ...SUBMISSION_LABEL }

const TONES: Record<SubmissionStatus | 'none', string> = {
  none: 'border-rule text-muted',
  submitted: 'border-ink text-ink',
  approved: 'border-accent bg-accent text-paper',
  returned: 'border-alert text-alert',
}

/** 提出の状態を小さな札で示す。まだ送っていない試合は「未提出」 */
export const SubmissionBadge = ({ status }: { status: SubmissionStatus | 'none' }) => (
  <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] ${TONES[status]}`}>
    {LABELS[status]}
  </span>
)
