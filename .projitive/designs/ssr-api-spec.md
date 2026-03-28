# SSR API 设计规格

**任务**: TASK-0014  
**路线图**: ROADMAP-0003  
**版本目标**: 0.8.0+  
**状态**: READY

---

## 1. 文档元信息

- **任务**: TASK-0014
- **路线图**: ROADMAP-0003
- **版本目标**: 0.8.0+
- **作者**: yinxulai
- **评审状态**: 待评审

---

## 2. 设计目标

- API 简单直观、可自解释
- 类型约束明确、错误模型可预测
- 与现有 `createApp` 与渲染模型保持一致体验
- 无破坏性变更，不影响现有用户

---

## 3. 核心接口

### 3.1 createSSRApp

```typescript
/**
 * 创建 SSR 应用
 * 
 * @example
 * import { createSSRApp } from 'airx/ssr'
 * 
 * const app = createSSRApp({ type: 'div', props: { children: 'Hello' } })
 * const { html } = await app.renderToString()
 * console.log(html) // <div>Hello</div>
 */
export function createSSRApp(
  root: AirxElement,
  options?: SSRAppOptions
): SSRApp
```

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `root` | `AirxElement` | ✅ | 根组件 |
| `options` | `SSRAppOptions` | ❌ | SSR 选项 |

**SSRAppOptions**:

```typescript
export interface SSRAppOptions {
  /**
   * SSR 上下文，用于传递请求级别数据
   * 
   * @example
   * createSSRApp(root, {
   *   context: {
   *     request: { headers: { cookie: '...' } },
   *     user: { id: 1, name: 'Alice' }
   *   }
   * })
   */
  context?: SSRContext
  
  /**
   * 错误边界组件
   * 当子组件渲染出错时，显示此组件
   */
  errorBoundary?: AirxComponent<SSR errorBoundaryProps>
}
```

**返回**: `SSRApp`

**错误语义**:
- 渲染过程出错且未设置 `errorBoundary`：抛出 `SSRError`
- 渲染过程出错且设置了 `errorBoundary`：返回包含错误信息的 `SSRResult`

---

### 3.2 SSRApp.renderToString

```typescript
export interface SSRApp {
  /**
   * 渲染应用为 HTML 字符串
   * 
   * @returns 渲染结果，包含 HTML、状态快照、版本信息
   * 
   * @example
   * const app = createSSRApp(element, { context: { url: '/users/1' } })
   * const result = await app.renderToString()
   * // result.html = '<div>User: Alice</div>'
   * // result.stateSnapshot = { signals: { 's1': { id: 's1', value: 'Alice' } }, version: '0.8.0' }
   */
  renderToString(): Promise<SSRResult>
}
```

**返回**: `Promise<SSRResult>`

**SSRResult**:

```typescript
export interface SSRResult {
  /**
   * 渲染后的 HTML 字符串
   * 不包含 DOCTYPE、html、head、body 标签
   * 仅包含应用根元素的 HTML
   */
  html: string
  
  /**
   * Signal 状态快照，用于客户端 hydrate
   * 如果无 Signal 状态，为 null
   */
  stateSnapshot: StateSnapshot | null
  
  /**
   * Airx 版本号
   * 用于客户端校验兼容性
   */
  version: string
  
  /**
   * 渲染过程中发生的错误列表
   * 如果渲染成功，为空数组
   */
  errors: Error[]
}
```

**StateSnapshot**:

```typescript
export interface StateSnapshot {
  /** Signal 状态数据 */
  signals: Record<string, SignalState>
  
  /** 快照版本，与 Airx 版本对齐 */
  version: string
  
  /** 创建时间戳（毫秒） */
  timestamp: number
}

export interface SignalState {
  /** Signal 标识符 */
  id: string
  /** Signal 的当前值（JSON 可序列化） */
  value: unknown
}
```

---

### 3.3 hydrate

```typescript
/**
 * 在已存在的 DOM 上激活 Airx 应用
 * 
 * @example
 * import { hydrate } from 'airx/ssr'
 * 
 * const app = hydrate(App, document.getElementById('app')!)
 * // 现在 App 已经激活，可以响应用户交互
 */
export function hydrate(
  element: AirxElement,
  container: Element,
  options?: HydrateOptions
): AirxApp
```

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `element` | `AirxElement` | ✅ | 根组件（应与 SSR 时相同） |
| `container` | `Element` | ✅ | DOM 容器 |
| `options` | `HydrateOptions` | ❌ | hydrate 选项 |

**HydrateOptions**:

```typescript
export interface HydrateOptions {
  /**
   * Signal 状态快照，用于恢复服务端状态
   * 如果不提供，将从头开始计算 Signal 状态
   */
  stateSnapshot?: StateSnapshot
  
  /**
   * 是否跳过 SSR 状态恢复，强制重新计算
   * 默认为 false
   */
  forceReset?: boolean
}
```

