import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AirxElement, Props } from '../../../element/index.js'
import { Instance } from '../common.js'
import { Plugin } from './plugin.js'

describe('Plugin Interface', () => {
  let mockInstance: Instance
  let mockElement: AirxElement
  let mockDom: Element
  let mockProps: Props

  beforeEach(() => {

    mockInstance = {
      element: {
        type: 'div',
        props: { id: 'test' }
      } as AirxElement,
      beforeElement: {
        type: 'div', 
        props: { id: 'old' }
      } as AirxElement,
      context: {
        injectedMap: new Map(),
        providedMap: new Map()
      }
    } as Instance

    mockElement = {
      type: 'span',
      props: { class: 'test' }
    } as AirxElement

    mockDom = document.createElement('div')
    mockProps = { id: 'test', class: 'example' }
  })

  describe('isReRender', () => {
    it('should be optional method', () => {
      const pluginWithoutReRender: Plugin = {}
      expect(pluginWithoutReRender.isReRender).toBeUndefined()
    })

    it('should return true to force re-render', () => {
      const plugin: Plugin = {
        isReRender: () => true
      }
      
      expect(plugin.isReRender!(mockInstance)).toBe(true)
    })

    it('should return void to let other plugins decide', () => {
      const plugin: Plugin = {
        isReRender: () => undefined
      }
      
      expect(plugin.isReRender!(mockInstance)).toBeUndefined()
    })

    it('should receive instance parameter', () => {
      const isReRenderSpy = vi.fn()
      const plugin: Plugin = {
        isReRender: isReRenderSpy
      }
      
      plugin.isReRender!(mockInstance)
      expect(isReRenderSpy).toHaveBeenCalledWith(mockInstance)
    })
  })

  describe('updateDom', () => {
    it('should be optional method', () => {
      const pluginWithoutUpdateDom: Plugin = {}
      expect(pluginWithoutUpdateDom.updateDom).toBeUndefined()
    })

    it('should accept dom, nextProps, and optional prevProps', () => {
      const updateDomSpy = vi.fn()
      const plugin: Plugin = {
        updateDom: updateDomSpy
      }
      
      const prevProps = { id: 'old' }
      plugin.updateDom!(mockDom, mockProps, prevProps)
      
      expect(updateDomSpy).toHaveBeenCalledWith(mockDom, mockProps, prevProps)
    })

    it('should work without prevProps parameter', () => {
      const updateDomSpy = vi.fn()
      const plugin: Plugin = {
        updateDom: updateDomSpy
      }
      
      plugin.updateDom!(mockDom, mockProps)
      
      expect(updateDomSpy).toHaveBeenCalledWith(mockDom, mockProps)
    })
  })

  describe('isReuseInstance', () => {
    it('should be optional method', () => {
      const pluginWithoutReuseInstance: Plugin = {}
      expect(pluginWithoutReuseInstance.isReuseInstance).toBeUndefined()
    })

    it('should return false to force instance recreation', () => {
      const plugin: Plugin = {
        isReuseInstance: () => false
      }
      
      expect(plugin.isReuseInstance!(mockInstance, mockElement)).toBe(false)
    })

    it('should return void to let other plugins decide', () => {
      const plugin: Plugin = {
        isReuseInstance: () => undefined
      }
      
      expect(plugin.isReuseInstance!(mockInstance, mockElement)).toBeUndefined()
    })

    it('should receive instance and nextElement parameters', () => {
      const isReuseInstanceSpy = vi.fn()
      const plugin: Plugin = {
        isReuseInstance: isReuseInstanceSpy
      }
      
      plugin.isReuseInstance!(mockInstance, mockElement)
      expect(isReuseInstanceSpy).toHaveBeenCalledWith(mockInstance, mockElement)
    })
  })

  describe('Plugin Implementation', () => {
    it('should allow implementing all methods', () => {
      const plugin: Plugin = {
        isReRender: vi.fn().mockReturnValue(true),
        updateDom: vi.fn(),
        isReuseInstance: vi.fn().mockReturnValue(false)
      }

      expect(typeof plugin.isReRender).toBe('function')
      expect(typeof plugin.updateDom).toBe('function') 
      expect(typeof plugin.isReuseInstance).toBe('function')
    })

    it('should allow implementing only specific methods', () => {
      const pluginOnlyReRender: Plugin = {
        isReRender: vi.fn()
      }

      const pluginOnlyUpdateDom: Plugin = {
        updateDom: vi.fn()
      }

      const pluginOnlyReuseInstance: Plugin = {
        isReuseInstance: vi.fn()
      }

      expect(pluginOnlyReRender.isReRender).toBeDefined()
      expect(pluginOnlyReRender.updateDom).toBeUndefined()
      expect(pluginOnlyReRender.isReuseInstance).toBeUndefined()

      expect(pluginOnlyUpdateDom.isReRender).toBeUndefined()
      expect(pluginOnlyUpdateDom.updateDom).toBeDefined()
      expect(pluginOnlyUpdateDom.isReuseInstance).toBeUndefined()

      expect(pluginOnlyReuseInstance.isReRender).toBeUndefined()
      expect(pluginOnlyReuseInstance.updateDom).toBeUndefined()
      expect(pluginOnlyReuseInstance.isReuseInstance).toBeDefined()
    })
  })
})
