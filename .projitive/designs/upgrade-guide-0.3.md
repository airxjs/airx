# Airx 0.3.x 升级指南

## 1. 概述

本文档帮助开发者从 Airx 旧版本（0.1.x）迁移到当前版本（0.3.x），重点说明 API 变更、迁移步骤和注意事项。

**当前版本**: `0.3.1`
**目标读者**: 使用 Airx 0.1.x 的开发者

## 2. 主要变更

### 2.1 状态模型变更（破坏性）

**旧版 (0.1.x)**:
```typescript
// 使用 createRef 创建响应式值
const count = createRef(0)
count.set(count.get() + 1)

// 使用 watch 监听变化
watch(() => console.log(count.get()), [count])
```

**新版 (0.3.x)**:
```typescript
// 使用 Signal.State 创建响应式值
import { Signal } from 'signal-polyfill'

const count = new Signal.State(0)
count.set(count.get() + 1)

// 使用 Signal.Computed 创建计算值
const doubled = new Signal.Computed(() => count.get() * 2)

// 直接读取 .get() 触发依赖追踪
console.log(count.get())
```

**说明**:
- 移除了 `createRef` 和 `watch`
- 采用 TC39 Signal 提案标准
- 状态更新通过 `.set()` 方法
- 读取通过 `.get()` 方法

### 2.2 组件定义方式

**旧版 (0.1.x)**:
```typescript
const App = component(() => {
  return () => <div>Hello</div>
})
```

**新版 (0.3.x)**:
```typescript
function App() {
  return () => <div>Hello</div>
}
// 或使用 component 包装
const App = component(() => {
  return () => <div>Hello</div>
})
```

### 2.3 JSX 工厂

**保持兼容**:
```typescript
// 两个版本都支持这种方式
import * as airx from 'airx'

function App() {
  return () => airx.createElement('div', null, 'Hello')
}
```

### 2.4 上下文机制

**保持兼容**:

```typescript
import { provide, inject } from 'airx'

// 提供者
provide('key', 'value')

// 消费者
const value = inject('key')
```

### 2.5 生命周期

**保持兼容**:

```typescript
import { onMounted, onUnmounted } from 'airx'

onMounted(() => {
  console.log('mounted')
  return () => console.log('cleanup')
})

onUnmounted(() => {
  console.log('unmounted')
})
```

## 3. 迁移检查清单

### 3.1 依赖检查

- [ ] 确认项目依赖 `airx@^0.3.0`
- [ ] 检查其他 Airx 生态包兼容性（router、vite-plugin）

### 3.2 状态迁移

- [ ] 将 `createRef` 替换为 `new Signal.State(initial)`
- [ ] 将 `watch` 替换为 `new Signal.Computed(fn)` 或直接使用 `.get()`
- [ ] 更新状态读取方式（`.get()` vs `.value`）
- [ ] 更新状态设置方式（`.set()` vs `.set(value)`）

### 3.3 组件迁移

- [ ] 确认组件返回渲染函数格式
- [ ] 检查是否依赖旧的 `component` API

### 3.4 构建配置

- [ ] 如果使用 `vite-plugin-airx`，确认插件版本兼容
- [ ] 验证 JSX 工厂配置正确

## 4. 兼容性矩阵

| 功能 | 0.1.x | 0.3.x | 迁移方式 |
| --- | --- | --- | --- |
| 状态创建 | `createRef` | `Signal.State` | 重写 |
| 计算属性 | `watch` | `Signal.Computed` | 重写 |
| JSX 组件 | `component()` | 函数组件 | 兼容 |
| provide/inject | 支持 | 支持 | 兼容 |
| onMounted | 支持 | 支持 | 兼容 |
| onUnmounted | 支持 | 支持 | 兼容 |
| createElement | 支持 | 支持 | 兼容 |

## 5. 常见问题

### Q: 为什么不提供自动迁移工具？

A: 状态模型的变化涉及编程范式转变（从命令式到响应式），自动工具难以保证正确性。建议手动迁移。

### Q: 0.1.x 的项目能否同时使用 0.3.x？

A: 不建议。npm 的 `^` 范围可能会导致版本冲突。请先在测试环境验证。

### Q: router 0.2.x 能与 airx 0.3.x 一起工作吗？

A: 需要验证。router 0.2.x 依赖 `airx@^0.2.0`，但 0.3.x 存在 API 差异。具体见 [Router 兼容矩阵](../router/.projitive/designs/router-airx-compatibility-matrix.md)。

## 6. 相关文档

- [API 兼容矩阵](./api-compatibility-matrix.md)
- [Router 兼容矩阵](../router/.projitive/designs/router-airx-compatibility-matrix.md)
- [Vite 插件支持策略](../vite-plugin/.projitive/designs/vite-support-policy.md)
