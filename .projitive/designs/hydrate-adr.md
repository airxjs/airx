# Hydration 架构决策记录

**任务**: TASK-0063  
**路线图**: ROADMAP-0004  
**版本目标**: 0.8.0  
**状态**: DRAFT

---

## 1. 背景与问题

### 1.1 当前状态

Airx 0.7.x 已具备基础 SSR 能力：

- `createSSRApp(element)` → `SSRApp` 实例
- `app.renderToString()` → HTML 字符串
- `app.hydrate(container, options)` → 客户端激活（骨架实现）

`species/render/browser/hydrate.ts` 已有 `hydrate()` 函数骨架，包含：
- `HydrateOptions`, `StateSnapshot`, `HydratedApp` 接口
- `connectInstanceTreeToDom()` — 连接实例树到现有 DOM
- `setupReactiveUpdates()` — 设置响应式更新

### 1.2 缺失能力

1. **Signal 状态序列化**: `renderToString` 不收集 Signal 状态，输出 HTML 不包含状态快照
2. **状态恢复**: `hydrate()` 不从 HTML 读取状态，无法恢复服务端 Signal 快照
3. **完整事件绑定**: 事件委托机制存在但不完整

### 1.3 设计目标

- 服务端渲染时自动序列化 Signal 状态到 HTML
- 客户端 hydrate 时从 HTML 恢复 Signal 状态
- 事件处理器正确绑定到 SSR 输出的 DOM 节点
- 优雅处理 hydration mismatch

---

## 2. 约束与原则

- **渐进增强**: 在现有 `server.ts` 和 `browser/hydrate.ts` 基础上扩展
- **无破坏性变更**: 现有 `renderToString()` 输出格式兼容（新增内联脚本不破坏已有解析器）
- **可调试性**: mismatch 时提供清晰的警告信息
- **性能优先**: 首版不追求极限优化，关注正确性

---

## 3. 备选方案

### 方案 A: HTML 内联 Script 标签序列化（推荐）

**描述**: 在 `renderToString` 输出 HTML 末尾注入 `<script type="airx/ssr-state">`，包含序列化的 Signal 状态。

```html
<div id="root">...SSR HTML...</div>
<script type="airx/ssr-state">
  {"signals":{"counter":{"id":"s1","value":0}},"version":"0.7.10"}
</script>
```

**优点**:
- 实现简单，不需要额外 API
- 状态随 HTML 一起传输，无额外请求
- 容易被 `hydrate()` 读取

**缺点**:
- 状态暴露在 HTML 中（敏感场景需加密）
- 状态体积影响 HTML 大小

### 方案 B: data-* 属性序列化

**描述**: 将 Signal 状态序列化为 DOM 节点上的 `data-airx-signal` 属性。

```html
<div id="root" data-airx-signal='{"counter":{"id":"s1","value":0}}'>
  ...
</div>
```

**优点**:
- 状态嵌入 DOM 结构，自包含

**缺点**:
- 需要修改每个容器 DOM 节点属性
- 大状态会导致属性过长
- 与第三方 DOM 操作可能冲突

### 方案 C: 独立 JSON 端点

**描述**: SSR 时将状态写入独立端点，hydrate 前先 fetch 状态。

```html
<div id="root">...SSR HTML...</div>
<script>
  window.__AIRX_STATE__ = fetch('/__airx_state__').then(r => r.json())
</script>
```

**优点**:
- HTML 干净，状态体积不影响首屏

**缺点**:
- 需要服务端额外端点
- hydrate 前需要等待 fetch，增加延迟
- 实现复杂度高

---

## 4. 评估矩阵

| 维度 | 权重 | 方案 A | 方案 B | 方案 C |
|---|---:|---:|---:|---:|
| 实现复杂度 | 0.30 | **5** | 3 | 2 |
| 首屏性能 | 0.25 | **4** | 4 | 2 |
| 可调试性 | 0.25 | **4** | 3 | 3 |
| 兼容性 | 0.20 | **5** | 3 | 4 |
| **加权总分** | | **4.50** | **3.30** | **2.70** |

---

## 5. 决策

- **选型结论**: 方案 A — HTML 内联 Script 标签
- **关键理由**:
  1. 实现最简单，风险最低
  2. 状态随 HTML 一起到达，无额外延迟
  3. 不破坏现有 API 兼容性
  4. 容易实现和调试

---

## 6. API 设计

