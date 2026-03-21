# Airx 当前代演进与迁移说明

## 1. 概述

本文档帮助开发者从 Airx 旧版本（0.1.x）迁移到当前 Signal 代际（0.3.x 起，当前版本 0.4.0），重点说明演进方向、API 变更、迁移步骤和注意事项。

**当前版本**: `0.4.0`
**目标读者**: 使用 Airx 0.1.x 的开发者

## 2. 代际判断

- `0.1.x` 是旧状态模型：围绕 `createRef/watch` 的使用方式组织。
- `0.3.x+` 是当前状态模型：围绕 `Signal.State/Signal.Computed` 与渲染期依赖收集组织。
- `0.4.0` 仍属于这一“Signal 当前代”，因此迁移重点不是 `0.3.x -> 0.4.0`，而是 `0.1.x -> 0.3.x+`。

## 3. 主要变更

### 3.1 状态模型变更（破坏性）

**旧版 (0.1.x)**:
```typescript
import { createRef, watch } from 'airx'

const count = createRef(0)
count.value = count.value + 1

watch(count, () => {
  console.log(count.value)
})
```

**新版 (0.3.x+)**:
```typescript
import { Signal } from 'signal-polyfill'

const count = new Signal.State(0)
count.set(count.get() + 1)

const doubled = new Signal.Computed(() => count.get() * 2)

console.log(count.get())
console.log(doubled.get())
```

**说明**:
- 当前代不再以 `createRef/watch` 作为核心状态模型。
- 采用 TC39 Signals 提案对应的 `State/Computed` 心智模型。
- 状态更新通过 `.set()`，读取通过 `.get()`，渲染依赖在 render 阶段自动收集。

### 3.2 组件定义方式

**旧版 (0.1.x)**:
```typescript
const App = component(() => {
  return () => <div>Hello</div>
})
```

**新版 (0.3.x+)**:
```typescript
function App() {
  return () => <div>Hello</div>
}

const WrappedApp = component(() => {
  return () => <div>Hello</div>
})
```

### 3.3 JSX 工厂

**保持兼容**:
```typescript
import * as airx from 'airx'

function App() {
  return () => airx.createElement('div', null, 'Hello')
}
```

### 3.4 上下文机制

**保持兼容**:
```typescript
import { provide, inject } from 'airx'

provide('key', 'value')
const value = inject('key')
```

### 3.5 生命周期

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

## 4. 迁移检查清单

### 4.1 依赖检查

- [ ] 确认项目依赖切换到当前代 `airx@^0.4.0` 或兼容范围
- [ ] 检查其他 Airx 生态包兼容性（router、vite-plugin）

### 4.2 状态迁移

- [ ] 将 `createRef` 使用点迁移为 `Signal.State` 或其他显式 Signal 容器
- [ ] 将 `watch` 依赖替换为 computed/渲染期读取模型，避免保留旧式观察逻辑
- [ ] 将状态读取由 `.value` 调整为 `.get()`
- [ ] 将状态写入调整为 `.set(nextValue)`

### 4.3 组件迁移

- [ ] 确认组件返回渲染函数格式
- [ ] 检查是否依赖旧的 `component` API 封装方式

### 4.4 构建配置

- [ ] 如果使用 `vite-plugin-airx`，确认插件版本兼容
- [ ] 验证 JSX 工厂配置正确

## 5. 兼容性矩阵

| 功能 | 0.1.x | 0.3.x+ | 迁移方式 |
| --- | --- | --- | --- |
| 状态创建 | `createRef` | `Signal.State` | 重写 |
| 依赖响应 | `watch` | `Signal.Computed` / 渲染期依赖收集 | 重写 |
| JSX 组件 | `component()` | 函数组件 | 兼容 |
| provide/inject | 支持 | 支持 | 兼容 |
| onMounted | 支持 | 支持 | 兼容 |
| onUnmounted | 支持 | 支持 | 兼容 |
| createElement | 支持 | 支持 | 兼容 |

## 6. 迁移策略建议

### 6.1 推荐迁移顺序

1. 先盘点旧项目中的 `createRef/watch` 使用面。
2. 再迁移最外层状态容器与组件渲染逻辑。
3. 最后补齐 Signals 响应语义验证与功能正确性矩阵。

### 6.2 不推荐的做法

- 不要在当前代里继续模拟旧版 `watch` 语义作为兼容层主路径。
- 不要一边迁移状态模型、一边同时升级大量 UI/业务逻辑。
- 不要跳过对 router/vite-plugin 的兼容验证直接升级主站。

## 7. 常见问题

### Q: 为什么不提供自动迁移工具？

A: 状态模型的变化涉及编程范式转变，自动工具难以保证语义正确性。建议手动迁移，并结合功能正确性矩阵验证。

### Q: 0.1.x 的项目能否同时使用 0.3.x+？

A: 不建议。旧状态模型与当前代心智模型不同，应先在隔离环境迁移并验证。

### Q: router 0.2.x 能与 airx 0.4.0 一起工作吗？

A: 需要行为验证。语义上仍处于当前代，但 peer dependency 与实际运行行为需要单独确认。具体见 [Router 兼容矩阵](../router/.projitive/designs/router-airx-compatibility-matrix.md)。

## 8. 相关文档

- [API 兼容矩阵](./api-compatibility-matrix.md)
- [Signals 对齐与单测计划](./signals-alignment-test-plan.md)
- [功能正确性验证矩阵](./functional-correctness-matrix.md)
- [Router 兼容矩阵](../router/.projitive/designs/router-airx-compatibility-matrix.md)
- [Vite 插件支持策略](../vite-plugin/.projitive/designs/vite-support-policy.md)
