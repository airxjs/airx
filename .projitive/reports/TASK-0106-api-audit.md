# Airx 0.9.x API 审计报告 — Breaking Change 风险评估

> Task: TASK-0106 | 审计 airx 0.9.x 公共 API surface，识别 breaking change 风险
> Date: 2026-06-11
> Status: ✅ Complete
> Roadmap: ROADMAP-0005 (Airx 0.10.0 - API & Ecosystem Closure)
> Prior Audit: TASK-0019 (designs/api-stability-audit.md, updated 2026-06-10)

---

## 📋 执行摘要

**结论：Airx 0.9.x 公共 API surface 高度稳定，0.10.0 可实现 zero breaking changes。**

- 所有已识别的 must-fix 问题已在 0.8.x/0.9.x 解决
- 无 @deprecated 功能级 API
- 仅 2 个低优先级的内部 API 边界问题（不影响公共 API）
- Signal 标准库直接使用，不受 airx 版本影响

---

## 🔍 公共 API 完整清单

### Main Entry (`airx`)

| 导出 | 类型 | 来源文件 | 稳定性 |
|------|------|---------|--------|
| `AirxApp` | Interface | `source/app/app.ts#L14` | ✅ Stable |
| `createApp` | Function | `source/app/app.ts#L67` | ✅ Stable |
| `Fragment` | Variable | `source/element/index.ts` | ✅ Stable |
| `component` | Function | `source/element/index.ts` | ✅ Stable |
| `createElement` | Function | `source/element/index.ts` | ✅ Stable |
| `AirxComponent` | Type | `source/element/index.ts` | ✅ Stable |
| `AirxElement` | Type | `source/element/index.ts` | ✅ Stable |
| `AirxChildren` | Type | `source/element/index.ts` | ✅ Stable |
| `AirxComponentContext` | Type | `source/element/index.ts` | ✅ Stable |
| `ErrorBoundary` | Component | `source/element/index.ts` | ✅ Stable |
| `createErrorBoundary` | Function | `source/element/index.ts` | ✅ Stable |
| `ErrorBoundaryProps` | Type | `source/element/index.ts` | ✅ Stable |
| `ErrorBoundaryState` | Type | `source/element/index.ts` | ✅ Stable |
| `ErrorBoundaryRef` | Type | `source/element/index.ts` | ✅ Stable |
| `inject` | Function | `source/render/index.ts` | ✅ Stable |
| `provide` | Function | `source/render/index.ts` | ✅ Stable |
| `onMounted` | Function | `source/render/index.ts` | ✅ Stable |
| `onUnmounted` | Function | `source/render/index.ts` | ✅ Stable |
| `Plugin` | Interface | `source/render/index.ts` | ✅ Stable |
| JSX/DOM Types | Namespace | `source/types/index.ts` | ✅ Stable |

### Browser Entry (`airx/browser`)

| 导出 | 类型 | 来源文件 | 稳定性 |
|------|------|---------|--------|
| `hydrate` | Function | `source/render/browser/index.ts` | ✅ Stable (0.8.0+) |
| `HydrateOptions` | Interface | `source/render/browser/hydrate.ts` | ✅ Stable |
| `StateSnapshot` | Type | `source/render/browser/hydrate.ts` | ✅ Stable |
| `HydratedApp` | Type | `source/render/browser/hydrate.ts` | ✅ Stable |

### Server Entry (`airx/server`)

| 导出 | 类型 | 来源文件 | 稳定性 |
|------|------|---------|--------|
| `SSRApp` | Interface | `source/render/server/server.ts` | ✅ Stable |
| `createSSRApp` | Function | `source/render/server/server.ts` | ✅ Stable |
| `renderToString` | Function | `source/render/server/server.ts` | ✅ Stable |
| `hydrate` (top-level) | Function | `source/render/server/server.ts` | ✅ Stable (0.8.0+) |

### JSX Runtime Entry (`airx/jsx-runtime`)

| 导出 | 类型 | 用途 | 稳定性 |
|------|------|------|--------|
| JSX automatics | Compiler | Vite/esbuild integration | ✅ Stable |

