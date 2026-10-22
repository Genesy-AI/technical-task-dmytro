import { TimeoutFailure } from '@temporalio/client'

export function verificationError(error: unknown): string {
  const seen = new Set<unknown>()
  let cause = error
  while (cause instanceof Error && !seen.has(cause)) {
    if (cause instanceof TimeoutFailure) return 'Verification timed out.'
    seen.add(cause)
    cause = (cause as Error & { cause?: unknown }).cause
  }
  return 'Verification could not be completed.'
}