### 6.1 服务端 StateSnapshot 生成

```typescript
// source/render/server/server.ts
interface StateSnapshot {
  signals: Record<string, { id: string; value: unknown }>
  version: string
  timestamp: number
}

function serializeSignalStates(): StateSnapshot {
  // 从 Signal 系统收集当前所有 Signal 状态
  return {
    signals: SignalState.getAll(),
    version: packageVersion,
    timestamp: Date.now()
  }
}
```

### 6.2 renderToString 输出格式

```typescript
// 在 render() 的 onComplete 回调中
const html = serverElement.toString()
const stateSnapshot = serializeSignalStates()
const stateScript = `<script type="airx/ssr-state">${JSON.stringify(stateSnapshot)}</script>`
return html + stateScript
```

### 6.3 客户端 hydrate 状态恢复

```typescript
// source/render/browser/hydrate.ts
function readStateSnapshot(container: HTMLElement): StateSnapshot | null {
  const script = container.querySelector('script[type="airx/ssr-state"]')
  if (!script) return null
  try {
    return JSON.parse(script.textContent || '')
  } catch {
    console.warn('[Airx hydrate] failed to parse state snapshot')
    return null
  }
}

function restoreSignalStates(snapshot: StateSnapshot) {
  for (const [key, signal] of Object.entries(snapshot.signals)) {
    SignalState.set(key, signal.id, signal.value)
  }
}
```

### 6.4 事件委托机制

```typescript
// source/render/browser/hydrate.ts
function attachEventListeners(container: HTMLElement) {
  // 使用事件委托，在 container 层级绑定统一监听器
  // 事件类型映射到组件实例的事件处理器
  container.addEventListener('click', handleAirxEvent)
  container.addEventListener('input', handleAirxEvent)
  // ...
}
```

### 6.5 Mismatch 检测与处理

```typescript
interface HydrateMismatch {
  type: 'tag' | 'attr' | 'text' | 'missing' | 'extra'
  expected: string
  actual: string
  path: string  // DOM 路径
}

function detectMismatch(instance: Instance, dom: HTMLElement): HydrateMismatch[] {
  const mismatches: HydrateMismatch[] = []
  // 比较组件树与 DOM 结构
  // 不一致时记录并 warn，不中断 hydration
  return mismatches
}
```

---

## 7. 影响范围

### 代码模块

| 模块 | 变更类型 | 说明 |
|------|----------|------|
| `source/render/server/server.ts` | 修改 | 在 renderToString 中注入 StateSnapshot script |
| `source/render/browser/hydrate.ts` | 扩展 | 添加 readStateSnapshot, restoreSignalStates, attachEventListeners |
| `source/signal/` | 修改 | SignalState 需要支持 getAll() 和 set(id, value) |
| `source/element/` | 扩展 | 事件处理器注册机制 |

### 文档变更

- 更新 `ssr-architecture.md` — 补充 hydrate 状态序列化流程
- 更新 README.md — 添加 hydrate 使用说明

---

## 8. 风险与缓解

### 风险 1: Signal ID 机制缺失

- **描述**: 当前 Signal 可能没有稳定 ID，无法追踪和恢复状态
- **缓解**: 实现初期支持简单场景（无嵌套 Signal），后续迭代增加 ID 机制

### 风险 2: 大状态体积影响 HTML 大小

- **描述**: 复杂应用的 Signal 状态可能很大
- **缓解**: 后续可考虑压缩或独立端点方案

### 风险 3: 第三方 DOM 操作冲突

- **描述**: 外部代码可能修改 SSR 输出的 DOM
- **缓解**: hydrate 警告第三方代码干扰，data 属性方案可减少冲突

---

## 9. 验收标准

- [ ] ADR 评审通过
- [ ] Signal 状态能从 renderToString 序列化到 HTML script 标签
- [ ] hydrate 能从 HTML script 标签读取并恢复 Signal 状态
- [ ] SSR 渲染 → 客户端激活的 Counter 演示端到端工作
- [ ] Mismatch 时有明确警告，不静默失败

---

## 10. 参考资料

- `designs/ssr-architecture.md` — SSR 总体架构
- `designs/ssr-adr.md` — SSR ADR（方案 A 已选定）
- `designs/roadmap-0.8-planning.md` — 0.8.x 版本规划
- `source/render/browser/hydrate.ts` — 现有 hydrate 实现骨架
- `source/signal/` — Signal 核心实现
