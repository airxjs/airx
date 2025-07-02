import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PluginContext } from './context'
import { Plugin } from '../plugin'
import { BasicLogic } from '../internal/basic/basic'
import { InjectSystem } from '../internal/inject/inject'

// Mock the internal plugins
vi.mock('./internal/basic')
vi.mock('./internal/inject')

describe('PluginContext', () => {
  let pluginContext: PluginContext
  let mockPlugin: Plugin

  beforeEach(() => {
    vi.clearAllMocks()
    pluginContext = new PluginContext()
    
    mockPlugin = {
      isReRender: vi.fn(),
      updateDom: vi.fn(),
      isReuseInstance: vi.fn()
    }
  })

  describe('constructor', () => {
    it('should initialize with default plugins', () => {
      expect(pluginContext.plugins).toHaveLength(2)
      expect(pluginContext.plugins[0]).toBeInstanceOf(BasicLogic)
      expect(pluginContext.plugins[1]).toBeInstanceOf(InjectSystem)
    })
  })

  describe('registerPlugin', () => {
    it('should add a single plugin to the plugins array', () => {
      const initialLength = pluginContext.plugins.length
      
      pluginContext.registerPlugin(mockPlugin)
      
      expect(pluginContext.plugins).toHaveLength(initialLength + 1)
      expect(pluginContext.plugins[initialLength]).toBe(mockPlugin)
    })

    it('should add multiple plugins to the plugins array', () => {
      const mockPlugin2: Plugin = {
        isReRender: vi.fn(),
        updateDom: vi.fn(),
        isReuseInstance: vi.fn()
      }
      
      const initialLength = pluginContext.plugins.length
      
      pluginContext.registerPlugin(mockPlugin, mockPlugin2)
      
      expect(pluginContext.plugins).toHaveLength(initialLength + 2)
      expect(pluginContext.plugins[initialLength]).toBe(mockPlugin)
      expect(pluginContext.plugins[initialLength + 1]).toBe(mockPlugin2)
    })

    it('should maintain existing plugins when adding new ones', () => {
      const existingPlugins = [...pluginContext.plugins]
      
      pluginContext.registerPlugin(mockPlugin)
      
      existingPlugins.forEach((plugin, index) => {
        expect(pluginContext.plugins[index]).toBe(plugin)
      })
    })
  })

  describe('plugins array', () => {
    it('should be directly accessible', () => {
      expect(Array.isArray(pluginContext.plugins)).toBe(true)
    })

    it('should allow direct manipulation (though not recommended)', () => {
      const originalLength = pluginContext.plugins.length
      pluginContext.plugins.push(mockPlugin)
      
      expect(pluginContext.plugins).toHaveLength(originalLength + 1)
    })
  })
})
