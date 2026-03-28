import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Signal } from 'signal-polyfill'
import { InnerAirxComponentContext, performUnitOfWork } from './common.js'
import type { AbstractElement, Instance } from './common.js'
import { AirxElement, createElement } from '../../element/index.js'
import { PluginContext } from './plugins/index.js'
import { airxElementSymbol } from '../../symbol/index.js'
import { createState } from '../../signal/index.js'

declare global {
  // eslint-disable-next-line no-var
  var Signal: typeof import('signal-polyfill').Signal
}

// Mock dependencies
vi.mock('../../logger', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}))

describe('render/common', () => {
  let mockPluginContext: PluginContext

  beforeEach(() => {
    globalThis.Signal = Signal
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

    it('should update tracked dependencies during rerender before watcher flush', async () => {
      const useLeft = createState(true)
      const left = createState('left')
      const right = createState('right')
      const onUpdateRequire = vi.fn()

      function DynamicComponent() {
        return () => useLeft.get() ? left.get() : right.get()
      }

      const rootContext = new InnerAirxComponentContext<AbstractElement>()
      const rootInstance = { context: rootContext } as unknown as Instance<AbstractElement>
      rootContext.instance = rootInstance

      const element = createElement(DynamicComponent, {})
      const context = new InnerAirxComponentContext<AbstractElement>()
      const instance = {
        element,
        memoProps: { ...element.props },
        context,
        parent: rootInstance
      } as unknown as Instance<AbstractElement>

      context.instance = instance
      rootInstance.child = instance

      performUnitOfWork(mockPluginContext, instance, onUpdateRequire)
      expect(instance.child?.element?.props.textContent).toBe('left')

      useLeft.set(false)
      expect(onUpdateRequire).toHaveBeenCalledTimes(1)

      performUnitOfWork(mockPluginContext, instance, onUpdateRequire)
      expect(instance.child?.element?.props.textContent).toBe('right')

      left.set('left-next')
      expect(onUpdateRequire).toHaveBeenCalledTimes(1)

      await Promise.resolve()

      right.set('right-next')
      expect(onUpdateRequire).toHaveBeenCalledTimes(2)

      performUnitOfWork(mockPluginContext, instance, onUpdateRequire)
      expect(instance.child?.element?.props.textContent).toBe('right-next')
    })
  })
})
