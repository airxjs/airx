# Airx 设计与风格指南

## 1. 技术栈

- **语言**: TypeScript 5.4.5
- **Lint**: ESLint + `@typescript-eslint`
- **构建**: Rollup + `rollup-plugin-typescript2`
- **包管理**: npm

## 2. TypeScript 风格规范

### 2.1 类型注解

- **必须**使用严格的类型注解，避免 `any`
- eslint 配置了 `@typescript-eslint/no-explicit-any: error`，如需绕过必须加 `// eslint-disable-next-line @typescript-eslint/no-explicit-any` 注释

### 2.2 接口与类型别名

- 使用 `type` 定义简单类型别名和函数类型
- 使用 `interface` 定义有扩展需求的对象结构
- 组件 props 使用 `interface` 或 `type`，按场景选择

### 2.3 泛型

- 合理使用泛型提升可复用性
- Signal 相关 API 使用泛型约束类型安全

### 2.4 Symbol

- 内部实现使用 `symbol.ts` 中定义的 Symbol，避免外部污染
- 对外不暴露内部 Symbol

## 3. ESLint 规则重点

| 规则 | 级别 | 说明 |
|------|------|------|
| `@typescript-eslint/no-explicit-any` | error | 禁止隐式 any |
| `@typescript-eslint/no-unused-vars` | (默认) | 未使用变量需清理 |
| `no-debugger` | error | 禁止 debugger |
| `no-console` | off | 生产环境注意控制台输出 |

## 4. 组件编写规范

### 4.1 组件定义

```typescript
// 使用 component() 包装函数组件
export const MyComponent = component(function MyComponent(props: MyProps) {
  return () => createElement('div', { className: 'my' }, 'Hello')
})
```

### 4.2 Props 类型

```typescript
interface MyProps {
  name: string
  age?: number
}
```

### 4.3 错误边界

使用 `createErrorRender(error)` 生成错误展示组件，错误时显示红色块并点击输出详情。

## 5. Signal 使用规范

### 5.1 创建 State

```typescript
const [count, setCount] = createState(0)
// setCount 新值或 updater
```

### 5.2 创建 Computed

```typescript
const doubled = createComputed(() => count.get() * 2)
```

### 5.3 Watch 响应变化

```typescript
const watcher = createWatch((...changed) => {
  // 响应变化
})
```

### 5.4 全局唯一性

**强制**：同一全局对象只能有一个 Signal 实例。`source/signal/index.ts` 中有运行时检查。

## 6. 命名规范

| 场景 | 规范 | 示例 |
|------|------|------|
| 文件 | kebab-case | `browser.ts`, `hooks.ts` |
| 类/类型 | PascalCase | `AirxElement`, `AirxComponent` |
| 函数/变量 | camelCase | `createElement`, `isValidElement` |
| 常量 | UPPER_SNAKE_CASE（模块级） | `firstSignal`（虽然是 camelCase，但它是模块级可变变量） |
| 内部变量 | 以 `_` 开头（可选） | `_internalState` |

## 7. 注释规范

- 使用 JSDoc 注释公开 API 的参数和返回值
- 内部实现注释用 `//` 单行注释
- eslint-disable 注释需标注原因

## 8. CSS 样式内联

当需要内联样式时，使用 `CSSProperties` 类型：

```typescript
const style: CSSProperties = {
  padding: '8px',
  fontSize: '20px',
  color: 'rgb(255,255,255)',
  backgroundColor: 'rgb(255, 0, 0)',
}
```

颜色值使用 `rgb()` 格式，避免 CSS 变量（框架本身不依赖 CSS 预处理器）。

## 9. 测试规范（待建立）

**当前状态**: 无测试脚本

**待建立规范**:
- 测试框架选择（Vitest / Jest）
- 单测覆盖率门槛
- 关键模块必须覆盖：Signal 封装、Element 创建、生命周期钩子
- 集成测试：browserRender / serverRender
