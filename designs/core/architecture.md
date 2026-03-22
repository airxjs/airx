# Airx Architecture

> 项目架构文档，定义核心模块边界与职责。

## 1. 项目定位

**airx** 是一个基于 JSX 的前端框架，核心提供：
- 声明式组件化（JSX）
- 响应式状态（Signal）
- 依赖注入（provide/inject）
- 跨环境渲染（Browser/Server）

**不提供**：路由、状态管理、打包工具。专注于视图层抽象。

## 2. 技术栈

| 类别 | 技术 |
|------|------|
| 语言 | TypeScript (strict mode) |
| 构建 | Vite + Rollup + vite-plugin-dts |
| 测试 | Vitest |
| 包格式 | ESM + UMD + CJS |

## 3. 核心模块

```
source/
├── app/           # App 根容器与生命周期
├── element/       # JSX 元素创建与渲染
├── render/
│   ├── basic/     # 通用渲染逻辑（Browser/Server 共用）
│   ├── browser/   # 浏览器环境渲染
│   └── server/   # SSR 渲染
├── signal/       # Signal 响应式实现（对齐 TC39 proposal-signals）
├── logger/        # 日志基础设施
├── symbol/        # 内部 Symbol 定义
├── types/         # 全局类型扩展（JSX 类型）
└── index.ts       # 公开 API 导出
```

## 4. API 边界

### 4.1 公开 API（source/index.ts）

```typescript
// App API
export type { AirxApp, Plugin }
export { createApp } from './app'

// Element API
export { Fragment, component, createElement }
export type { AirxComponent, AirxElement, AirxChildren, AirxComponentContext }

// Render API（provide/inject、生命周期）
export { inject, provide, onMounted, onUnmounted }

// Legacy API
export { createRef, watch }
export type { Ref }
```

### 4.2 内部模块（不公开）

- `source/render/basic/plugins/internal/` — 内部插件系统
- `source/symbol` — 内部 Symbol，仅框架内部使用
- `source/logger` — 日志实现

## 5. Signal 对齐策略

airx Signal 对齐 TC39 proposal-signals：
- 使用 `signal-polyfill` 兼容实现
- 核心：`source/signal/index.ts` 对齐标准
- 变更收集：依赖 `signal-polyfill` 的 batch 机制
- 测试覆盖：见 `signals-alignment-test-plan.md`

## 6. 渲染架构

### Browser 渲染

```
component() → createElement() → AirxElement
    ↓
render(element, container) → BrowserRenderer
    ↓
Fiber 风格的增量更新（待实现）
```

### Server 渲染

```
render(element) → ServerRenderer
    ↓
同步遍历 VDOM → HTML 字符串
```

## 7. 版本策略

- **dev 分支**：开发中版本（当前 0.6.0-beta.1）
- **main 分支**：稳定发布版本
- **发布流程**：dev → main → npm publish
- **semver**：遵循 semver 规范

## 8. 相关文档

- [发布门禁清单](../../.projitive/designs/release-quality-gates.md)
- [功能正确性矩阵](../../.projitive/designs/functional-correctness-matrix.md)
- [Signals 对齐计划](../../.projitive/designs/signals-alignment-test-plan.md)
- [升级指南 0.3](../../.projitive/designs/upgrade-guide-0.3.md)
