import { describe, expect, it } from 'vitest'
import { TimeoutFailure } from '@temporalio/client'
import { verificationError } from './verificationError'

describe('verificationError', () => {
  it('recognizes wrapped Temporal timeouts', () => {
    const timeout = new TimeoutFailure('internal timeout details', undefined, 'START_TO_CLOSE')
    const failure = Object.assign(new Error('Workflow execution failed'), {
      cause: Object.assign(new Error('Activity failed'), { cause: timeout }),
    })
    expect(verificationError(failure)).toBe('Verification timed out.')
  })

  it('does not expose provider or database internals', () => {
    expect(verificationError(new Error('secret database details'))).toBe(
      'Verification could not be completed.'
    )
    expect(verificationError(null)).toBe('Verification could not be completed.')
  })

  it('handles cyclic causes', () => {
    const error = Object.assign(new Error('cycle'), { cause: {} })
    error.cause = error
    expect(verificationError(error)).toBe('Verification could not be completed.')
  })
})
