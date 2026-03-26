# Airx 0.8.x 版本规划

> 版本规划日期: 2026-03-25
> 任务: TASK-0018
> 目标: 建立 0.8.x 版本基线，为 0.8.0 发布提供路线图

---

## 1. 执行摘要

0.8.x 是 Airx 的关键版本，核心目标是：

1. **实现 Hydration 支持** - 完成 SSR 客户端激活的完整闭环
2. **API 稳定性承诺** - 明确公共 API 的稳定边界
3. **提交流程收敛** - 减少 Browser/Server 重复逻辑，降低维护成本

---

## 2. 0.7.x 现状评估

### 2.1 已完成 ✅

| 功能 | 状态 | 说明 |
|------|------|------|
| SSR 字符串渲染 | ✅ | `renderToString` 完整实现 |
| SSR API | ✅ | `createSSRApp`, `SSRApp` |
| SSR 测试门禁 | ✅ | 渲染一致性、注水一致性、错误分支覆盖 |
| Browser 调度优化 | ✅ | 无工作时不空转，有 `requestIdleCallback` 降级 |
| ROADMAP-0003 | ✅ | SSR 相关 6 个任务全部 DONE |

### 2.2 待实现 ❌

| 功能 | 状态 | 说明 |
|------|------|------|
| `hydrate()` | ❌ stub | 当前为 no-op，README 标注为 0.8.x 计划 |
| `AirxApp.plugin()` | ⚠️ WIP | 标记 @deprecated WIP |
| `AirxApp.renderToHTML()` | ⚠️ WIP | 标记 @deprecated WIP |

### 2.3 技术债

- **Browser/Server 提交逻辑重复度高** - `commitDom` 在两端实现相似
- **Signal watcher 集成测试不足** - 复杂场景验证不充分
- **SSR 与 Browser DOM 属性更新策略不一致** - 潜在回归风险
- **README/API 文档与代码不一致** - 影响下游接入

---

## 3. 0.8.x 版本目标

### 3.1 核心目标 (Core)

**🎯 Hydration 支持**

Hydration 是 SSR 的关键缺失。当前 `hydrate()` 是 stub，用户调用后不会有任何效果。

目标：实现完整的客户端 hydration 流程：
- 服务端渲染的 HTML 字符串能被客户端"激活"
- 事件绑定正确挂载
- 客户端 Signal 状态与服务端快照对齐

里程碑：0.8.0

**🎯 API 稳定性承诺**

基于 API 稳定性审计（`designs/api-stability-audit.md`）结果：

| 问题 | 建议 | 目标版本 |
|------|------|---------|
| `plugin()` / `renderToHTML()` @deprecated WIP | 确定长期定位（保留/移除） | 0.8.0 |
| `hydrate()` stub 无警告 | 添加运行时警告或错误 | 0.8.0 |
| 内部 API 泄露 | 添加 `@internal` 标签 | 0.8.x |

### 3.2 提交流程收敛 (P1)

从 optimization-roadmap-0.8.md 的 Iteration B：

- 提取 browser/server 共用的 commit helper
- 收敛 DOM 创建、删除、父节点查找与深度遍历逻辑
- 明确哪些 DOM 更新必须走插件，哪些属于 renderer 内核职责

里程碑：0.8.0

### 3.3 测试补强 (P1)

从 optimization-roadmap-0.8.md 的 Iteration C：

- 为 `performUnitOfWork` 增加真实 Signal watcher 集成测试
- 补充 provide/inject 变化、列表 children 复用场景测试

里程碑：0.9.0

---

## 4. 里程碑计划

### 0.8.0 (目标: Q2 2026)

**主题**: Hydration + API 稳定性

| 任务 | 描述 | 优先级 |
|------|------|-------|
| TASK-XXXX | Hydrate 架构设计与 ADR | P0 |
| TASK-XXXX | Hydrate 实现（核心流程） | P0 |
| TASK-XXXX | Hydrate 测试补强 | P0 |
| TASK-XXXX | `hydrate()` 运行时警告/错误 | P0 |
| TASK-XXXX | 确定 `plugin()` / `renderToHTML()` 去留 | P1 |
| TASK-XXXX | Browser/Server commit helper 提取 | P1 |
| TASK-XXXX | 内部 API 添加 `@internal` 标签 | P2 |

**发布检查清单**:
- [ ] Hydrate 集成测试通过
- [ ] API 稳定性问题已处理
- [ ] Browser/Server 重复逻辑显著减少
- [ ] CHANGELOG 更新
- [ ] 迁移指南（如有破坏性变更）

### 0.8.1 (目标: Q2-Q3 2026)

**主题**: 稳定性收口

| 任务 | 描述 | 优先级 |
|------|------|-------|
| TASK-XXXX | Browser/Server DOM 属性更新策略统一 | P1 |
| TASK-XXXX | Signal watcher 集成测试补强 | P1 |
| TASK-XXXX | README / API 文档一致性 | P2 |

### 0.8.x 后续版本

见 optimization-roadmap-0.8.md 的 Iteration C 和 D 规划。

