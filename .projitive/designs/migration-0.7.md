# Airx 0.7.0 迁移指南 - 移除 Legacy API

## 概述

**0.7.0 版本是破坏性更新**，移除了从 Vue 3 风格演进而来的兼容 API：`createRef` 和 `watch`。

此版本完全采纳 TC39 Signals 提案标准，统一开发体验，移除了历史包袱。

**当前版本**: `0.7.0`
**受影响范围**: 使用 `createRef` 或 `watch` 的项目

---

## 移除内容

### `createRef` 函数

**变更**: `createRef` 已删除

**旧用法**:
```typescript
import { createRef } from 'airx'

const count = createRef(0)
console.log(count.value) // 读取值
count.value = 1 // 写入值
```

**新用法**:
```typescript
import { Signal } from 'signal-polyfill'

const count = new Signal.State(0)
console.log(count.get()) // 读取值
count.set(1) // 写入值
```

### `watch` 函数

**变更**: `watch` 已删除

**旧用法**:
```typescript
import { createRef, watch } from 'airx'

const count = createRef(0)

const unwatch = watch(count, (newVal, oldVal) => {
  console.log('count changed from', oldVal, 'to', newVal)
})

// 停止观察
unwatch()
```

**新用法 - 使用 Signal.Computed**:
```typescript
import { Signal } from 'signal-polyfill'

const count = new Signal.State(0)

// 方案 1: 在组件中使用 Computed
const effect = new Signal.Computed(() => {
  const val = count.get()
  console.log('count is now', val)
  return val
})

// 访问以触发计算
effect.get()
```

**新用法 - 使用 Signal.Effect（如需副作用）**:
```typescript
import { Signal } from 'signal-polyfill'

const count = new Signal.State(0)

const effect = new Signal.Effect(() => {
  const val = count.get()
  console.log('count changed to', val)
})

// 停止副作用
effect.dispose?.()  // 如果 polyfill 支持
```

---

## Ref 类型

**变更**: `Ref<T>` 类型已删除

**旧用法**:
```typescript
import { Ref } from 'airx'

function useCounter(): Ref<number> {
  return createRef(0)
}
```

**新用法**:
```typescript
import { Signal } from 'signal-polyfill'

function useCounter(): Signal.State<number> {
  return new Signal.State(0)
}
```

---

## 迁移检查清单

### 搜索并替换

- [ ] 搜索所有 `import { createRef` 和 `import { watch` 的导入
- [ ] 搜索 `createRef(` 的使用位置
- [ ] 搜索 `watch(` 的使用位置（注意区分 from signal-polyfill 的 createWatch）

### 迁移步骤

#### 1. 状态创建迁移

将所有 `createRef` 替换为 `new Signal.State`:

```typescript
// Before
const state = createRef(initialValue)

// After
const state = new Signal.State(initialValue)
```

#### 2. 读取值迁移

替换 `.value` 为 `.get()`:

```typescript
// Before
const value = state.value

// After
const value = state.get()
```

#### 3. 写入值迁移

替换 `.value = X` 为 `.set(X)`:

```typescript
// Before
state.value = newValue

// After
state.set(newValue)
```

#### 4. 观察器迁移

根据使用场景选择：

**场景 A: 组件内响应式依赖**

```typescript
// Before
function Counter() {
  const count = createRef(0)
  watch(count, (newVal) => {
    console.log('updated:', newVal)
  })
  return () => <p>{count.value}</p>
}

// After - 在组件中读取 Signal，渲染期自动收集依赖
function Counter() {
  const count = new Signal.State(0)
  return () => {
    const val = count.get()  // 渲染期读取，自动建立依赖
    console.log('rendering with:', val)
    return <p>{val}</p>
  }
}
```

**场景 B: 副作用或非渲染场景**

