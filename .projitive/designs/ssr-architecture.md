# SSR 总体架构设计

**任务**: TASK-0013  
**路线图**: ROADMAP-0003  
**版本目标**: 0.8.0+  
**状态**: IN_PROGRESS

---

## 1. 背景与目标

### 1.1 当前状态
Airx 0.7.0 已支持基础的 Server 端渲染，通过 `source/render/server/server.ts` 实现：
- `render(pluginContext, element, onComplete)` 入口
- `ServerElement` 模拟 DOM API
- `performUnitOfWork` 与 Browser 共用协调引擎
- 输出纯 HTML 字符串

### 1.2 缺失能力
1. **状态序列化**: Signal 状态未序列化，客户端无法恢复
2. **客户端激活（hydrate）**: 无 hydrate 机制，仅支持纯 SSR
3. **上下文传递**: 无法在 SSR 时注入请求级别上下文
4. **错误边界**: 组件渲染错误直接抛出，无兜底策略

### 1.3 设计目标
- 提供 `renderToString` 异步渲染接口
- 提供 `hydrate` 客户端激活接口
- 支持 Signal 状态序列化与恢复
- 支持 SSR 上下文注入
- 分层清晰、职责单一、文档友好

### 1.4 非目标
- 框架特定集成（Express / Fastify 中间件）不在首版范围
- 流式渲染（Streaming SSR）
- CSS-in-JS 服务器端处理
- 路由级别的 SSR 支持

---

## 2. 总体架构

### 2.1 渲染流程时序图

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Server Side                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  createSSRApp(element, context?)                                     │
│       │                                                             │
│       ▼                                                             │
│  createSSRPluginContext(context)                                     │
│       │                                                             │
│       ▼                                                             │
│  performUnitOfWork(ssrPluginContext, appElement)                    │
│       │                                                             │
│       ├── Signal tracking: 自动收集依赖的 Signal                    │
│       │                                                             │
│       ▼                                                             │
│  commitDom(serverElements)                                          │
│       │                                                             │
│       ▼                                                             │
│  serializeServerElements()                                          │
│       │                                                             │
│       ├── build HTML string                                         │
│       ├── snapshot Signal states                                    │
│       └── return SSRResult { html, stateSnapshot, version }       │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                         <html>stateSnapshot</html>
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          Client Side                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  hydrate(dom, element, stateSnapshot?)                              │
│       │                                                             │
│       ▼                                                             │
│  restoreSignalStates(snapshot)                                       │
│       │                                                             │
│       ▼                                                             │
│  createBrowserPluginContext()                                        │
│       │                                                             │
│       ▼                                                             │
│  performUnitOfWork(browserPluginContext, appElement)                │
│       │                                                             │
│       ▼                                                             │
│  commitDom(browserDoms)                                             │
│       │                                                             │
│       ▼                                                             │
│  attachEventListeners()                                              │
│       │                                                             │
│       ▼                                                             │
│  app.mount() — 框架控制权交给用户                                    │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 模块职责

```
source/render/
├── server/
│   ├── server.ts         # 基础 SSR 渲染（已有）
│   ├── ssr-app.ts        # 新增：createSSRApp 实现
│   ├── serialize.ts      # 新增：Signal 状态序列化
│   └── context.ts        # 新增：SSR 上下文
├── browser/
│   ├── browser.ts        # 基础 Browser 渲染（已有）
│   └── hydrate.ts        # 新增：hydrate 实现
├── basic/
│   ├── common.ts         # 协调引擎（已有）
│   ├── commit.ts         # 新增：通用 commitDom 提取
│   └── signal-tracker.ts # 新增：Signal 依赖追踪
```

### 2.3 数据流

```
[SSR Input]
    │
    ▼
SSRContext ──────► createSSRApp()
    │                    │
    ▼                    ▼
Signal.State ────► performUnitOfWork()
    │                    │
    │                    ▼
    │              Instance Tree
    │                    │
    ▼                    ▼
SerializedState ◄── signalTracker.snapshot()
    │
    ▼
{ html, stateSnapshot }
```

---

## 3. 核心接口设计

### 3.1 createSSRApp

```typescript
export interface SSRAppOptions {
  /** SSR 上下文，用户可注入 request/headers 等 */
  context?: SSRContext
  /** 错误边界组件 */
  errorBoundary?: AirxComponent<{ error: Error; retry: () => void }>
}

export interface SSRApp {
  /** 渲染为 HTML 字符串 */
  renderToString(): Promise<SSRResult>
}

export interface SSRResult {
  /** 渲染后的 HTML 字符串 */
  html: string
  /** Signal 状态快照，用于客户端恢复 */
  stateSnapshot: StateSnapshot | null
  /** Airx 版本号，用于兼容性校验 */
  version: string
  /** 渲染过程中发生的错误（不完全错误） */
  errors: Error[]
}
```

### 3.2 hydrate

```typescript
export interface HydrateOptions {
  /** Signal 状态快照，用于恢复服务端状态 */
  stateSnapshot?: StateSnapshot
  /** 是否跳过 SSR 状态恢复，强制重新计算 */
  forceReset?: boolean
}

/**
 * 客户端激活：在已存在的 DOM 上激活 Airx 应用
 */
export function hydrate(
  element: AirxElement,
  container: Element,
  options?: HydrateOptions
): AirxApp
```

### 3.3 SSRContext

```typescript
export interface SSRContext {
  /** 请求对象，可用于获取 headers、cookies 等 */
  request?: {
    headers?: Record<string, string>
    url?: string
    method?: string
  }
  /** 用户可扩展的上下文数据 */
  [key: string]: unknown
}
```