---

## 5. Hydrate 实现策略

### 5.1 当前状态

```typescript
// source/render/server/server.ts
hydrate(_container: HTMLElement): void {
  // 初步版本暂不实现，实际使用时 hydrate 是客户端行为
}
```

### 5.2 Hydration 核心挑战

1. **状态对齐** - 服务端的 Signal 状态需要序列化并在客户端恢复
2. **事件绑定** - 静态 HTML 需要在客户端绑定事件处理器
3. **DOM diff** - 客户端组件树与 DOM 需要协调（reconciliation）
4. **边界处理** - hydration 失败时的回退策略

### 5.3 推荐方案

参考 React 的 hydration 模式：

1. **服务端快照**: 在 `renderToString` 时收集 Signal 状态，序列化到 HTML 中
2. **客户端激活**: `hydrate` 接收 HTML 和初始状态，恢复 Signal 树
3. **事件委托**: 使用事件委托模式，减少事件绑定数量
4. **渐进式 hydration**: 支持部分组件延迟 hydration

### 5.4 API 设计（草案）

```typescript
// 客户端 hydration
interface HydrateOptions {
  context?: Record<string, unknown>  // 服务端传递的上下文
  onMismatch?: (info: MismatchInfo) => void  // DOM 不一致时的回调
}

function hydrate(
  container: HTMLElement,
  app: SSRApp,
  options?: HydrateOptions
): void

// 服务端需要支持状态序列化
const html = await renderToString(app, { serialize: true })
```

---

## 6. 版本稳定性承诺

### 6.1 稳定 API (0.8.x)

以下 API 在 0.8.x 中承诺稳定：

| API | 说明 |
|-----|------|
| `createApp` / `AirxApp` | 浏览器应用入口 |
| `createSSRApp` / `SSRApp` | SSR 应用入口 |
| `renderToString` | SSR 字符串渲染 |
| `createElement` | 元素创建 |
| `component` | 组件定义 |
| `Fragment` | 片段组件 |
| `inject` / `provide` | 依赖注入 |
| `onMounted` / `onUnmounted` | 生命周期 |

### 6.2 实验性 API (0.8.x)

以下 API 为实验性，不承诺稳定性：

| API | 说明 |
|-----|------|
| `hydrate` | Hydration（实现后移入稳定 API） |
| `plugin` | 插件系统 |
| `renderToHTML` | HTML 渲染 |

### 6.3 废弃 API

以下 API 已废弃，可能在 0.9.x 或 1.0 移除：

| API | 替代方案 |
|-----|---------|
| `AirxApp.plugin` | TBD |
| `AirxApp.renderToHTML` | TBD |

---

## 7. 发布流程

### 7.1 版本命名规则

- **主版本 (x.0.0)**: 破坏性 API 变更
- **次版本 (0.x.0)**: 新功能向后兼容
- **补丁版本 (0.0.x)**: Bug 修复

### 7.2 发布前检查

| 检查项 | 说明 |
|-------|------|
| 所有测试通过 | CI green |
| 集成测试覆盖 | 关键路径有测试 |
| API 变更已记录 | CHANGELOG 更新 |
| 破坏性变更已标注 | Migration guide |
| 文档更新 | README / API docs |

### 7.3 发布 CheckList

```markdown
## Pre-release
- [ ] 更新版本号 (package.json, package.json#version)
- [ ] 更新 CHANGELOG
- [ ] 运行 full test suite
- [ ] 检查 bundle size 变化
- [ ] 更新 API 文档

## Release
- [ ] npm publish --access public
- [ ] Git tag v0.8.0
- [ ] GitHub release notes

## Post-release
- [ ] 通知下游包维护者
- [ ] 博客/社交媒体公告（如需要）
```

---

## 8. 风险与开放问题

### 8.1 已识别风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Hydrate 实现复杂度高 | 可能延期 | 分阶段交付，先核心再增强 |
| Browser/Server 收敛影响 SSR | 输出差异 | 完整回归测试 |
| 下游包版本同步 | 生态碎片化 | 提前沟通，维护版本矩阵 |

### 8.2 开放问题

1. **`plugin()` 系统是否保留？** - 需要和阿来确认
2. **`renderToHTML()` 的替代方案？** - 当前标记 WIP，需要确定
3. **Hydrate 的状态序列化格式？** - 需要技术验证
4. **是否需要渐进式 hydration？** - v1 还是后续版本？

---

## 9. 附录

### A. 相关文档

- `designs/optimization-roadmap-0.8.md` - 0.8.x 优化详细路线图
- `designs/api-stability-audit.md` - API 稳定性审计报告
- `designs/ssr-architecture.md` - SSR 架构文档
- `designs/ssr-api-spec.md` - SSR API 规格说明
- `source/render/server/server.ts` - hydrate stub 实现

### B. 参考

- [React Hydration](https://react.dev/reference/react-dom/hydrate)
- [Airx GitHub](https://github.com/airxjs/airx)
- [Airx npm](https://www.npmjs.com/package/airx)
