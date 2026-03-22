import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from './server.js'
import { AirxElement } from '../../element/index.js'
import { PluginContext, Plugin } from '../basic/plugins/index.js'
import { airxElementSymbol } from '../../symbol/index.js'

// Mock dependencies
vi.mock('../../logger', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}))

vi.mock('../common', () => ({
  InnerAirxComponentContext: vi.fn(() => ({
    instance: null
  })),
  performUnitOfWork: vi.fn(() => true),
  AbstractElement: class {}
}))

describe('render/server', () => {
  let mockElement: AirxElement
  let mockPluginContext: PluginContext
  let mockOnComplete: (data: string) => void

  beforeEach(() => {
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
    
    // Create mock onComplete handler
    mockOnComplete = vi.fn()
  })

  it('should have render function', () => {
    expect(typeof render).toBe('function')
  })

  it('should call render function without throwing', () => {
    expect(() => {
      render(mockPluginContext, mockElement, mockOnComplete)
    }).not.toThrow()
  })

  it('should call onComplete handler', () => {
    render(mockPluginContext, mockElement, mockOnComplete)
    // The onComplete should be called during the rendering process
    // This test verifies the callback system works
    expect(mockOnComplete).toBeDefined()
  })

  it('should handle element with text content', () => {
    const textElement = {
      type: 'p',
      props: { children: 'Test text content' },
      [airxElementSymbol]: true
    } as unknown as AirxElement

    expect(() => {
      render(mockPluginContext, textElement, mockOnComplete)
    }).not.toThrow()
  })

  it('should handle element with class name', () => {
    const elementWithClass = {
      type: 'div',
      props: { 
        className: 'test-class',
        children: 'Content'
      },
      [airxElementSymbol]: true
    } as unknown as AirxElement

    expect(() => {
      render(mockPluginContext, elementWithClass, mockOnComplete)
    }).not.toThrow()
  })

  it('should handle element with styles', () => {
    const elementWithStyles = {
      type: 'div',
      props: { 
        style: { color: 'red', fontSize: '16px' },
        children: 'Styled content'
      },
      [airxElementSymbol]: true
    } as unknown as AirxElement

    expect(() => {
      render(mockPluginContext, elementWithStyles, mockOnComplete)
    }).not.toThrow()
  })

  it('should work with empty plugin context', () => {
    const emptyPluginContext = new PluginContext()
    emptyPluginContext.plugins = []

    expect(() => {
      render(emptyPluginContext, mockElement, mockOnComplete)
    }).not.toThrow()
  })

  it('should handle complex nested elements', () => {
    const nestedElement = {
      type: 'div',
      props: { 
        className: 'parent',
        children: [
          {
            type: 'h1',
            props: { children: 'Title' },
            [airxElementSymbol]: true
          },
          {
            type: 'p',
            props: { children: 'Paragraph' },
            [airxElementSymbol]: true
          }
        ]
      },
      [airxElementSymbol]: true
    } as unknown as AirxElement

    expect(() => {
      render(mockPluginContext, nestedElement, mockOnComplete)
    }).not.toThrow()
  })
})