### 3.4 StateSnapshot

```typescript
export interface StateSnapshot {
  /** Signal 状态数据 */
  signals: Record<string, SignalState>
  /** 快照版本，用于兼容性校验 */
  version: string
  /** 创建时间戳 */
  timestamp: number
}

export interface SignalState {
  /** Signal 的当前值（JSON 可序列化） */
  value: unknown
  /** Signal 标识符 */
  id: string
}
```

---

## 4. 状态序列化设计

### 4.1 Signal 追踪机制

在 SSR 渲染过程中，需要追踪哪些 Signal 被组件读取：

```typescript
// signal-tracker.ts
class SignalTracker {
  private trackedSignals = new Set<Signal.State>()

  track(signal: Signal.State): void {
    this.trackedSignals.add(signal)
  }

  snapshot(): StateSnapshot {
    const signals: Record<string, SignalState> = {}
    for (const signal of this.trackedSignals) {
      signals[signal.id] = {
        id: signal.id,
        value: signal.get()
      }
    }
    return {
      signals,
      version: AIRX_VERSION,
      timestamp: Date.now()
    }
  }

  reset(): void {
    this.trackedSignals.clear()
  }
}
```

### 4.2 自动追踪集成

在组件函数执行时自动调用 `signalTracker.track()`：

```typescript
// basic/common.ts - 组件函数执行路径
function executeComponentFunction(instance: Instance) {
  const signalTracker = instance.context.signalTracker
  
  // 设置全局 tracker
  setActiveTracker(signalTracker)
  
  try {
    const result = instance.element.type(instance.element.props)
    return result
  } finally {
    setActiveTracker(null)
  }
}
```

### 4.3 客户端状态恢复

```typescript
// hydrate.ts - 恢复 Signal 状态
function restoreSignalStates(snapshot: StateSnapshot): void {
  for (const [id, state] of Object.entries(snapshot.signals)) {
    const signal = Signal.State.getById(id)
    if (signal) {
      signal.set(state.value)
    }
  }
}
```

---

## 5. 错误边界设计

### 5.1 错误处理策略

采用**顶层统一错误边界 + 组件级错误边界扩展点**：

```typescript
// ssr-app.ts
export function createSSRApp(
  element: AirxElement,
  options?: SSRAppOptions
): SSRApp {
  return {
    async renderToString(): Promise<SSRResult> {
      const errors: Error[] = []
      
      try {
        // 执行渲染
        const html = await renderToStringImpl(element, options)
        return { html, stateSnapshot, version: AIRX_VERSION, errors }
      } catch (err) {
        if (options?.errorBoundary) {
          // 使用错误边界组件渲染兜底 UI
          const fallbackHtml = await renderErrorBoundary(err, options.errorBoundary)
          return { 
            html: fallbackHtml, 
            stateSnapshot: null, 
            version: AIRX_VERSION, 
            errors: [err as Error] 
          }
        }
        throw err
      }
    }
  }
}
```

### 5.2 错误边界组件示例

```typescript
const ErrorBoundary = component((props: { 
  error: Error
  retry: () => void 
}) => {
  return () => createElement('div', { 
    class: 'error-boundary' 
  }, [
    createElement('h2', null, 'Something went wrong'),
    createElement('pre', null, props.error.message),
    createElement('button', { onClick: props.retry }, 'Retry')
  ])
})
```

---

## 6. 与现有代码的集成

### 6.1 复用 performUnitOfWork

SSR 和 Browser 渲染复用同一协调引擎 `performUnitOfWork`，差异仅在于：
- DOM 提交层（ServerElement vs Browser DOM）
- PluginContext 初始化方式

### 6.2 commitDom 重构

将 `commitDom` 逻辑提取为通用模块：

```typescript
// basic/commit.ts
export function commitDom<T extends AbstractElement>(
  rootInstance: Instance<T>,
  rootNode: T | undefined,
  options: CommitOptions<T>
): void {
  // 通用提交逻辑
}
```

Browser 和 Server 的 `commitDom` 调用通用实现。

### 6.3 PluginContext 扩展

```typescript
// server/ssr-context.ts
export interface SSRPluginContext extends PluginContext {
  signalTracker: SignalTracker
  ssrContext: SSRContext
  errors: Error[]
}
```

---

## 7. 验收标准

- [ ] `createSSRApp` 支持异步渲染
- [ ] Signal 状态在 SSR 时被追踪并序列化
- [ ] 客户端 `hydrate` 能恢复 Signal 状态
- [ ] SSR 上下文可通过 `SSRContext` 传递
- [ ] 渲染错误时能触发错误边界
- [ ] 与现有 `createApp` 使用体验一致
- [ ] 单测覆盖核心渲染路径
- [ ] 提供最小可运行示例

---

## 8. 后续任务

- **TASK-0014**: 设计 SSR 公开接口与类型契约
- **TASK-0015**: 评估 SSR 方案并确定实施基线
- **TASK-0016**: 实现 SSR 接口与最小可用能力
- **TASK-0017**: 补齐 SSR 测试门禁与文档示例

---

## 9. 参考资料

- [TC39 Signals Proposal](https://github.com/tc39/proposal-signals)
- [React SSR Architecture](https://react.dev/reference/react-dom/server)
- [Preact Signals Integration](https://preactjs.com/guide/v10/signals/)
- 当前实现：`source/render/server/server.ts`