**返回**: `AirxApp` — 与 `createApp` 返回值相同

**错误语义**:
- hydrate 失败：抛出 `HydrateError`
- DOM 结构不匹配（SSR 输出与组件不一致）：警告但不抛出

---

### 3.4 SSRContext

```typescript
/**
 * SSR 上下文，用于在服务端传递请求级别数据
 * 
 * @example
 * // Server
 * const app = createSSRApp(root, {
 *   context: {
 *     request: { headers: { cookie: req.headers.cookie } },
 *     user: await getUserFromSession(req)
 *   }
 * })
 * 
 * // Component
 * const UserInfo = component(() => {
 *   const context = inject<SSRContext>('ssr:context')
 *   return () => createElement('div', null, context?.user?.name ?? 'Guest')
 * })
 */
export interface SSRContext {
  /**
   * 请求信息
   */
  request?: {
    /** 请求头 */
    headers?: Record<string, string>
    /** 请求 URL */
    url?: string
    /** HTTP 方法 */
    method?: string
  }
  
  /**
   * 用户可扩展的上下文数据
   * 通过 inject('ssr:context') 在组件中获取
   */
  [key: string]: unknown
}
```

---

### 3.5 错误类型

```typescript
/**
 * SSR 相关错误
 */
export class SSRError extends Error {
  /** 错误码 */
  code: string
  /** 原始错误 */
  cause?: Error
}

/**
 * hydrate 相关错误
 */
export class HydrateError extends Error {
  /** 错误码 */
  code: string
  /** 原始错误 */
  cause?: Error
}
```

**错误码**:

| 错误码 | 说明 |
|--------|------|
| `SSR_RENDER_ERROR` | SSR 渲染过程出错 |
| `SSR_SIGNAL_SNAPSHOT_ERROR` | Signal 状态序列化失败 |
| `HYDRATE_MISMATCH` | DOM 结构不匹配 |
| `HYDRATE_VERSION_MISMATCH` | SSR/Client 版本不兼容 |
| `HYDRATE_SIGNAL_RESTORE_ERROR` | Signal 状态恢复失败 |

---

## 4. 类型契约

### 4.1 与 createApp 的类型对比

| 类型 | createApp | createSSRApp |
|------|-----------|--------------|
| 应用接口 | `AirxApp` | `SSRApp` |
| 挂载方法 | `.mount(dom)` | `.renderToString()` |
| 插件支持 | `.use(plugin)` | 不支持 |
| 生命周期 | 完整支持 | 部分支持（无 onMounted） |

### 4.2 导出结构

```typescript
// source/render/server/index.ts

// 应用入口
export { createSSRApp } from './ssr-app.js'

// hydrate
export { hydrate } from './hydrate.js'

// 类型
export type {
  SSRApp,
  SSRAppOptions,
  SSRResult,
  SSRContext,
  HydrateOptions,
  StateSnapshot,
  SignalState,
  SSRError,
  HydrateError,
  SSR errorBoundaryProps
} from './ssr-types.js'
```

### 4.3 公开导出路径

```typescript
// source/index.ts
// 新增 SSR 导出（可选路径）
// import { createSSRApp } from 'airx/ssr'
// import { hydrate } from 'airx/ssr'
```

---

## 5. 注水协议

### 5.1 序列化内容

| 内容 | 序列化位置 | 说明 |
|------|-----------|------|
| Signal 状态 | `window.__AIRX_STATE__` | 全局变量 |
| 版本号 | `data-airx-version` | 容器属性 |
| 错误信息 | `data-airx-errors` | 容器属性（可选） |

### 5.2 注入位置

```html
<!-- 容器结构 -->
<div id="app" data-airx-version="0.8.0">
  <!-- SSR 输出的 HTML -->
  <div>Hello Alice</div>
</div>

<!-- 状态快照（放在容器外） -->
<script type="application/json" id="__AIRX_STATE__">
  {"signals":{"s1":{"id":"s1","value":"Alice"}},"version":"0.8.0","timestamp":1742774400000}
</script>
```

### 5.3 客户端读取时机

1. `hydrate()` 立即读取 `window.__AIRX_STATE__`
2. 如果 `forceReset: true`，跳过读取
3. 恢复 Signal 状态后再执行组件渲染

### 5.4 失败回退策略

| 失败场景 | 策略 |
|---------|------|
| 快照缺失 | 警告 + 从头计算 Signal |
| 版本不匹配 | 警告 + 忽略快照从头计算 |
| Signal 恢复失败 | 警告 + 忽略该 Signal |
| DOM 结构不匹配 | 警告 + 继续 hydrate（可能闪烁） |

