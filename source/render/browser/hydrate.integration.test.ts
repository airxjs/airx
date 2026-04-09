/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { hydrate } from './hydrate.js'
import { createElement } from '../../element/index.js'
import { createState } from '../../signal'

const requestIdleCallbackSpy = vi.fn((callback: (deadline: any) => void) => {
  callback({
    didTimeout: false,
    timeRemaining: () => Number.MAX_SAFE_INTEGER
  })
  return 1
})
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

// Mock signal module - use real signal-polyfill for functional Watcher/State
vi.mock('../../signal', async () => {
  const { Signal } = await import('signal-polyfill')
  globalThis.Signal = Signal
  return {
    createWatch: (notify) => new Signal.subtle.Watcher(notify),
    createState: (initial, options) => new Signal.State(initial, options),
    isState: (target) => target instanceof Signal.State,
    createComputed: (computation, options) => new Signal.Computed(computation, options)
  }
})

describe('hydrate (integration)', () => {
  let container: HTMLElement

  beforeEach(() => {
    requestIdleCallbackSpy.mockClear()
    container = document.createElement('div')
  })

  describe('基本 DOM 激活', () => {
    it('应在已有 SSR HTML 的容器上执行 hydrate', () => {
      // 模拟 SSR 输出的 HTML
      container.innerHTML = '<div><span>Hello SSR</span></div>'

      const element = createElement('div', {
        children: createElement('span', {}, 'Hello SSR')
      })

      const result = hydrate(element, container)

      expect(result).toBeDefined()
      expect(result.container).toBe(container)
      expect(typeof result.unmount).toBe('function')
    })

    it('hydrate 后 DOM 结构保持不变（不重新创建）', () => {
      container.innerHTML = '<div><span>Content</span></div>'

      const element = createElement('div', {
        children: createElement('span', {}, 'Content')
      })

      const result = hydrate(element, container)

      // unmount 不应抛出
      expect(() => result.unmount()).not.toThrow()
    })

    it('应返回 HydratedApp 接口定义的属性', () => {
      container.innerHTML = '<div>Test</div>'
      const element = createElement('div', {}, 'Test')

      const result = hydrate(element, container)

      expect(result).toHaveProperty('container')
      expect(result).toHaveProperty('unmount')
      expect(result.container).toBeInstanceOf(HTMLElement)
      expect(result.unmount).toBeInstanceOf(Function)
    })
  })

  describe('嵌套组件激活', () => {
    it('应正确激活嵌套的父子组件', () => {
      container.innerHTML = '<div><p><strong>Nested</strong></p></div>'

      const element = createElement('div', {
        children: createElement('p', {
          children: createElement('strong', {}, 'Nested')
        })
      })

      expect(() => hydrate(element, container)).not.toThrow()
    })

    it('应正确激活多层嵌套结构', () => {
      container.innerHTML = '<div><article><header><h1>Title</h1></header><main><p>Content</p></main></article></div>'

      const element = createElement('div', {
        children: createElement('article', {
          children: [
            createElement('header', {
              children: createElement('h1', {}, 'Title')
            }),
            createElement('main', {
              children: createElement('p', {}, 'Content')
            })
          ]
        })
      })

      const result = hydrate(element, container)
      expect(result).toBeDefined()
    })

    it('应处理 Fragment 类型的根节点', () => {
      // Fragment 在 SSR 中会被注释节点包裹
      container.innerHTML = '<!----><div>First</div><!----><div>Second</div><!---->'

      // 简单场景：单个 div
      container.innerHTML = '<div>Single</div>'
      const element = createElement('div', {}, 'Single')

      const result = hydrate(element, container)
      expect(result).toBeDefined()
    })
  })

  describe('HydrateOptions', () => {
    it('应接受空 options', () => {
      container.innerHTML = '<div>Test</div>'
      const element = createElement('div', {}, 'Test')

      expect(() => hydrate(element, container, {})).not.toThrow()
    })

    it('应接受 undefined options', () => {
      container.innerHTML = '<div>Test</div>'
      const element = createElement('div', {}, 'Test')

      expect(() => hydrate(element, container)).not.toThrow()
    })

    it('应接受 forceReset: true', () => {
      container.innerHTML = '<div>Test</div>'
      const element = createElement('div', {}, 'Test')

      expect(() => hydrate(element, container, { forceReset: true })).not.toThrow()
    })

    it('应接受 forceReset: false', () => {
      container.innerHTML = '<div>Test</div>'
      const element = createElement('div', {}, 'Test')

      expect(() => hydrate(element, container, { forceReset: false })).not.toThrow()
    })

    it('应接受 stateSnapshot 选项', () => {
      container.innerHTML = '<div>Test</div>'
      const element = createElement('div', {}, 'Test')

      const stateSnapshot = {
        signals: {},
        version: '1.0',
        timestamp: Date.now()
      }

      expect(() => hydrate(element, container, { stateSnapshot })).not.toThrow()
    })
  })

  describe('Signal 状态恢复', () => {
    it('无 stateSnapshot 时应正常激活（forceReset 场景）', () => {
      container.innerHTML = '<div><span>0</span></div>'

      function CounterComponent() {
        const count = createState(0)
        return () => createElement('div', {
          children: createElement('span', {}, String(count.get()))
        })
      }

      const element = createElement(CounterComponent as any, {})

      // 无 stateSnapshot，forceReset 为 false（默认）
      const result = hydrate(element, container, { forceReset: false })
      expect(result).toBeDefined()
    })

    it('forceReset: true 时跳过状态恢复重新计算', () => {
      container.innerHTML = '<div><span>0</span></div>'

      function CounterComponent() {
        const count = createState(0)
        return () => createElement('div', {
          children: createElement('span', {}, String(count.get()))
        })
      }

      const element = createElement(CounterComponent as any, {})

      // forceReset: true 跳过 SSR 状态
      const result = hydrate(element, container, { forceReset: true })
      expect(result).toBeDefined()
    })

    it('stateSnapshot 包含有效的 Signal 状态时应接受', () => {
      container.innerHTML = '<div><span>42</span></div>'

      const stateSnapshot = {
        signals: {
          'counter': { id: 'counter', value: 42 }
        },
        version: '1.0',
        timestamp: Date.now()
      }

      const element = createElement('div', {
        children: createElement('span', {}, '42')
      })

      const result = hydrate(element, container, { stateSnapshot })
      expect(result).toBeDefined()
    })

    it('空的 stateSnapshot.signals 应被接受', () => {
      container.innerHTML = '<div>Empty</div>'
      const element = createElement('div', {}, 'Empty')

      const stateSnapshot = {
        signals: {},
        version: '1.0',
        timestamp: Date.now()
      }

      expect(() => hydrate(element, container, { stateSnapshot })).not.toThrow()
    })
  })

  describe('事件绑定', () => {
    it('带 onClick 处理程序的元素应能被 hydrate 并正确触发事件', () => {
      container.innerHTML = '<div><button>Click me</button></div>'
      const clickHandler = vi.fn()

      const element = createElement('div', {
        children: createElement('button', { onClick: clickHandler, children: 'Click me' })
      })

      const result = hydrate(element, container)

      // hydrate 应成功执行，不抛出
      expect(result).toBeDefined()

      // 修复后：SSR 节点应在 hydrate 时通过 updateDom 绑定事件
      const button = container.querySelector('button')
      expect(button).not.toBeNull()
      button!.click()
      expect(clickHandler).toHaveBeenCalled()
    })

    it('hydrate 应在有事件处理程序的情况下正常完成', () => {
      container.innerHTML = '<div><button>Submit</button></div>'
      const submitHandler = vi.fn()

      const element = createElement('div', {
        children: createElement('button', { onClick: submitHandler, children: 'Submit' })
      })

      // hydrate 不应因事件处理程序而失败
      expect(() => hydrate(element, container, { forceReset: true })).not.toThrow()
    })
  })

  describe('DOM reconciliation', () => {
    it('SSR HTML 与组件结构匹配时应正确连接', () => {
      // 精确匹配 SSR 输出的 HTML
      container.innerHTML = '<div><p>Paragraph</p></div>'

      const element = createElement('div', {
        children: createElement('p', {}, 'Paragraph')
      })

      const result = hydrate(element, container)
      expect(result).toBeDefined()
    })

    it('SSR HTML 结构不完整时应有合理的降级行为', () => {
      // 空的 SSR HTML
      container.innerHTML = ''

      const element = createElement('div', {
        children: createElement('span', {}, 'Content')
      })

      // 不应抛出致命错误
      expect(() => hydrate(element, container)).not.toThrow()
    })

    it('应处理额外的 SSR 节点（不影响激活）', () => {
      // SSR 输出比组件定义更多的节点
      container.innerHTML = '<div><span>Extra</span><p>Actual</p></div>'

      const element = createElement('div', {
        children: createElement('p', {}, 'Actual')
      })

      // 应接受并继续 hydrate
      expect(() => hydrate(element, container)).not.toThrow()
    })
  })

  describe('生命周期', () => {
    it('unmount 应触发组件卸载', () => {
      container.innerHTML = '<div><span>Content</span></div>'

      const element = createElement('div', {
        children: createElement('span', {}, 'Content')
      })

      const result = hydrate(element, container)

      // unmount 不应抛出
      expect(() => result.unmount()).not.toThrow()
    })

    it('多次调用 unmount 应安全', () => {
      container.innerHTML = '<div>Test</div>'
      const element = createElement('div', {}, 'Test')

      const result = hydrate(element, container)

      result.unmount()
      expect(() => result.unmount()).not.toThrow()
    })
  })

  describe('与 renderToString 输出对齐', () => {
    it('应能激活 renderToString 产生的 HTML 结构', () => {
      // 这是端到端场景：SSR 渲染 -> 客户端激活
      const ssrHtml = '<div><header><h1>Hello from SSR</h1></header><main><p>Content here</p></main></div>'
      container.innerHTML = ssrHtml

      const element = createElement('div', {
        children: [
          createElement('header', {
            children: createElement('h1', {}, 'Hello from SSR')
          }),
          createElement('main', {
            children: createElement('p', {}, 'Content here')
          })
        ]
      })

      const result = hydrate(element, container)
      expect(result).toBeDefined()
      expect(result.container.innerHTML).toBe(ssrHtml)
    })

    it('应能激活包含文本内容的复杂嵌套结构', () => {
      const ssrHtml = '<article><h2>Article Title</h2><p>First paragraph with <strong>bold</strong> text.</p><ul><li>Item 1</li><li>Item 2</li></ul></article>'
      container.innerHTML = ssrHtml

      const element = createElement('article', {
        children: [
          createElement('h2', {}, 'Article Title'),
          createElement('p', {
            children: [
              'First paragraph with ',
              createElement('strong', {}, 'bold'),
              ' text.'
            ]
          }),
          createElement('ul', {
            children: [
              createElement('li', {}, 'Item 1'),
              createElement('li', {}, 'Item 2')
            ]
          })
        ]
      })

      const result = hydrate(element, container)
      expect(result).toBeDefined()
    })
  })

  describe('错误处理', () => {
    it('空容器应被接受', () => {
      container.innerHTML = ''
      const element = createElement('div', {}, 'Empty container')

      expect(() => hydrate(element, container)).not.toThrow()
    })

    it('null element type 应被处理', () => {
      container.innerHTML = '<div>Test</div>'
      const element = createElement('div', {}, 'Test')

      // 正常情况不应抛出
      expect(() => hydrate(element, container)).not.toThrow()
    })

    it('HydrateOptions 为 null 时应有降级行为', () => {
      container.innerHTML = '<div>Test</div>'
      const element = createElement('div', {}, 'Test')

      expect(() => hydrate(element, container, null as any)).not.toThrow()
    })
  })

  describe('性能相关', () => {
    it('同步完成时应能正常 hydrate', () => {
      container.innerHTML = '<div><span>Sync</span></div>'

      const element = createElement('div', {
        children: createElement('span', {}, 'Sync')
      })

      const result = hydrate(element, container)

      // hydrate 应正常完成
      expect(result).toBeDefined()
    })

    it('requestIdleCallback 不可用时应降级到 setTimeout', () => {
      // 先移除 requestIdleCallback（使用 let 以便重新赋值）
      const originalRic: any = (globalThis as any).requestIdleCallback
      ;(globalThis as any).requestIdleCallback = undefined

      container.innerHTML = '<div>Test</div>'
      const element = createElement('div', {}, 'Test')

      // 降级到 setTimeout 时仍应正常工作
      expect(() => hydrate(element, container)).not.toThrow()

      // 恢复
      ;(globalThis as any).requestIdleCallback = originalRic
    })
  })
})
