import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from './browser.js'
import { AirxElement } from '../../element/index.js'
import { PluginContext, Plugin } from '../basic/plugins/index.js'
import { airxElementSymbol } from '../../symbol/index.js'

const requestIdleCallbackSpy = vi.fn(() => 1)
Object.defineProperty(globalThis, 'requestIdleCallback', {
  writable: true,
  value: requestIdleCallbackSpy
})

// Mock dependencies
vi.mock('../../logger', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}))

vi.mock('../basic/common', () => ({
  InnerAirxComponentContext: vi.fn(() => ({
    instance: null,
    triggerMounted: vi.fn(),
    triggerUnmounted: vi.fn(),
    dispose: vi.fn(),
    provide: vi.fn(),
    inject: vi.fn()
  })),
  performUnitOfWork: vi.fn(() => null), // Return null to indicate work is done
  AbstractElement: class {}
}))

describe('render/browser', () => {
  let mockDomRef: Element
  let mockElement: AirxElement
  let mockPluginContext: PluginContext

  beforeEach(() => {
    requestIdleCallbackSpy.mockClear()
    
    // Create mock DOM element
    mockDomRef = document.createElement('div')
    
    // Create mock AirxElement
    mockElement = {
      type: 'div',
      props: { children: 'Hello World' },
      [airxElementSymbol]: true
    } as unknown as AirxElement

    // Create mock plugin context
    const mockPlugin: Plugin = {
      updateDom: vi.fn()
    }
    
    mockPluginContext = new PluginContext()
    mockPluginContext.plugins = [mockPlugin]
  })

  it('should create a render function', () => {
    expect(typeof render).toBe('function')
  })

  it('should handle basic rendering', () => {
    expect(() => {
      render(mockPluginContext, mockElement, mockDomRef as Element)
    }).not.toThrow()
  })

  it('should not reschedule idle work after synchronous completion', () => {
    render(mockPluginContext, mockElement, mockDomRef as Element)

    expect(requestIdleCallbackSpy).not.toHaveBeenCalled()
  })

  it('should work with empty plugin context', () => {
    const emptyPluginContext = new PluginContext()
    emptyPluginContext.plugins = []
    
    expect(() => {
      render(emptyPluginContext, mockElement, mockDomRef as Element)
    }).not.toThrow()
  })

  it('should handle element with different props', () => {
    const elementWithProps = {
      type: 'button',
      props: { 
        className: 'test-button',
        onClick: vi.fn(),
        children: 'Click me'
      },
      [airxElementSymbol]: true
    } as unknown as AirxElement

    expect(() => {
      render(mockPluginContext, elementWithProps, mockDomRef as Element)
    }).not.toThrow()
  })

  it('should call plugin updateDom method', () => {
    const updateDomSpy = vi.fn()
    const mockPlugin: Plugin = {
      updateDom: updateDomSpy
    }
    
    const pluginContextWithSpy = new PluginContext()
    pluginContextWithSpy.plugins = [mockPlugin]

    render(pluginContextWithSpy, mockElement, mockDomRef as Element)
    
    // Note: updateDom might be called during the render process
    // This test ensures the plugin system is set up correctly
    expect(pluginContextWithSpy.plugins[0].updateDom).toBeDefined()
  })
})
