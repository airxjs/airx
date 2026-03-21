# Airx 代码风格指南

> 定义项目代码风格、命名规范与 UI 一致性规则。

## 1. TypeScript 风格

### 1.1 类型定义

- 使用 `interface` 定义公开 API 类型
- 使用 `type` 定义联合类型、映射类型
- 始终使用严格类型，避免 `any`
- 导出类型用 `export type` 优化 Tree-shaking

```typescript
// ✅ 正确
export interface AirxApp {
  mount(container: Element): void
}

// ❌ 避免
export type AirxApp = { mount: (container: Element) => void }
```

### 1.2 空对象类型

**禁止**使用 `{}` 作为类型（等价于 `object` 且不符合意图）。如因 JSX 类型扩展需要，必须用 eslint-disable 注释：

```typescript
/* eslint-disable @typescript-eslint/no-empty-object-type */
interface IntrinsicElements {}
/* eslint-enable @typescript-eslint/no-empty-object-type */
```

## 2. 命名规范

| 类别 | 规范 | 示例 |
|------|------|------|
| 文件 | kebab-case | `airx-app.ts` |
| 类/接口 | PascalCase | `AirxComponent` |
| 函数/变量 | camelCase | `createElement` |
| 常量 | UPPER_SNAKE | `MAX_RETRIES` |
| 内部 Symbol | `__` 前缀 | `__INTERNAL_KEY__` |

## 3. JSX 规范

### 3.1 createElement 调用

```typescript
// ✅ 使用 createElement 而非 h()
createElement('div', { className: 'container' }, children)

// ❌ 避免
h('div', { className: 'container' }, children)
```

### 3.2 Fragment 使用

```typescript
import { Fragment } from 'airx'

// ✅ Fragment 用于多节点返回
component(() => [
  Fragment,
  null,
  child1,
  child2
])
```

## 4. 组件规范

### 4.1 组件定义

```typescript
import { component } from 'airx'

export const MyComponent = component(() => {
  // 组件逻辑
  return createElement('div', null, 'Hello')
})
```

### 4.2 生命周期

```typescript
import { onMounted, onUnmounted } from 'airx'

component(() => {
  onMounted(() => {
    // 挂载时执行
  })
  
  onUnmounted(() => {
    // 卸载时清理
  })
  
  return createElement('div', null, 'content')
})
```

## 5. 依赖注入规范

### 5.1 provide/inject 配对

```typescript
// Provider
provide('theme', 'dark')

// Consumer
const theme = inject<string>('theme')
```

### 5.2 命名约定

- 使用字符串 key（而非 Symbol）
- key 格式：`${scope}:${name}`，如 `'airx:app-context'`

## 6. Signal 规范

对齐 TC39 proposal-signals：
- 变更通过 `batch()` 收集
- 避免在 getter 中副作用
- 清理时使用 `cleanup()`

## 7. 测试规范

- 测试文件：`*.[name].test.ts`
- 放在同目录下
- 使用 Vitest + jsdom 环境

## 8. Git 提交规范

```
<type>(<scope>): <subject>

types: chore | docs | feat | fix | refactor | test
```

## 9. ESLint 规则

```json
{
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  "rules": {}
}
```

## 10. 构建产物

- `output/index.js` — ESM
- `output/index.umd.cjs` — UMD for CJS
- `output/index.d.ts` — 类型声明
