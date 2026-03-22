import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApp, AirxApp } from './app.js'
import { createElement } from '../element/index.js'

// Mock the render functions
vi.mock('../render', () => ({
  browserRender: vi.fn(),
  serverRender: vi.fn((context: unknown, element: unknown, callback: (html: string) => void) => {
    // Simulate async server rendering
    setTimeout(() => callback('<div>Server rendered content</div>'), 0)
  }),
  PluginContext: vi.fn().mockImplementation(() => ({
    plugins: [],
    registerPlugin: vi.fn()
  }))
}))

describe('App Module', () => {
  let mockContainer: Partial<HTMLElement>

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Create a mock DOM container
    mockContainer = {
      innerHTML: '',
      appendChild: vi.fn(),
      removeChild: vi.fn()
    }
  })

  describe('createApp', () => {
    it('should create an app with an element', () => {
      const element = createElement('div', {}, 'Hello World')
      const app = createApp(element)
      
      expect(app).toBeDefined()
      expect(typeof app.mount).toBe('function')
      expect(typeof app.plugin).toBe('function')
      expect(typeof app.renderToHTML).toBe('function')
    })

    it('should create an app with a component function', () => {
      const TestComponent = () => () => createElement('div', {}, 'Component')
      const app = createApp(TestComponent)
      
      expect(app).toBeDefined()
      expect(typeof app.mount).toBe('function')
      expect(typeof app.plugin).toBe('function')
      expect(typeof app.renderToHTML).toBe('function')
    })

    it('should implement AirxApp interface', () => {
      const element = createElement('div', {})
      const app = createApp(element)
      
      // Test that app implements the AirxApp interface
      const typedApp: AirxApp = app
      expect(typedApp).toBeDefined()
    })
  })

  describe('app.mount', () => {
    it('should clear container innerHTML and call browserRender', async () => {
      const { browserRender } = await import('../render')
      const element = createElement('div', {}, 'Hello')
      const app = createApp(element)
      
      mockContainer.innerHTML = 'existing content'
      const result = app.mount(mockContainer as HTMLElement)
      
      expect(mockContainer.innerHTML).toBe('')
      expect(browserRender).toHaveBeenCalledTimes(1)
      expect(result).toBe(app) // should return self for chaining
    })

    it('should handle component functions correctly', async () => {
      const { browserRender } = await import('../render')
      const TestComponent = () => () => createElement('span', {}, 'Component Text')
      const app = createApp(TestComponent)
      
      app.mount(mockContainer as HTMLElement)
      
      expect(browserRender).toHaveBeenCalledTimes(1)
      const calls = (browserRender as ReturnType<typeof vi.fn>).mock.calls
      const [, element, container] = calls[0]
      
      expect(element.type).toBe(TestComponent)
      expect(container).toBe(mockContainer)
    })

    it('should support method chaining', () => {
      const element = createElement('div', {})
      const app = createApp(element)
      
      const result = app.mount(mockContainer as HTMLElement)
      expect(result).toBe(app)
    })
  })

  describe('app.plugin', () => {
    it('should register plugins and return self for chaining', async () => {
      const { PluginContext } = await import('../render')
      const element = createElement('div', {})
      
      // Clear previous mocks before creating app
      vi.clearAllMocks()
      
      const app = createApp(element)
      
      // Create simple mock plugins that satisfy the Plugin interface
      const mockPlugin1 = {
        isReRender: vi.fn(),
        updateDom: vi.fn(),
        isReuseInstance: vi.fn()
      }
      const mockPlugin2 = {
        isReRender: vi.fn(),
        updateDom: vi.fn(),
        isReuseInstance: vi.fn()
      }
      
      const result = app.plugin(mockPlugin1, mockPlugin2)
      
      // Should call PluginContext constructor when app is created
      expect(PluginContext).toHaveBeenCalledTimes(1)
      
      // The main thing we want to test is that plugin() returns self for chaining
      expect(result).toBe(app) 
      
      // Test that the app instance still has the plugin method
      expect(typeof app.plugin).toBe('function')
    })

    it('should handle multiple plugin calls', async () => {
      const { PluginContext } = await import('../render')
      const element = createElement('div', {})
      const app = createApp(element)
      
      const plugin1 = {
        isReRender: vi.fn(),
        updateDom: vi.fn(),
        isReuseInstance: vi.fn()
      }
      const plugin2 = {
        isReRender: vi.fn(),
        updateDom: vi.fn(),
        isReuseInstance: vi.fn()
      }
      const plugin3 = {
        isReRender: vi.fn(),
        updateDom: vi.fn(),
        isReuseInstance: vi.fn()
      }
      
      const result1 = app.plugin(plugin1)
      const result2 = result1.plugin(plugin2, plugin3)
      
      // Should support method chaining
      expect(result1).toBe(app)
      expect(result2).toBe(app)
      
      // Should have called PluginContext once during app creation
      expect(PluginContext).toHaveBeenCalledTimes(1)
    })
  })

  describe('app.renderToHTML', () => {
    it('should call serverRender and return HTML string', async () => {
      const { serverRender } = await import('../render')
      const element = createElement('div', {}, 'Server content')
      const app = createApp(element)
      
      const htmlPromise = app.renderToHTML()
      
      expect(htmlPromise).toBeInstanceOf(Promise)
      
      const html = await htmlPromise
      expect(typeof html).toBe('string')
      expect(html).toBe('<div>Server rendered content</div>')
      expect(serverRender).toHaveBeenCalledTimes(1)
      
      const calls = (serverRender as ReturnType<typeof vi.fn>).mock.calls
      const [, renderedElement, callback] = calls[0]
      expect(renderedElement.type).toBe('div')
      expect(typeof callback).toBe('function')
    })

    it('should handle component functions in server rendering', async () => {
      const { serverRender } = await import('../render')
      const TestComponent = () => () => createElement('div', {}, 'Server Component')
      const app = createApp(TestComponent)
      
      const html = await app.renderToHTML()
      expect(html).toBe('<div>Server rendered content</div>')
      expect(serverRender).toHaveBeenCalledTimes(1)
      
      const calls = (serverRender as ReturnType<typeof vi.fn>).mock.calls
      const [, element] = calls[0]
      expect(element.type).toBe(TestComponent)
    })
  })

  describe('integration', () => {
    it('should support full app lifecycle', async () => {
      const element = createElement('div', { id: 'app' }, 'My App')
      const plugin = {
        isReRender: vi.fn(),
        updateDom: vi.fn(),
        isReuseInstance: vi.fn()
      }
      
      const app = createApp(element)
        .plugin(plugin)
        .mount(mockContainer as HTMLElement)
      
      expect(app).toBeDefined()
      expect(mockContainer.innerHTML).toBe('')
      
      const html = await app.renderToHTML()
      expect(typeof html).toBe('string')
    })

    it('should handle complex component trees', () => {
      const ChildComponent = (props: { text: string }) => () => 
        createElement('span', {}, props.text)
      
      const ParentComponent = () => () => 
        createElement('div', {}, 
          createElement(ChildComponent, { text: 'Child 1' }),
          createElement(ChildComponent, { text: 'Child 2' })
        )
      
      const app = createApp(ParentComponent)
      expect(app).toBeDefined()
      
      app.mount(mockContainer as HTMLElement)
      expect(mockContainer.innerHTML).toBe('')
    })
  })
})
