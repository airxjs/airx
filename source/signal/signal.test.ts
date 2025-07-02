import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock signal-polyfill
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockState = vi.fn().mockImplementation(function(this: any) {
  // Mock constructor behavior
})
const mockComputed = vi.fn().mockImplementation(() => ({}))
const mockWatcher = vi.fn().mockImplementation(() => ({}))

const mockSignal = {
  State: mockState,
  Computed: mockComputed,
  subtle: {
    Watcher: mockWatcher
  }
}

// Mock global Signal
beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).Signal = mockSignal
})

afterEach(() => {
  vi.clearAllMocks()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).Signal
})

describe('Signal Module', () => {
  beforeEach(async () => {
    // Reset module cache
    vi.resetModules()
  })

  describe('createState', () => {
    it('should create a new Signal.State instance', async () => {
      const { createState } = await import('./signal')
      
      const initialValue = 'test'
      createState(initialValue)

      expect(mockState).toHaveBeenCalledWith(initialValue, undefined)
    })

    it('should pass options to Signal.State', async () => {
      const { createState } = await import('./signal')
      
      const initialValue = 42
      const options = {}
      createState(initialValue, options)

      expect(mockState).toHaveBeenCalledWith(initialValue, options)
    })
  })

  describe('createComputed', () => {
    it('should create a new Signal.Computed instance', async () => {
      const { createComputed } = await import('./signal')
      
      const computation = () => 'computed'
      createComputed(computation)

      expect(mockComputed).toHaveBeenCalledWith(computation, undefined)
    })

    it('should pass options to Signal.Computed', async () => {
      const { createComputed } = await import('./signal')
      
      const computation = () => 42
      const options = {}
      createComputed(computation, options)

      expect(mockComputed).toHaveBeenCalledWith(computation, options)
    })
  })

  describe('createWatch', () => {
    it('should create a new Signal.subtle.Watcher instance', async () => {
      const { createWatch } = await import('./signal')
      
      const notify = vi.fn()
      createWatch(notify)

      expect(mockWatcher).toHaveBeenCalledWith(notify)
    })
  })

  describe('isState', () => {
    it('should return true for Signal.State instances', async () => {
      const { isState } = await import('./signal')
      
      const stateInstance = new mockState()
      const result = isState(stateInstance)

      expect(result).toBe(true)
    })

    it('should return false for non-Signal.State instances', async () => {
      const { isState } = await import('./signal')
      
      const notState = { value: 'not a state' }
      const result = isState(notState)

      expect(result).toBe(false)
    })

    it('should return false for null and undefined', async () => {
      const { isState } = await import('./signal')
      
      expect(isState(null)).toBe(false)
      expect(isState(undefined)).toBe(false)
    })
  })

  describe('error handling', () => {
    it('should throw error when Signal is undefined', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).Signal

      await expect(async () => {
        const { createState } = await import('./signal')
        createState('test')
      }).rejects.toThrow('Signal is undefined')
    })

    it('should throw error when Signal has multiple instances', async () => {
      const anotherMockState = vi.fn().mockImplementation(() => ({}))
      const anotherSignal = { 
        State: anotherMockState, 
        Computed: vi.fn(), 
        subtle: { Watcher: vi.fn() } 
      }
      
      const { createState } = await import('./signal')
      
      // First call establishes the first signal
      const state1 = createState('test1')
      expect(state1).toBeDefined()
      
      // Change the global Signal to simulate multiple instances
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(globalThis as any).Signal = anotherSignal

      expect(() => {
        createState('test2')
      }).toThrow('Signal have multiple instances')
    })
  })

  describe('global detection', () => {
    it('should work with self global', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).Signal
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(globalThis as any).self = { Signal: mockSignal }

      const { createState } = await import('./signal')
      createState('test')

      expect(mockState).toHaveBeenCalled()
    })

    it('should work with window global', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).Signal
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).self
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(globalThis as any).window = { Signal: mockSignal }

      const { createState } = await import('./signal')
      createState('test')

      expect(mockState).toHaveBeenCalled()
    })
  })
})