```typescript
// Before
const config = createRef({ theme: 'light' })
watch(config, (newVal) => {
  applyTheme(newVal.theme)
})

// After - 使用 Effect（如果 polyfill 支持）
const config = new Signal.State({ theme: 'light' })

const themeEffect = new Signal.Effect(() => {
  const cfg = config.get()
  applyTheme(cfg.theme)
})

// 清理时
themeEffect.dispose?.()
```

**场景 C: 派生值（计算）**

```typescript
// Before
const count = createRef(0)
const doubled = createRef(0)
watch(count, (newVal) => {
  doubled.value = newVal * 2
})

// After - 使用 Computed
const count = new Signal.State(0)
const doubled = new Signal.Computed(() => count.get() * 2)

// 读取派生值
console.log(doubled.get())
```

---

## 代码示例对比

### 例 1: 简单计数器

**0.6.x 及更早**:
```typescript
import { createRef, watch } from 'airx'

function Counter() {
  const count = createRef(0)
  
  watch(count, (newVal) => {
    console.log('Count updated:', newVal)
  })
  
  const increment = () => {
    count.value += 1
  }
  
  return () => (
    <div>
      <p>Count: {count.value}</p>
      <button onClick={increment}>+1</button>
    </div>
  )
}
```

**0.7.0+**:
```typescript
import { Signal } from 'signal-polyfill'

function Counter() {
  const count = new Signal.State(0)
  
  const increment = () => {
    count.set(count.get() + 1)
  }
  
  return () => {
    const val = count.get()  // 渲染期读取，建立依赖
    return (
      <div>
        <p>Count: {val}</p>
        <button onClick={increment}>+1</button>
      </div>
    )
  }
}
```

### 例 2: 配置与应用

**0.6.x 及更早**:
```typescript
import { createRef, watch } from 'airx'

const settings = createRef({ 
  theme: 'light',
  language: 'en'
})

watch(settings, (newSettings) => {
  document.documentElement.setAttribute('data-theme', newSettings.theme)
  i18n.setLanguage(newSettings.language)
})

// 更新
settings.value = { theme: 'dark', language: 'zh' }
```

**0.7.0+**:
```typescript
import { Signal } from 'signal-polyfill'

const settings = new Signal.State({ 
  theme: 'light',
  language: 'en'
})

const settingsEffect = new Signal.Effect(() => {
  const s = settings.get()
  document.documentElement.setAttribute('data-theme', s.theme)
  i18n.setLanguage(s.language)
})

// 更新
settings.set({ theme: 'dark', language: 'zh' })
```

---

## 依赖版本检查

迁移后，确保更新下游包：

```json
{
  "dependencies": {
    "airx": "^0.7.0",
    "airx-router": "^0.7.0 or compatible",
    "vite-plugin-airx": "compatible version"
  }
}
```

---

## 常见问题

**Q: 为什么要移除 `createRef` 和 `watch`？**

A: Airx 采纳 TC39 Signals 标准，`createRef/watch` 是 Vue 3 风格的 API，与标准不一致。移除它们统一了开发体验，减少了开发者心智负担。

**Q: 我的项目很大，有很多 `createRef` 用法，怎么办？**

A: 可以逐步迁移：
1. 新代码使用 Signal API
2. 旧代码保持 0.6.x 版本
3. 逐个模块升级依赖到 0.7.0
4. 同步迁移该模块的 `createRef/watch` 用法

**Q: `watch` 的观察器清理函数怎么迁移？**

A: 使用 Signal.Effect 的 `dispose()` 方法（如果 polyfill 支持），或在组件卸载时清理。

---

## 发布计划

- **0.7.0**: 移除 legacy API，标记破坏性版本
- **0.8.0+**: 新特性与优化围绕纯 Signal API 展开

---

## 获取帮助

- [TC39 Signals 提案](https://github.com/tc39/proposal-signals)
- [signal-polyfill](https://github.com/proposal-signals/signal-polyfill)
- Airx 文档与示例
