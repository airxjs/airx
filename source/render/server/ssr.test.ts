import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSSRApp, renderToString, hydrate } from './server.js'
import { createElement } from '../../element/index.js'
import { PluginContext, Plugin } from '../basic/plugins/index.js'

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
    instance: null,
    triggerMounted: vi.fn(),
    triggerUnmounted: vi.fn()
  })),
  performUnitOfWork: vi.fn(() => true),
  AbstractElement: class {}
}))

describe('SSR API', () => {
  let mockPluginContext: PluginContext

  beforeEach(() => {
    const mockPlugin: Plugin = {
      updateDom: vi.fn()
    }
    mockPluginContext = new PluginContext()
    mockPluginContext.plugins = [mockPlugin]
  })

  describe('createSSRApp', () => {
    it('should create SSR app with element', () => {
      const element = createElement('div', { children: 'Hello' })
      const app = createSSRApp(element)
      expect(app).toBeDefined()
      expect(typeof app.renderToString).toBe('function')
      expect(typeof app.hydrate).toBe('function')
    })

    it('should create SSR app with component function', () => {
      const TestComponent = () => createElement('div', { children: 'Component' })
      const app = createSSRApp(TestComponent)
      expect(app).toBeDefined()
      expect(typeof app.renderToString).toBe('function')
    })

    it('should create SSR app with complex element', () => {
      const element = createElement('div', {
        className: 'container',
        children: [
          createElement('h1', { children: 'Title' }),
          createElement('p', { children: 'Paragraph' })
        ]
      })
      const app = createSSRApp(element)
      expect(app).toBeDefined()
    })
  })

  describe('renderToString', () => {
    it('should render element to string', async () => {
      const element = createElement('div', { children: 'Hello World' })
      const app = createSSRApp(element)
      const html = await renderToString(app)
      expect(html).toContain('Hello World')
    })

    it('should render element with class', async () => {
      const element = createElement('div', {
        className: 'test-class',
        children: 'Content'
      })
      const app = createSSRApp(element)
      const html = await renderToString(app)
      expect(html).toContain('test-class')
    })

    it('should render nested elements', async () => {
      const element = createElement('div', {
        className: 'parent',
        children: [
          createElement('h1', { children: 'Title' }),
          createElement('p', { children: 'Paragraph' })
        ]
      })
      const app = createSSRApp(element)
      const html = await renderToString(app)
      expect(html).toContain('Title')
      expect(html).toContain('Paragraph')
    })

    it('should render element with styles', async () => {
      const element = createElement('div', {
        style: { color: 'red', fontSize: '16px' },
        children: 'Styled'
      })
      const app = createSSRApp(element)
      const html = await renderToString(app)
      expect(html).toContain('color:red')
      expect(html).toContain('font-size:16px')
    })

    it('should render nested parent-child component hierarchy', async () => {
      const ChildComponent = () => createElement('span', { children: 'Child Content' })
      const element = createElement('div', {
        className: 'parent',
        children: [
          createElement('h1', { children: 'Parent Title' }),
          createElement(ChildComponent, {})
        ]
      })
      const app = createSSRApp(element)
      const html = await renderToString(app)
      expect(html).toContain('Parent Title')
      expect(html).toContain('Child Content')
      expect(html).toContain('<span>Child Content</span>')
    })

    it('should render element with dynamic props', async () => {
      const title = 'Dynamic Title'
      const element = createElement('div', {
        className: 'dynamic',
        'data-id': '123',
        children: title
      })
      const app = createSSRApp(element)
      const html = await renderToString(app)
      expect(html).toContain('Dynamic Title')
      expect(html).toContain('data-id="123"')
    })

    it('should render conditional content (ternary)', async () => {
      const showContent = true
      const element = createElement('div', {
        children: showContent ? 'Shown' : 'Hidden'
      })
      const app = createSSRApp(element)
      const html = await renderToString(app)
      expect(html).toContain('Shown')
      expect(html).not.toContain('Hidden')
    })

    it('should render list content (map)', async () => {
      const items = ['Item 1', 'Item 2', 'Item 3']
      const element = createElement('ul', {
        children: items.map(item => createElement('li', { key: item, children: item }))
      })
      const app = createSSRApp(element)
      const html = await renderToString(app)
      expect(html).toContain('Item 1')
      expect(html).toContain('Item 2')
      expect(html).toContain('Item 3')
    })
  })

  describe('renderToString 渲染稳定性', () => {
    it('should produce same output for same input (幂等性)', async () => {
      const element = createElement('div', {
        className: 'stable',
        children: [
          createElement('h1', { children: 'Title' }),
          createElement('p', { children: 'Content' })
        ]
      })
      const app = createSSRApp(element)
      const html1 = await renderToString(app)
      const html2 = await renderToString(app)
      expect(html1).toBe(html2)
    })

    it('should produce same output for identical elements', async () => {
      const element1 = createElement('div', { children: 'Same' })
      const element2 = createElement('div', { children: 'Same' })
      const app1 = createSSRApp(element1)
      const app2 = createSSRApp(element2)
      const html1 = await renderToString(app1)
      const html2 = await renderToString(app2)
      expect(html1).toBe(html2)
    })

    it('should allow same SSRApp instance to render multiple times', async () => {
      const element = createElement('div', { children: 'Reusable' })
      const app = createSSRApp(element)
      const html1 = await app.renderToString()
      const html2 = await app.renderToString()
      const html3 = await app.renderToString()
      expect(html1).toBe(html2)
      expect(html2).toBe(html3)
      expect(html1).toContain('Reusable')
    })
  })

  describe('hydrate', () => {
    it('should have hydrate function', () => {
      expect(typeof hydrate).toBe('function')
    })

    it('should accept correct signature (html, container, app)', () => {
      const element = createElement('div', { children: 'Hello' })
      const app = createSSRApp(element)
      // Mock container
      const container = document.createElement('div')
      container.innerHTML = '<div>Hello</div>'
      // This should not throw
      expect(() => hydrate('<div>Hello</div>', container, app)).not.toThrow()
    })
  })

  describe('SSRApp 接口完整性', () => {
    it('should return Promise from renderToString', () => {
      const element = createElement('div', { children: 'Test' })
      const app = createSSRApp(element)
      const result = app.renderToString()
      expect(result).toBeInstanceOf(Promise)
    })

    it('should have hydrate method on returned app', () => {
      const element = createElement('div', { children: 'Test' })
      const app = createSSRApp(element)
      expect(typeof app.hydrate).toBe('function')
    })

    it('should export both createSSRApp and renderToString', async () => {
      const element = createElement('span', { children: 'Exported' })
      const app = createSSRApp(element)
      // Test direct app.renderToString()
      const html = await app.renderToString()
      expect(html).toContain('Exported')
      // Test standalone renderToString()
      const html2 = await renderToString(app)
      expect(html2).toContain('Exported')
    })
  })
})
