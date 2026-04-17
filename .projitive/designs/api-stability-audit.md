# Airx 0.7.x API 稳定性审计报告

> 审计日期: 2026-03-25
> 任务: TASK-0019
> 目标: 为 0.8.x 版本稳定性承诺提供依据

---

## 1. Public API Surface

### 1.1 公开导出清单 (source/index.ts)

| 类别 | 导出 | 来源模块 |
|------|------|---------|
| **Types** | JSX/DOM 属性类型 | `./types/index.js` |
| **App** | `AirxApp` (type), `createApp` | `./app/index.js` |
| **Element** | `Fragment`, `component`, `createElement`, `AirxComponent`, `AirxElement`, `AirxChildren`, `AirxComponentContext` | `./element/index.js` |
| **Hooks** | `inject`, `provide`, `onMounted`, `onUnmounted` | `./render/index.js` |
| **SSR** | `SSRApp` (type), `createSSRApp`, `renderToString`, `hydrate` | `./render/index.js` |
| **Plugin** | `Plugin` (type only) | `./render/index.js` |

### 1.2 架构声明的内部模块 (不承诺稳定性)

根据 `designs/core/architecture.md`:
- `source/render/basic/common.ts` - Instance 树与协调逻辑
- `source/render/basic/plugins/internal/*` - 内置插件系统
- `source/symbol/*` - 内部 Symbol
- `source/logger/*` - 日志实现

---

## 2. 发现的问题

### ✅ Issue 1 (已解决): `AirxApp.plugin()` 和 `AirxApp.renderToHTML()` @deprecated WIP 标记已移除

**状态**: ✅ 已解决 (2026-04-17)

**位置**: `source/app/app.ts#L10-L30`

**解决方式**: 方案 C 被执行 - @deprecated WIP 标记已被移除，使这两个方法成为正式 API。

**当前状态**:
```typescript
export interface AirxApp {
  mount: (container: HTMLElement) => AirxApp
  debug: (level?: LogLevel) => AirxApp

  /**
   * 注册插件，返回 app 实例以支持链式调用。
   *
   * @example
   * import { createApp } from 'airx'
   * import { customPlugin } from './plugins'
   *
   * createApp(App).plugin(customPlugin).mount(...)
   */
  plugin: (...plugins: Plugin[]) => AirxApp

  /**
   * 将应用渲染为 HTML 字符串（SSR）。
   *
   * @example
   * const html = await createApp(App).renderToHTML()
   */
  renderToHTML: () => Promise<string>
}
```

**证据**: commit `04ff9d8` ("fix(airx): remove accidentally re-introduced @deprecated WIP markers")

**结论**: `plugin()` 和 `renderToHTML()` 现在是正式的公共 API，不再带有 @deprecated 标记。它们应该被视为稳定的公共 API。

**后续建议**:
- 如果未来需要废弃这些 API，应该通过正式的 deprecation 流程
- 建议为这两个方法添加集成测试以确保稳定性

---

### 🔴 Issue 2: `hydrate()` 是 stub（空实现）

**位置**: `source/render/server/server.ts#L446-L451`

```typescript
hydrate(_container: HTMLElement): void {
  // 初步版本暂不实现，实际使用时 hydrate 是客户端行为
}
```

**问题描述**:
- `hydrate` 作为公共 SSR API 导出
- 实际上是一个空操作（no-op）
- README 明确说明 hydration 是 "planned for 0.8.x"

**影响**:
- 用户调用 `hydrate()` 时不会有任何效果，也没有错误提示
- 可能在用户不知情的情况下导致 hydration 不生效，难以调试

**建议**:
1. **方案 A（推荐）**: 添加运行时警告
   ```typescript
   hydrate(_container: HTMLElement): void {
     console.warn('[airx] hydrate() is not implemented yet. Planned for 0.8.x')
   }
   ```
2. **方案 B**: 抛出 `Error` 提示功能未实现
   ```typescript
   hydrate(_container: HTMLElement): void {
     throw new Error('[airx] hydrate() is not implemented yet. Planned for 0.8.x')
   }
   ```
3. **方案 C**: 在 TypeScript 类型中标记为可选或实验性

---

### 🟡 Issue 3: Element 模块导出了非公共 API

**位置**: `source/element/index.ts`

```typescript
export {
  Props,
  AirxComponentRender,
  ReactiveComponent,
  isValidElement,
  AirxComponentMountedListener,
  AirxComponentUnmountedListener,
  createErrorRender
} from './element.js'
// 注意: 这些 NOT 在 source/index.ts 中重新导出
```

