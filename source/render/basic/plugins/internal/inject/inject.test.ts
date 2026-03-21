import { describe, it, expect, beforeEach } from 'vitest'
import { Instance } from '../../../common'
import { InjectSystem } from './inject'

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
})
