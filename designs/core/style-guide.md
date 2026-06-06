---
applyTo: "**"
---

# Airx 代码风格指南

> 定义代码编写规范和最佳实践

---

## 1. 命名规范

### 1.1 文件命名
- 使用 **kebab-case**: `signal-state.ts`, `create-app.ts`
- 组件文件与导出名一致
- 测试文件: `*.test.ts`,基准测试: `*.benchmark.ts`

### 1.2 导出命名
- **类型/接口**: PascalCase，`type AirxApp`, `interface Plugin`
- **函数/变量**: camelCase，`createApp`, `renderToString`
- **常量**: SCREAMING_SNAKE_CASE，`RENDER_MODE`

---

## 2. TypeScript 规范

### 2.1 类型定义
- 优先使用 `interface` 而不是 `type`（可扩展性）
- 使用 `export type` 导出联合类型
- 避免使用 `any`，使用 `unknown` 替代

### 2.2 装饰器
- 禁止使用 `@decorator` 语法
- 优先使用原生 ES特性

### 2.3 可空性
```ts
// ✅ 正确：明确的可空标注
function foo(name?: string): string | undefined

// ❌ 避免：隐式 any 返回
function bar(): string!
```

---

## 3. 组件规范

### 3.1 组件定义
```ts
import { component, createElement } from 'airx'

const MyComponent = component((props: { title: string }) => {
  return () => createElement('div', null as never, props.title)
})
```

### 3.2 组件返回值
- 组件必须返回一个 **render 函数** `() => JSX.Element`
- 使用 `null` 表示无渲染内容

---

## 4. 测试规范

### 4.1 单元测试
- 使用 `vitest` 作为测试框架
- 测试文件与源码放于同目录
- 基准测试使用 `vitest.benchmark`

### 4.2 覆盖率要求
- 核心模块覆盖率 > 80%
- 公共 API 必须有测试

---

## 5. 提交规范

### 5.1 Commit Message
```
<type>(<scope>): <subject>

type: feat | fix | perf | docs | chore | refactor | test
scope: 模块名 (app | element | render | signal | types)
```

### 5.2 示例
```
feat(app): add mount/unmount lifecycle hooks
fix(signal): correct effect cleanup order
perf(render): optimize DOM diff algorithm
```