**问题描述**:
- `source/element/index.ts` 导出了更多 API
- 其中 `Props`, `AirxComponentRender`, `ReactiveComponent` 等并未在 `source/index.ts` 中重新导出
- 架构文档说明这些是内部实现，不承诺稳定性

**影响**:
- 直接从 `airx/element` 导入的用户可能使用不稳定的 API
- 贡献者可能混淆哪些是公共 API，哪些是内部 API

**建议**:
1. 在非公共导出的类型和函数上添加 `/** @internal */` JSDoc 标签
2. 或在 `source/element/index.ts` 顶部添加注释说明这是内部模块

---

### 🟡 Issue 4: 内部模块的详细导出链

**位置**: `source/render/basic/common.ts`

```typescript
export const INTERNAL_TEXT_NODE_TYPE = '__airx_text__'
export const INTERNAL_COMMENT_NODE_TYPE = '__airx_comment__'
export type Disposer = () => void
export class InnerAirxComponentContext<E extends AbstractElement> { ... }
export interface AbstractElement { }
export interface Instance<E extends AbstractElement = AbstractElement> { }
export function reconcileChildren<E extends AbstractElement>(...) { }
export function performUnitOfWork<E extends AbstractElement>(...) { }
```

**问题描述**:
- 这些通过 `render/basic/common.ts` → `render/basic/index.ts` → `render/index.ts` 链导出
- 架构文档明确说明 `render/basic/common.ts` 是内部实现，不承诺稳定性
- 但它们确实被导出了

**影响**:
- 用户（特别是贡献者）可能导入这些内部 API
- 架构文档说不稳定，但没有 TypeScript 机制强制执行

**建议**:
- 考虑使用 TypeScript 的 `tsBuildInfoFile` 或 `stripInternal` 编译选项
- 或在内部类型上添加 `/** @internal */` 标签

---

## 3. API 命名一致性检查

| 公共 API | 命名规范 | 状态 |
|---------|---------|------|
| `createApp` | 动词短语，符合 TS API 惯例 | ✅ |
| `createSSRApp` | 动词短语，与 `createApp` 一致 | ✅ |
| `renderToString` | 动词短语，清晰表达行为 | ✅ |
| `createElement` | 动词短语，React 惯例 | ✅ |
| `component` | 名词/动词，简洁 | ✅ |
| `Fragment` | 名词，React 惯例 | ✅ |
| `inject` / `provide` | 动词，表达依赖注入语义 | ✅ |
| `onMounted` / `onUnmounted` | on + 过去分词，生命周期惯例 | ✅ |
| `hydrate` | 动词，SSR hydration 术语 | ✅ |
| `AirxApp` | 名词，实体类命名 | ✅ |
| `SSRApp` | 名词 + 缩写，清晰 | ✅ |

**结论**: API 命名一致性良好。

---

## 4. 总体评估

| 方面 | 评分 | 说明 |
|------|------|------|
| 公共 API 边界清晰度 | ⭐⭐⭐☆☆ | 有 2 个 WIP 方法泄露到公共类型 |
| 内部实现隔离 | ⭐⭐⭐☆☆ | 内部模块导出链较长 |
| API 命名一致性 | ⭐⭐⭐⭐⭐ | 命名规范且一致 |
| 文档完整性 | ⭐⭐⭐⭐☆ | 有架构文档，但部分 API 缺失使用说明 |
| 对 0.8.x 准备度 | ⭐⭐⭐☆☆ | `hydrate()` 需要明确处理策略 |

---

## 5. 对 0.8.x 的建议

### 必须修复 (0.8.0 前)
1. **处理 `hydrate()` stub** - 选择运行时警告或错误
2. **处理 `@deprecated WIP` 方法** - 决定是移除还是正式化

### 建议改进
3. 为内部 API 添加 `/** @internal */` 标签
4. 考虑使用 TypeScript 的 `stripInternal` 编译选项
5. 在 0.8.0 发布说明中明确哪些是稳定 API

### 低优先级
6. 限制 `element/index.ts` 的导出范围
7. 简化内部模块的导出链

---

## 6. 附录

### A. 相关文件
- `source/index.ts` - 公共 API 入口
- `source/app/app.ts` - `AirxApp` 定义
- `source/element/element.ts` - Element API 定义
- `source/render/server/server.ts` - SSR API 实现
- `designs/core/architecture.md` - 架构文档

### B. 参考
- [TC39 Signal Proposal](https://github.com/tc39/proposal-signals)
- [Airx GitHub](https://github.com/airxjs/airx)
