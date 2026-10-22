import { describe, expect, it } from 'vitest'
import path from 'path'
import { normalizeCountryCode } from './countryCode'

describe('country normalization', () => {
  it.each([
    [' us ', 'US', false],
    ['uk', 'GB', false],
    ['GB', 'GB', false],
    ['TV', 'TV', false],
    ['BQ', 'BQ', false],
    ['XXX', null, true],
    ['12', null, true],
    ['ZZ', null, true],
    ['USA', null, true],
    ['', null, false],
    ['  ', null, false],
    [null, null, false],
    [undefined, null, false],
    [12, null, true],
    [false, null, true],
    [{ countryCode: 'US' }, null, true],
    [['US'], null, true],
  ])('handles %j without guessing a country', (input, countryCode, warned) => {
    const result = normalizeCountryCode(input)
    expect(result.countryCode).toBe(countryCode)
    expect(!!result.warning).toBe(warned)
  })

  it('keeps frontend and backend decisions identical for every two-letter code and malformed input', async () => {
    // Dynamic test-only import avoids coupling the independent production builds.
    const frontendPath = path.resolve(__dirname, '../../../frontend/src/utils/countryCode.ts')
    const frontend = await import(frontendPath)
    const inputs: unknown[] = [null, undefined, '', ' ', 'XXX', '12', 12, false, {}, [], 'UK', 'USA']
    for (const first of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
      for (const last of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') inputs.push(` ${first.toLowerCase()}${last} `)
    }
    for (const input of inputs) {
      expect(frontend.normalizeCountryCode(input), String(input)).toEqual(normalizeCountryCode(input))
    }
  })
})
