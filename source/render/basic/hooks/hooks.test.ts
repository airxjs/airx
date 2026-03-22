import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { globalContext, onMounted, onUnmounted, inject, provide } from './hooks.js'
import { AirxComponentContext } from '../../../element/index.js'

describe('hooks', () => {
  let mockContext: AirxComponentContext

  beforeEach(() => {
    mockContext = {
      onMounted: vi.fn(),
      onUnmounted: vi.fn(),
      inject: vi.fn(),
      provide: vi.fn(),
      injectedMap: new Map(),
      providedMap: new Map()
    } as unknown as AirxComponentContext

    globalContext.current = mockContext
  })

  afterEach(() => {
    globalContext.current = null
    vi.clearAllMocks()
  })

  describe('globalContext', () => {
    it('should initialize with null current context', () => {
      globalContext.current = null
      expect(globalContext.current).toBe(null)
    })

    it('should allow setting current context', () => {
      expect(globalContext.current).toBe(mockContext)
    })
  })

  describe('onMounted', () => {
    it('should call context.onMounted with provided listener', () => {
      const listener = vi.fn()
      onMounted(listener)

      expect(mockContext.onMounted).toHaveBeenCalledWith(listener)
      expect(mockContext.onMounted).toHaveBeenCalledTimes(1)
    })

    it('should throw error when context is null', () => {
      globalContext.current = null

      expect(() => onMounted(vi.fn())).toThrow('Unable to find a valid component context')
    })
  })

  describe('onUnmounted', () => {
    it('should call context.onUnmounted with provided listener', () => {
      const listener = vi.fn()
      onUnmounted(listener)

      expect(mockContext.onUnmounted).toHaveBeenCalledWith(listener)
      expect(mockContext.onUnmounted).toHaveBeenCalledTimes(1)
    })

    it('should throw error when context is null', () => {
      globalContext.current = null

      expect(() => onUnmounted(vi.fn())).toThrow('Unable to find a valid component context')
    })
  })

  describe('inject', () => {
    it('should call context.inject with provided key', () => {
      const key = 'testKey'
      const expectedValue = 'testValue'
      
      vi.mocked(mockContext.inject).mockReturnValue(expectedValue)
      
      const result = inject(key)

      expect(mockContext.inject).toHaveBeenCalledWith(key)
      expect(mockContext.inject).toHaveBeenCalledTimes(1)
      expect(result).toBe(expectedValue)
    })

    it('should throw error when context is null', () => {
      globalContext.current = null

      expect(() => inject('key')).toThrow('Unable to find a valid component context')
    })
  })

  describe('provide', () => {
    it('should call context.provide with provided key and value', () => {
      const key = 'testKey'
      const value = 'testValue'
      
      provide(key, value)

      expect(mockContext.provide).toHaveBeenCalledWith(key, value)
      expect(mockContext.provide).toHaveBeenCalledTimes(1)
    })

    it('should throw error when context is null', () => {
      globalContext.current = null

      expect(() => provide('key', 'value')).toThrow('Unable to find a valid component context')
    })
  })
})
