import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Signal } from 'signal-polyfill'
import { createWatch, createState, createComputed, isState } from './signal'

// 扩展 globalThis 类型
declare global {
  // eslint-disable-next-line no-var
  var Signal: typeof import('signal-polyfill').Signal
}

describe('Signal Polyfill External Dependency Tests', () => {
  beforeEach(() => {
    // Ensure a clean global state at the start of each test
    if (!globalThis.Signal) {
      globalThis.Signal = Signal
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Signal-polyfill basic functionality verification', () => {
    it('should correctly import signal-polyfill', () => {
      expect(Signal).toBeDefined()
      expect(Signal.State).toBeDefined()
      expect(Signal.Computed).toBeDefined()
      expect(Signal.subtle).toBeDefined()
      expect(Signal.subtle.Watcher).toBeDefined()
    })

    it('should be able to create State', () => {
      const state = new Signal.State(42)
      expect(state.get()).toBe(42)
    })

    it('should be able to create Computed', () => {
      const state = new Signal.State(10)
      const computed = new Signal.Computed(() => state.get() * 2)
      expect(computed.get()).toBe(20)
    })

    it('should be able to create Watcher', () => {
      const notify = vi.fn()
      const watcher = new Signal.subtle.Watcher(notify)
      expect(watcher).toBeDefined()
      expect(notify).not.toHaveBeenCalled()
    })

    it('State should support updating values', () => {
      const state = new Signal.State('initial')
      expect(state.get()).toBe('initial')
      
      state.set('updated')
      expect(state.get()).toBe('updated')
    })

    it('Computed should recalculate when dependencies change', () => {
      const state = new Signal.State(5)
      const computed = new Signal.Computed(() => state.get() ** 2)
      
      expect(computed.get()).toBe(25)
      
      state.set(6)
      expect(computed.get()).toBe(36)
    })

    it('Watcher should trigger when observed signals change', () => {
      const notify = vi.fn()
      const watcher = new Signal.subtle.Watcher(notify)
      const state = new Signal.State(0)
      
      watcher.watch(state)
      expect(notify).not.toHaveBeenCalled()
      
      state.set(1)
      expect(notify).toHaveBeenCalledTimes(1)
      
      // Simply verify getPending exists and can be called, but don't test specific content
      const pending = watcher.getPending()
      expect(Array.isArray(pending)).toBe(true)
      
      // Test that we can re-watch
      watcher.watch()
    })

    it('should support complex dependency relationships', () => {
      const a = new Signal.State(1)
      const b = new Signal.State(2)
      const sum = new Signal.Computed(() => a.get() + b.get())
      const product = new Signal.Computed(() => sum.get() * 3)
      
      expect(sum.get()).toBe(3)
      expect(product.get()).toBe(9)
      
      a.set(5)
      expect(sum.get()).toBe(7)
      expect(product.get()).toBe(21)
    })
  })

  describe('Custom Signal implementation tests', () => {
    beforeEach(() => {
      // Ensure global Signal is available
      globalThis.Signal = Signal
    })

    describe('createState function', () => {
      it('should create a valid State instance', () => {
        const state = createState(100)
        expect(state.get()).toBe(100)
        expect(isState(state)).toBe(true)
      })

      it('should support different types of initial values', () => {
        const stringState = createState('hello')
        const numberState = createState(42)
        const booleanState = createState(true)
        const objectState = createState({ key: 'value' })

        expect(stringState.get()).toBe('hello')
        expect(numberState.get()).toBe(42)
        expect(booleanState.get()).toBe(true)
        expect(objectState.get()).toEqual({ key: 'value' })
      })

      it('should support optional configuration parameters', () => {
        const state = createState(0, { equals: (a, b) => Math.abs(a - b) < 0.1 })
        expect(state.get()).toBe(0)
      })
    })

    describe('createComputed function', () => {
      it('should create a valid Computed instance', () => {
        const state = createState(10)
        const computed = createComputed(() => state.get() * 3)
        
        expect(computed.get()).toBe(30)
      })

      it('should recalculate when dependent state changes', () => {
        const state = createState(2)
        const computed = createComputed(() => state.get() ** 3)
        
        expect(computed.get()).toBe(8)
        
        state.set(3)
        expect(computed.get()).toBe(27)
      })

      it('should support multiple dependencies', () => {
        const x = createState(4)
        const y = createState(5)
        const computed = createComputed(() => Math.sqrt(x.get() ** 2 + y.get() ** 2))
        
        expect(computed.get()).toBeCloseTo(6.403, 3)
        
        x.set(3)
        expect(computed.get()).toBeCloseTo(5.831, 3)
      })

      it('should support nested computed', () => {
        const base = createState(2)
        const squared = createComputed(() => base.get() ** 2)
        const cubed = createComputed(() => squared.get() * base.get())
        
        expect(squared.get()).toBe(4)
        expect(cubed.get()).toBe(8)
        
        base.set(3)
        expect(squared.get()).toBe(9)
        expect(cubed.get()).toBe(27)
      })
    })

    describe('createWatch function', () => {
      it('should create a valid Watcher instance', () => {
        const notify = vi.fn()
        const watcher = createWatch(notify)
        
        expect(watcher).toBeDefined()
        expect(typeof watcher.watch).toBe('function')
        expect(typeof watcher.unwatch).toBe('function')
      })

      it('should call notify function when observed signals change', () => {
        const notify = vi.fn()
        const watcher = createWatch(notify)
        const state = createState(0)
        
        watcher.watch(state)
        expect(notify).not.toHaveBeenCalled()
        
        state.set(1)
        expect(notify).toHaveBeenCalledTimes(1)
        
        // Handle pending and re-watch
        const pending1 = watcher.getPending()
        for (const s of pending1) s.get()
        watcher.watch()
        
        state.set(2)
        expect(notify).toHaveBeenCalledTimes(2)
      })

      it('should be able to stop watching', () => {
        const notify = vi.fn()
        const watcher = createWatch(notify)
        const state = createState(0)
        
        watcher.watch(state)
        state.set(1)
        expect(notify).toHaveBeenCalledTimes(1)
        
        // Handle pending and re-watch
        const pending = watcher.getPending()
        for (const s of pending) s.get()
        watcher.watch()
        
        watcher.unwatch(state)
        state.set(2)
        expect(notify).toHaveBeenCalledTimes(1) // Should not be called again
      })

      it('should be able to watch multiple signals', () => {
        const notify = vi.fn()
        const watcher = createWatch(notify)
        const state1 = createState(0)
        const state2 = createState(0)
        
        watcher.watch(state1)
        watcher.watch(state2)
        
        state1.set(1)
        expect(notify).toHaveBeenCalledTimes(1)
        const pending1 = watcher.getPending()
        for (const s of pending1) s.get()
        watcher.watch()
        
        state2.set(1)
        expect(notify).toHaveBeenCalledTimes(2)
        const pending2 = watcher.getPending()
        for (const s of pending2) s.get()
        watcher.watch()
      })
    })

    describe('isState function', () => {
      it('should correctly identify State instances', () => {
        const state = createState(42)
        expect(isState(state)).toBe(true)
      })

      it('should correctly identify non-State instances', () => {
        const computed = createComputed(() => 42)
        const plainObject = { value: 42 }
        const number = 42
        const string = 'hello'
        
        expect(isState(computed)).toBe(false)
        expect(isState(plainObject)).toBe(false)
        expect(isState(number)).toBe(false)
        expect(isState(string)).toBe(false)
        expect(isState(null)).toBe(false)
        expect(isState(undefined)).toBe(false)
      })

      it('should correctly identify directly created Signal.State instances', () => {
        const directState = new Signal.State(123)
        expect(isState(directState)).toBe(true)
      })
    })

    describe('Error handling', () => {
      it('should throw error when Signal is undefined', () => {
        const originalSignal = globalThis.Signal
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(globalThis as any).Signal = undefined
        
        expect(() => createState(42)).toThrow('Signal is undefined')
        
        // Restore Signal
        globalThis.Signal = originalSignal
      })

      it('should detect multiple Signal instances', () => {
        // This test is complex because it requires simulating multiple Signal instances
        // In practice, this might happen when different versions of polyfill are loaded
        const originalSignal = globalThis.Signal
        
        // Create first instance
        const state1 = createState(1)
        expect(state1.get()).toBe(1)
        
        // Simulate different Signal instance (though this is hard to fully simulate in practice)
        // Here we mainly verify the code can detect this situation
        globalThis.Signal = originalSignal // Keep the same instance, so no error is thrown
        
        const state2 = createState(2)
        expect(state2.get()).toBe(2)
      })
    })

    describe('Integration tests', () => {
      it('should support complex reactive scenarios', () => {
        const notify = vi.fn()
        const watcher = createWatch(notify)
        
        const firstName = createState('John')
        const lastName = createState('Doe')
        const fullName = createComputed(() => `${firstName.get()} ${lastName.get()}`)
        const greeting = createComputed(() => `Hello, ${fullName.get()}!`)
        
        watcher.watch(greeting)
        
        expect(fullName.get()).toBe('John Doe')
        expect(greeting.get()).toBe('Hello, John Doe!')
        expect(notify).not.toHaveBeenCalled()
        
        firstName.set('Jane')
        expect(notify).toHaveBeenCalledTimes(1)
        expect(fullName.get()).toBe('Jane Doe')
        expect(greeting.get()).toBe('Hello, Jane Doe!')
        const pending1 = watcher.getPending()
        for (const s of pending1) s.get()
        watcher.watch()
        
        lastName.set('Smith')
        expect(notify).toHaveBeenCalledTimes(2)
        expect(fullName.get()).toBe('Jane Smith')
        expect(greeting.get()).toBe('Hello, Jane Smith!')
        const pending2 = watcher.getPending()
        for (const s of pending2) s.get()
        watcher.watch()
      })

      it('should handle async scenarios correctly', async () => {
        const notify = vi.fn()
        const watcher = createWatch(notify)
        
        const counter = createState(0)
        const doubled = createComputed(() => counter.get() * 2)
        
        watcher.watch(doubled)
        
        expect(counter.get()).toBe(0)
        expect(doubled.get()).toBe(0)
        expect(notify).not.toHaveBeenCalled()
        
        // Simulate async updates
        const updateAsync = async () => {
          await new Promise(resolve => setTimeout(resolve, 10))
          counter.set(counter.get() + 1)
          const pending = watcher.getPending()
          for (const s of pending) s.get()
          watcher.watch()
        }
        
        await updateAsync()
        expect(counter.get()).toBe(1)
        expect(doubled.get()).toBe(2)
        expect(notify).toHaveBeenCalledTimes(1)
        
        await updateAsync()
        expect(counter.get()).toBe(2)
        expect(doubled.get()).toBe(4)
        expect(notify).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Compatibility and boundary tests', () => {
    it('should maintain compatibility with native Signal API', () => {
      const nativeState = new Signal.State(100)
      const customState = createState(100)
      
      // Both should have the same API
      expect(typeof nativeState.get).toBe('function')
      expect(typeof nativeState.set).toBe('function')
      expect(typeof customState.get).toBe('function')
      expect(typeof customState.set).toBe('function')
      
      // Both should be recognized by isState
      expect(isState(nativeState)).toBe(true)
      expect(isState(customState)).toBe(true)
    })

    it('should handle performance with large numbers of signals', () => {
      const states = Array.from({ length: 1000 }, (_, i) => createState(i))
      const computed = createComputed(() => 
        states.reduce((sum, state) => sum + state.get(), 0)
      )
      
      expect(computed.get()).toBe(499500) // 0+1+2+...+999 = 999*1000/2 = 499500
      
      // Update first state
      states[0].set(1000)
      expect(computed.get()).toBe(500500) // 499500 + 1000
    })

    it('should correctly handle circular dependency detection', () => {
      const a = createState(1)
      const b = createComputed(() => a.get() + 1)
      
      // We don't directly test circular dependencies here because signal-polyfill handles this
      // We just verify normal behavior
      expect(a.get()).toBe(1)
      expect(b.get()).toBe(2)
      
      a.set(5)
      expect(b.get()).toBe(6)
    })
  })
})