---

## ⚠️ Open Issues from Prior Audit (TASK-0019)

### Issue 3: element/index.ts exports non-public APIs 🟡

**状态**: Open (Low Priority)

**位置**: `source/element/index.ts`

**问题**: 以下类型在 `source/element/index.ts` 导出但未在 `source/index.ts` 重新导出：
- `Props`, `AirxComponentRender`, `ReactiveComponent`, `isValidElement`
- `AirxComponentMountedListener`, `AirxComponentUnmountedListener`, `createErrorRender`

**风险**: 中等 — 直接从 `airx/element` 导入的用户可能使用不稳定 API

**建议 (0.10.0)**:
```typescript
// 在非公共导出上添加 @internal 标签
/** @internal */
export type Props = ...
```

**不要求**: 不算 breaking change，因为这些从未在主要入口导出

---

### Issue 4: Internal module export chain 🟡

**状态**: Open (Low Priority)

**位置**: `source/render/basic/common.ts` → `source/render/index.ts`

**问题**: 内部类型（`InnerAirxComponentContext`, `Instance`, `INTERNAL_TEXT_NODE_TYPE` 等）通过导出链泄露

**风险**: 低 — 架构文档明确说明这些是内部实现

**建议 (0.10.0)**:
- 考虑使用 TypeScript `stripInternal` 编译选项
- 或在内部类型上添加 `/** @internal */` JSDoc

---

## 🚫 Deprecated API 审计

| API | 状态 | 说明 |
|-----|------|------|
| `AirxApp.plugin()` | ✅ 无 deprecated | 0.8.x 移除 @deprecated WIP 标记 |
| `AirxApp.renderToHTML()` | ✅ 无 deprecated | 0.8.x 移除 @deprecated WIP 标记 |
| `hydrate()` | ✅ 无 deprecated | 0.8.0 稳定，移除 @experimental |
| ARIA types (types.ts#L166, L183) | ✅ 仅类型 deprecation | 非功能 API，不影响使用 |

**结论**: 无功能级 deprecated API 需要在 0.10.0 清理

---

## 🔬 Breaking Change 风险矩阵

| API 分类 | Breaking Change 风险 | 说明 |
|---------|---------------------|------|
| 核心组件 API (createApp, createElement, component) | 🟢 无 | 稳定，测试覆盖 |
| 生命周期 API (onMounted, onUnmounted) | 🟢 无 | 稳定 |
| 依赖注入 API (provide, inject) | 🟢 无 | 稳定 |
| SSR API (createSSRApp, renderToString, hydrate) | 🟢 无 | 0.8.0 稳定后无变化 |
| 错误边界 API (ErrorBoundary) | 🟢 无 | 0.8.0 新增，稳定 |
| 插件系统 API (plugin) | 🟢 无 | 0.8.x 稳定 |
| JSX 类型系统 | 🟢 无 | 标准 TC39 类型 |
| 内部实现 (element/index.ts extra exports) | 🟡 低 | 建议标记 @internal |

---

## ✅ 0.10.0 结论

### 可实现目标
1. **Zero Breaking Changes** — 所有公共 API 保持向后兼容
2. **API 稳定性声明** — 可正式声明所有主要入口 API 为稳定
3. **无 deprecated API 清理需求** — 无需废弃迁移

### 建议行动 (P0)
1. 在 `source/element/index.ts` 的非公共导出上添加 `/** @internal */` 标签
2. 考虑添加 TypeScript `stripInternal` 到 tsconfig.json
3. 在 CHANGELOG 中明确稳定 API surface

### 建议行动 (P1，可选)
4. 简化内部模块导出链（低优先级，不影响功能）

---

## 📁 关联产出物

- 研究简报: `.projitive/designs/research/TASK-0106.implementation-research.md`
- 本审计报告: `.projitive/reports/TASK-0106-api-audit.md`
- 历史审计: `.projitive/designs/api-stability-audit.md` (TASK-0019)

---

*本报告确认 0.9.x API surface 稳定，支持 0.10.0 zero breaking changes 目标*