---

## 6. 兼容性评估

### 6.1 与 createApp

| 方面 | 兼容性 | 说明 |
|------|--------|------|
| 根组件类型 | ✅ 兼容 | 两者使用相同 `AirxElement` |
| 生命周期 | ⚠️ 部分 | SSR 下 `onMounted` 不触发 |
| 插件系统 | ❌ 不支持 | SSR 无 DOM，无插件扩展点 |
| 依赖注入 | ✅ 兼容 | `provide`/`inject` 在 SSR 下工作 |

### 6.2 与 Router

| 方面 | 兼容性 | 说明 |
|------|--------|------|
| 路由匹配 | ✅ 兼容 | 路由在客户端执行 |
| 服务端路由 | ⚠️ 需验证 | 首版不支持，需要框架集成 |

### 6.3 与 Signal

| 方面 | 兼容性 | 说明 |
|------|--------|------|
| Signal.State | ✅ 兼容 | 支持序列化 |
| Signal.Computed | ⚠️ 限制 | SSR 时可能多次计算 |
| Signal.Effect | ❌ 不支持 | SSR 下不触发副作用 |

### 6.4 与现有测试体系

| 方面 | 兼容性 | 说明 |
|------|--------|------|
| Vitest | ✅ 兼容 | 单元测试无需 SSR |
| jsdom | ⚠️ 需扩展 | 需要新的 hydrate 测试 |

---

## 7. 使用示例

### 7.1 最小示例（Node.js）

```typescript
import { createSSRApp } from 'airx/ssr'

const App = () => createElement('div', null, 'Hello World')

const app = createSSRApp(createElement(App))
const { html, stateSnapshot, version } = await app.renderToString()

console.log(html) // <div>Hello World</div>
console.log(version) // 0.8.0
```

### 7.2 带上下文

```typescript
import { createSSRApp } from 'airx/ssr'
import { inject } from 'airx'

const UserName = component(() => {
  const context = inject<{ user?: { name: string } }>('ssr:context')
  return () => createElement('span', null, context?.user?.name ?? 'Guest')
})

const app = createSSRApp(
  createElement(UserName),
  {
    context: {
      user: { name: 'Alice' }
    }
  }
)

const { html } = await app.renderToString()
// <span>Alice</span>
```

### 7.3 客户端 hydrate

```typescript
import { hydrate } from 'airx/ssr'

const container = document.getElementById('app')!
const stateSnapshot = JSON.parse(
  document.getElementById('__AIRX_STATE__')!.textContent!
)

hydrate(App, container, { stateSnapshot })
```

### 7.4 错误边界

```typescript
import { createSSRApp } from 'airx/ssr'

const ErrorFallback = component((props: { error: Error }) => {
  return () => createElement('div', { class: 'error' }, props.error.message)
})

const app = createSSRApp(
  createElement(RiskyComponent),
  {
    errorBoundary: ErrorFallback
  }
)

const { html, errors } = await app.renderToString()
if (errors.length > 0) {
  console.error('SSR errors:', errors)
}
```

---

## 8. 决策记录

### 8.1 最终接口

| 接口 | 决策 | 理由 |
|------|------|------|
| `createSSRApp` | 采纳 | 与 `createApp` 命名一致 |
| `app.renderToString()` | 采纳 | 方法式调用更直观 |
| `hydrate` 独立函数 | 采纳 | 与 React 习惯一致 |
| `SSRContext` 注入 | 采纳 | 通过 `inject('ssr:context')` 获取 |

### 8.2 未采纳方案

| 方案 | 未采纳理由 |
|------|-----------|
| `renderToString(element, context)` 独立函数 | 无状态管理能力 |
| `SSRApp.extend()` 插件扩展 | SSR 无 DOM 扩展点 |
| `hydrate` 返回 `void` | 需要与其他 `AirxApp` 方法一致 |

### 8.3 迁移建议

- 0.8.0 引入 `airx/ssr` 路径
- 现有用户无需迁移
- 新用户按需引入 SSR 功能

---

## 9. 验收标准

- [ ] `createSSRApp` API 签名符合规格
- [ ] `renderToString` 返回 `SSRResult` 类型正确
- [ ] `hydrate` 签名符合规格
- [ ] `SSRContext` 类型定义完整
- [ ] 错误类型和错误码定义明确
- [ ] 与 `createApp` 类型对比文档完整
- [ ] 最小可运行示例可执行
- [ ] 单测覆盖核心路径

---

## 10. 参考资料

- 架构设计：`designs/ssr-architecture.md`
- API 模板：`designs/ssr-api-spec-template.md`
- 任务上下文：`designs/research/TASK-0014.implementation-research.md`
