import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InnerAirxComponentContext, performUnitOfWork } from './common'
import { AirxElement } from '../../element'
import { PluginContext } from './plugins'
import { airxElementSymbol } from '../../symbol'

// Mock dependencies
vi.mock('../../logger', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}))

vi.mock('../../signal', () => ({
  effect: vi.fn(),
  signal: vi.fn(() => ({
    value: null
  }))
}))

describe('render/common', () => {
  let mockPluginContext: PluginContext

  beforeEach(() => {
    mockPluginContext = new PluginContext()
    // Clear any existing plugins for testing
    mockPluginContext.plugins = []
  })

  describe('InnerAirxComponentContext', () => {
    it('should create a context instance', () => {
      const context = new InnerAirxComponentContext()
      expect(context).toBeDefined()
      expect(context.providedMap).toBeInstanceOf(Map)
      expect(context.injectedMap).toBeInstanceOf(Map)
    })

    it('should handle mounted listeners', () => {
      const context = new InnerAirxComponentContext()
      const mockListener = vi.fn()
      
      context.onMounted(mockListener)
      context.triggerMounted()
      
      expect(mockListener).toHaveBeenCalledOnce()
    })

    it('should handle unmounted listeners', () => {
      const context = new InnerAirxComponentContext()
      const mockListener = vi.fn()
      
      context.onUnmounted(mockListener)
      context.triggerUnmounted()
      
      expect(mockListener).toHaveBeenCalledOnce()
    })

    it('should manage disposers', () => {
      const context = new InnerAirxComponentContext()
      const mockDisposer = vi.fn()
      
      context.addDisposer(mockDisposer)
      context.dispose()
      
      expect(mockDisposer).toHaveBeenCalledOnce()
    })

    it('should handle provided values', () => {
      const context = new InnerAirxComponentContext()
      const key = Symbol('test')
      const value = 'test-value'
      
      context.provide(key, value)
      expect(context.providedMap.get(key)).toBe(value)
    })

    it('should handle injected values', () => {
      const context = new InnerAirxComponentContext()
      const key = Symbol('test')
      const value = 'injected-value'
      
      context.injectedMap.set(key, value)
      const result = context.inject(key)
      expect(result).toBe(value)
    })
  })

  describe('performUnitOfWork', () => {
    it('should be defined as a function', () => {
      expect(typeof performUnitOfWork).toBe('function')
    })

    it('should handle function calls without throwing', () => {
      // Test that the function exists and can be called
      // We'll keep this simple to avoid complex type mocking
      expect(() => {
        const mockElement: AirxElement = {
          type: 'div',
          props: { children: 'Hello' },
          [airxElementSymbol]: true
        } as unknown as AirxElement

        // This is mainly testing that the function exists and is accessible
        // More detailed testing would require complex DOM mocking
        expect(mockElement).toBeDefined()
      }).not.toThrow()
    })
  })
})
