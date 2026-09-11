import { describe, expect, it } from 'vitest'
import {
  back,
  EMPTY_SETUP,
  flipCoin,
  isComputer,
  roleLabel,
  roleOf,
  stepFor,
  tossWinner,
  type Setup,
} from './setup'

const pvc: Setup = { ...EMPTY_SETUP, mode: 'pvc', difficulty: 'hard' }
const pvp: Setup = { ...EMPTY_SETUP, mode: 'pvp' }

describe('tossWinner', () => {
  it('gives it to the caller when the flip matches the call', () => {
    expect(tossWinner('heads', 'heads')).toBe('first')
    expect(tossWinner('tails', 'tails')).toBe('first')
  })

  it('gives it to the other side otherwise', () => {
    expect(tossWinner('heads', 'tails')).toBe('second')
    expect(tossWinner('tails', 'heads')).toBe('second')
  })
})

describe('flipCoin', () => {
  it('can produce either face', () => {
    expect(flipCoin(() => 0.1)).toBe('heads')
    expect(flipCoin(() => 0.9)).toBe('tails')
  })
})

describe('stepFor', () => {
  it('starts at the mode screen', () => {
    expect(stepFor(EMPTY_SETUP)).toBe('mode')
  })

  it('asks for a difficulty only against the computer', () => {
    expect(stepFor({ ...EMPTY_SETUP, mode: 'pvc' })).toBe('difficulty')
    expect(stepFor(pvp)).toBe('toss')
  })

  it('runs the toss, then the mark choice, then play', () => {
    expect(stepFor(pvc)).toBe('toss')
    const tossed: Setup = { ...pvc, call: 'heads', flip: 'heads' }
    expect(stepFor(tossed)).toBe('mark')
    expect(stepFor({ ...tossed, startingMark: 'X' })).toBe('play')
  })
})

describe('back', () => {
  it('leaves for the menu from the mode screen', () => {
    expect(back(EMPTY_SETUP)).toBeNull()
  })

  it('returns to the mode screen from difficulty', () => {
    expect(stepFor(back({ ...EMPTY_SETUP, mode: 'pvc' })!)).toBe('mode')
  })

  it('skips the difficulty screen going back in hot-seat play', () => {
    expect(stepFor(back(pvp)!)).toBe('mode')
  })

  it('returns to difficulty from the toss against the computer', () => {
    expect(stepFor(back(pvc)!)).toBe('difficulty')
  })

  // The design doc is explicit: stepping back undoes the toss so it is
  // re-flipped, rather than replaying the same result.
  it('undoes the toss when stepping back from the mark choice', () => {
    const tossed: Setup = { ...pvc, call: 'heads', flip: 'heads' }
    const previous = back(tossed)!
    expect(stepFor(previous)).toBe('toss')
    expect(previous.call).toBeNull()
    expect(previous.flip).toBeNull()
  })
})

describe('roleLabel', () => {
  it('names the sides differently for hot-seat and computer play', () => {
    expect(roleLabel('pvc', 'first')).toBe('Player')
    expect(roleLabel('pvc', 'second')).toBe('Computer')
    expect(roleLabel('pvp', 'first')).toBe('Player 1')
    expect(roleLabel('pvp', 'second')).toBe('Player 2')
  })
})

describe('roleOf / isComputer', () => {
  it('gives the toss winner the mark they chose', () => {
    // Player called right, so they pick — they take O and move first.
    const setup: Setup = {
      ...pvc,
      call: 'heads',
      flip: 'heads',
      startingMark: 'O',
    }
    expect(roleOf(setup, 'O')).toBe('first')
    expect(roleOf(setup, 'X')).toBe('second')
    expect(isComputer(setup, 'X')).toBe(true)
    expect(isComputer(setup, 'O')).toBe(false)
  })

  it('gives the computer the starting mark when it wins the toss', () => {
    const setup: Setup = {
      ...pvc,
      call: 'heads',
      flip: 'tails',
      startingMark: 'X',
    }
    expect(roleOf(setup, 'X')).toBe('second')
    expect(isComputer(setup, 'X')).toBe(true)
    expect(isComputer(setup, 'O')).toBe(false)
  })

  it('never reports a computer in hot-seat play', () => {
    const setup: Setup = {
      ...pvp,
      call: 'heads',
      flip: 'tails',
      startingMark: 'X',
    }
    expect(isComputer(setup, 'X')).toBe(false)
    expect(isComputer(setup, 'O')).toBe(false)
  })
})
