import { describe, it, expect, beforeEach } from 'vitest'
import { Instance, InnerAirxComponentContext } from '../../../common.js'
import { InjectSystem } from './inject.js'

describe('InjectSystem', () => {
  let injectSystem: InjectSystem
  let mockInstance: Instance
  let mockParentInstance: Instance

  beforeEach(() => {
    injectSystem = new InjectSystem()
    
    mockParentInstance = {
      context: {
        providedMap: new Map([
          ['parentKey', 'parentValue'],
          ['sharedKey', 'parentSharedValue']
        ]),
        injectedMap: new Map()
      },
      parent: undefined
    } as Instance

    mockInstance = {
      context: {
        injectedMap: new Map([
          ['testKey', 'testValue'],
          ['sharedKey', 'childSharedValue']
        ]),
        providedMap: new Map()
      },
      parent: mockParentInstance
    } as Instance
  })

  describe('isReuseInstance', () => {
    it('should return undefined when no injected keys exist', () => {
      mockInstance.context.injectedMap.clear()
      
      const result = injectSystem.isReuseInstance(mockInstance)
      
      expect(result).toBeUndefined()
    })

    it('should return undefined when all injected values match parent provided values', () => {
      // Set up matching values
      mockInstance.context.injectedMap.clear()
      mockInstance.context.injectedMap.set('parentKey', 'parentValue')
      
      const result = injectSystem.isReuseInstance(mockInstance)
      
      expect(result).toBeUndefined()
    })

    it('should return false when injected value differs from parent provided value', () => {
      // Set up a value that has changed
      mockInstance.context.injectedMap.clear()
      mockInstance.context.injectedMap.set('parentKey', 'oldParentValue')
      
      const result = injectSystem.isReuseInstance(mockInstance)
      
      expect(result).toBe(false)
    })

    it('should return false when injected key no longer exists in parent', () => {
      mockInstance.context.injectedMap.clear()
      mockInstance.context.injectedMap.set('nonExistentKey', 'someValue')
      
      const result = injectSystem.isReuseInstance(mockInstance)
      
      expect(result).toBe(false)
    })

    it('should handle instance without parent', () => {
      const instanceWithoutParent = {
        context: {
          injectedMap: new Map([['testKey', 'testValue']]),
          providedMap: new Map()
        },
        parent: undefined
      } as Instance

      const result = injectSystem.isReuseInstance(instanceWithoutParent)
      
      expect(result).toBe(false)
    })

    it('should handle mixed matching and non-matching values correctly', () => {
      // Clear existing and set specific test values
      mockInstance.context.injectedMap.clear()
      
      // This should match (parent has 'parentKey': 'parentValue')
      mockInstance.context.injectedMap.set('parentKey', 'parentValue')
      
      // This should not match (different value)
      mockInstance.context.injectedMap.set('sharedKey', 'wrongValue')
      
      const result = injectSystem.isReuseInstance(mockInstance)
      
      expect(result).toBe(false)
    })

    it('should work with nested parent hierarchy', () => {
      const grandParentInstance = {
        context: {
          providedMap: new Map([['grandParentKey', 'grandParentValue']]),
          injectedMap: new Map()
        },
        parent: undefined
      } as Instance

      mockParentInstance.parent = grandParentInstance
      
      // Test value from grandparent
      mockInstance.context.injectedMap.clear()
      mockInstance.context.injectedMap.set('grandParentKey', 'grandParentValue')
      
      const result = injectSystem.isReuseInstance(mockInstance)
      
      expect(result).toBeUndefined()
    })

    it('should prioritize closer parent values', () => {
      const grandParentInstance = {
        context: {
          providedMap: new Map([['sharedKey', 'grandParentSharedValue']]),
          injectedMap: new Map()
        },
        parent: undefined
      } as Instance

      mockParentInstance.parent = grandParentInstance
      
      // Should match parent value, not grandparent value
      mockInstance.context.injectedMap.clear()
      mockInstance.context.injectedMap.set('sharedKey', 'parentSharedValue')
      
      const result = injectSystem.isReuseInstance(mockInstance)
      
      expect(result).toBeUndefined()
    })

    it('should return false for first mismatch in multiple injected values', () => {
      mockInstance.context.injectedMap.clear()
      
      // Set up multiple values where first one mismatches
      mockInstance.context.injectedMap.set('nonExistentKey1', 'value1')
      mockInstance.context.injectedMap.set('parentKey', 'parentValue') // This would match
      mockInstance.context.injectedMap.set('nonExistentKey2', 'value2')
      
      const result = injectSystem.isReuseInstance(mockInstance)
      
      expect(result).toBe(false)
    })
  })

  describe('provide/inject value change scenarios', () => {
    it('should detect when parent provide value changes from old to new', () => {
      // Clear and set up: parent provides 'theme' as 'light', child injects 'theme' as 'light'
      mockInstance.context.injectedMap.clear()
      mockParentInstance.context.providedMap.set('theme', 'light')
      mockInstance.context.injectedMap.set('theme', 'light')

      let result = injectSystem.isReuseInstance(mockInstance)
      expect(result).toBeUndefined() // Values match, reuse ok

      // Parent changes provide value to 'dark'
      mockParentInstance.context.providedMap.set('theme', 'dark')

      // Child still has 'light' in injectedMap - mismatch!
      result = injectSystem.isReuseInstance(mockInstance)
      expect(result).toBe(false) // Should NOT reuse - value changed
    })

    it('should detect when parent provide key is removed', () => {
      // Clear and set up: parent provides 'removableKey', child injects 'removableKey'
      mockInstance.context.injectedMap.clear()
      mockParentInstance.context.providedMap.set('removableKey', 'value')
      mockInstance.context.injectedMap.set('removableKey', 'value')

      let result = injectSystem.isReuseInstance(mockInstance)
      expect(result).toBeUndefined() // Values match

      // Parent removes the key
      mockParentInstance.context.providedMap.delete('removableKey')

      // Child has 'value' but parent has undefined - mismatch
      result = injectSystem.isReuseInstance(mockInstance)
      expect(result).toBe(false)
    })

    it('should handle Symbol keys for provide/inject', () => {
      const themeKey = Symbol('theme')

      // Clear and set up: parent provides themeKey, child injects themeKey
      mockInstance.context.injectedMap.clear()
      mockParentInstance.context.providedMap.set(themeKey, 'dark')
      mockInstance.context.injectedMap.set(themeKey, 'dark')

      const result = injectSystem.isReuseInstance(mockInstance)
      expect(result).toBeUndefined() // Match, reuse ok

      // Change parent value
      mockParentInstance.context.providedMap.set(themeKey, 'light')

      // Child still has old value
      const resultAfterChange = injectSystem.isReuseInstance(mockInstance)
      expect(resultAfterChange).toBe(false) // Mismatch
    })

    it('should handle nested provider chains', () => {
      const grandParentInstance = {
        context: {
          providedMap: new Map([['topLevel', 'grandparent-value']]),
          injectedMap: new Map()
        },
        parent: undefined
      } as Instance

      mockParentInstance.parent = grandParentInstance
      mockParentInstance.context.providedMap.set('midLevel', 'parent-value')
      // Clear and set up: child injects both keys
      mockInstance.context.injectedMap.clear()
      mockInstance.context.injectedMap.set('topLevel', 'grandparent-value')
      mockInstance.context.injectedMap.set('midLevel', 'parent-value')

      const result = injectSystem.isReuseInstance(mockInstance)
      expect(result).toBeUndefined() // All match

      // Change grandparent-level value
      grandParentInstance.context.providedMap.set('topLevel', 'changed')

      const resultAfterChange = injectSystem.isReuseInstance(mockInstance)
      expect(resultAfterChange).toBe(false) // Should not reuse
    })
  })

  describe('inject via InnerAirxComponentContext', () => {
    it('should inject values from parent context chain', () => {
      const parentContext = new InnerAirxComponentContext()
      const childContext = new InnerAirxComponentContext()

      // Create mock parent instance
      const parentInstance = {
        context: parentContext
      } as Instance
      parentContext.instance = parentInstance

      // Create mock child instance with parent reference
      const childInstance = {
        context: childContext,
        parent: parentInstance
      } as Instance
      childContext.instance = childInstance

      // Parent provides a value
      const themeKey = Symbol('theme')
      parentContext.provide(themeKey, 'dark')

      // Child injects - should get parent's value
      const injectedValue = childContext.inject(themeKey)
      expect(injectedValue).toBe('dark')
    })

    it('should return undefined when no parent provides the key', () => {
      const childContext = new InnerAirxComponentContext()
      const childInstance = {
        context: childContext,
        parent: undefined
      } as Instance
      childContext.instance = childInstance

      const nonExistentKey = Symbol('nonExistent')
      const result = childContext.inject(nonExistentKey)
      expect(result).toBeUndefined()
    })

    it('should prefer closer parent over distant ancestor', () => {
      const key = Symbol('shared')

      const grandparentContext = new InnerAirxComponentContext()
      const grandparentInstance = { context: grandparentContext } as Instance
      grandparentContext.instance = grandparentInstance

      const parentContext = new InnerAirxComponentContext()
      const parentInstance = {
        context: parentContext,
        parent: grandparentInstance
      } as Instance
      parentContext.instance = parentInstance

      const childContext = new InnerAirxComponentContext()
      const childInstance = {
        context: childContext,
        parent: parentInstance
      } as Instance
      childContext.instance = childInstance

      // Grandparent provides 'grandparent-value'
      grandparentContext.provide(key, 'grandparent-value')
      // Parent provides 'parent-value' (closer)
      parentContext.provide(key, 'parent-value')

      // Child should get parent's value, not grandparent's
      const injectedValue = childContext.inject(key)
      expect(injectedValue).toBe('parent-value')
    })
  })

  describe('provide updater function', () => {
    it('should allow updating provided values via returned function', () => {
      const context = new InnerAirxComponentContext()
      const key = Symbol('counter')

      // Initial provide - stores value directly, returns updater function
      const updater = context.provide(key, 0)
      expect(context.providedMap.get(key)).toBe(0)

      // Call the updater function to update
      updater((old: number) => old + 1)

      // After update, the value should be 1
      expect(context.providedMap.get(key)).toBe(1)
    })

    it('should handle direct value update via returned function', () => {
      const context = new InnerAirxComponentContext()
      const key = Symbol('value')

      // Provide initial value - returns updater function
      const updater = context.provide(key, 'initial')
      expect(context.providedMap.get(key)).toBe('initial')

      // Use updater to set new value directly
      updater('updated')

      // The value should now be 'updated'
      expect(context.providedMap.get(key)).toBe('updated')
    })

    it('should provide return an updater that can update multiple times', () => {
      const context = new InnerAirxComponentContext()
      const key = Symbol('counter')

      const updater = context.provide(key, 10)
      expect(context.providedMap.get(key)).toBe(10)

      updater(20)
      expect(context.providedMap.get(key)).toBe(20)

      updater((old) => old * 2)
      expect(context.providedMap.get(key)).toBe(40)
    })
  })
})
