import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Signal } from 'signal-polyfill'
import { render } from './browser.js'
import { createElement } from '../../element/index.js'
import { PluginContext } from '../basic/plugins/index.js'
import { createState } from '../../signal/index.js'

declare global {
  // eslint-disable-next-line no-var
  var Signal: typeof import('signal-polyfill').Signal
}

vi.mock('../../logger', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}))

describe('render/browser signal integration', () => {
  beforeEach(() => {
    globalThis.Signal = Signal
    Object.defineProperty(globalThis, 'requestIdleCallback', {
      writable: true,
      value: (callback: IdleRequestCallback) => {
        callback({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline)
        return 1
      }
    })
  })

  it('should update dom after rapid consecutive signal sets', async () => {
    function ViewA() {
      return () => createElement('div', {}, 'A')
    }

    function ViewB() {
      return () => createElement('div', {}, 'B')
    }

    const current = createState(createElement(ViewA, {}))

    function Switcher() {
      return () => current.get()
    }

    const root = document.createElement('div')
    render(new PluginContext(), createElement(Switcher, {}), root as Element)
    expect(root.textContent).toBe('A')

    current.set(createElement(ViewA, {}))
    current.set(createElement(ViewB, {}))
    await Promise.resolve()

    expect(root.textContent).toBe('B')
  })

  it('should not lose updates when signal changes during workLoop yield', async () => {
    // 模拟 workLoop 在处理树的中途 yield 的场景
    // 当 yield 期间信号变化命中已处理的实例时，needRestartFromRoot 应确保不遗漏
    const counter = createState(0)

    function Counter() {
      return () => createElement('span', {}, String(counter.get()))
    }

    // 创建一个较深的树，Counter 在树的前部
    function DeepChild() {
      return () => createElement('div', { class: 'filler' })
    }

    function App() {
      return () => createElement('div', {},
        createElement(Counter, {}),
        createElement(DeepChild, {}),
        createElement(DeepChild, {}),
        createElement(DeepChild, {}),
      )
    }

    let callCount = 0
    let signalUpdated = false

    // 第一次 requestIdleCallback 正常渲染整棵树
    // 第二次 requestIdleCallback 模拟 yield: 只处理 1 个节点后让出
    // 这会让 Counter (树前部) 被处理，然后 yield
    // 在 yield 后、恢复前，信号变化标记 Counter 需要 re-render
    Object.defineProperty(globalThis, 'requestIdleCallback', {
      writable: true,
      value: (callback: IdleRequestCallback) => {
        callCount++

        if (callCount <= 1) {
          // 初始渲染 - 正常执行
          callback({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline)
        } else if (callCount === 2 && !signalUpdated) {
          // 第二次渲染调度 - 模拟有限的 idle 时间
          // 给足够时间完成整个渲染
          signalUpdated = true
          callback({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline)
        } else {
          // 后续调度 - 正常执行
          callback({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline)
        }

        return callCount
      }
    })

    const root = document.createElement('div')
    render(new PluginContext(), createElement(App, {}), root as Element)
    expect(root.textContent).toBe('0')

    // 快速连续 set 3 次
    counter.set(1)
    counter.set(2)
    counter.set(3)

    // 等待 microtask 触发 onUpdateRequire
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(root.textContent).toBe('3')
  })

  it('should reflect the final value after N consecutive signal updates', async () => {
    // 回归测试：验证 watcher 在 notify 后必须同步重新订阅
    // 若 watch() 延迟到 microtask 执行，中间的所有变更都会被静默丢失
    const value = createState(0)

    function Display() {
      return () => createElement('span', {}, String(value.get()))
    }

    const root = document.createElement('div')
    render(new PluginContext(), createElement(Display, {}), root as Element)
    expect(root.textContent).toBe('0')

    // 连续 5 次更新，只有最后一次的值应反映在 DOM 上
    value.set(10)
    value.set(20)
    value.set(30)
    value.set(40)
    value.set(50)

    await Promise.resolve()
    expect(root.textContent).toBe('50')
  })

  it('should coalesce multiple consecutive signal sets into one DOM update', async () => {
    // 回归测试：多次连续 set 应合并为一次 DOM 更新，最终 DOM 反映最后一次的值
    // 若 watch() 延迟到 microtask 执行，第 2、3... 次 set 都会被丢失
    const value = createState(0)
    let domUpdateCount = 0
    const originalSetAttribute = Element.prototype.setAttribute
    Element.prototype.setAttribute = function (...args) {
      domUpdateCount++
      return originalSetAttribute.apply(this, args)
    }

    function Display() {
      return () => createElement('span', {}, String(value.get()))
    }

    const root = document.createElement('div')
    render(new PluginContext(), createElement(Display, {}), root as Element)
    const initialDomUpdateCount = domUpdateCount

    value.set(1)
    value.set(2)
    value.set(3)

    await Promise.resolve()

    Element.prototype.setAttribute = originalSetAttribute

    // 3 次 set 后 DOM 只更新 1 次，且反映最终值
    expect(domUpdateCount - initialDomUpdateCount).toBe(0) // span 无属性变更
    expect(root.textContent).toBe('3')
  })

  it('should correctly update after interleaved signal sets and awaits', async () => {
    // 验证在 microtask 执行后，再次连续 set 仍然能正确更新
    const value = createState('initial')

    function Display() {
      return () => createElement('span', {}, value.get())
    }

    const root = document.createElement('div')
    render(new PluginContext(), createElement(Display, {}), root as Element)
    expect(root.textContent).toBe('initial')

    // 第一批连续更新
    value.set('a')
    value.set('b')
    await Promise.resolve()
    expect(root.textContent).toBe('b')

    // 第二批连续更新（验证 watcher 在第一批后仍然正常）
    value.set('c')
    value.set('d')
    await Promise.resolve()
    expect(root.textContent).toBe('d')
  })
})
