# Airx 核心运行时健康检查报告

**任务**: TASK-0023 | **日期**: 2026-03-28 | **状态**: DONE

---

## 执行摘要

为 ROADMAP-0001（建立 Airx 核心运行时治理与版本基线）做前期准备，对 airx 核心运行时进行健康检查。

### 核心发现

| 维度 | 状态 | 备注 |
|------|------|------|
| 版本基线 | ⚠️ 不一致 | architecture.md 仍写 0.7.0，release-quality-gates.md 写 0.4.0 |
| 构建 | ✅ 通过 | `npm run build` 成功 |
| Lint | ✅ 通过 | `npm run lint` 无 Error |
| 测试覆盖率 | 🟡 中等 | 整体约 77%，types 模块 0%，browser 65.68% |
| 文档一致性 | ⚠️ 需同步 | 多个文档版本基线与实际不符 |
| 公开 API | ✅ 稳定 | 14 个公开导出，上次审计 2026-03-25 |
| 技术债 | 🟡 已知 | architecture.md §7 有完整记录 |

---

## 1. 版本基线检查

### 1.1 当前版本

```
package.json:          0.7.2 (2026-03-24)
architecture.md:       0.7.0
release-quality-gates.md: 0.4.0 ⚠️ OUTDATED
api-compatibility-matrix.md: 0.3.1 ⚠️ OUTDATED
api-stability-audit.md: 2026-03-25 (TASK-0019) ✅ RECENT
```

**问题**: `architecture.md` 和 `release-quality-gates.md` 版本号与实际不符。`api-compatibility-matrix.md` 描述的是 0.3.x 时代的 API，已严重过时（当前 0.7.2）。

**建议**: 以 `api-stability-audit.md`（2026-03-25）为最新 API 基线参考，更新 `architecture.md` 的版本声明至 0.7.2，并废弃或重构 `api-compatibility-matrix.md`。

---

## 2. 公开 API 面（source/index.ts）

### 2.1 公开导出清单

| 类别 | 导出 | 来源 |
|------|------|------|
| Types | JSX/DOM 属性类型 | `./types/index.js` |
| App | `AirxApp`, `createApp` | `./app/index.js` |
| Element | `Fragment`, `component`, `createElement`, `AirxComponent`, `AirxElement`, `AirxChildren`, `AirxComponentContext` | `./element/index.js` |
| Hooks | `inject`, `provide`, `onMounted`, `onUnmounted` | `./render/index.js` |
| SSR | `SSRApp`, `createSSRApp`, `renderToString`, `hydrate` | `./render/index.js` |
| Plugin | `Plugin` (type) | `./render/index.js` |

**合计**: 约 14 个公开导出（不含类型集合）。

### 2.2 已废弃 API

- `createRef`, `watch`, `Ref`, `LegacyRef` — 0.7.0 移除，迁至 `migration-0.7.md`

### 2.3 WIP API（需明确状态）

- `AirxApp.plugin()` — JSDoc 标记 `@deprecated WIP`
- `AirxApp.renderToHTML()` — JSDoc 标记 `@deprecated WIP`

**建议**: 在 architecture.md 或单独 API 稳定性声明中明确这些 WIP API 的预期稳定时间（建议 0.9.x 或 1.0 前决定是启用还是移除）。

---

## 3. 测试覆盖率

```
模块                    分支   决策   函数   行
──────────────────────────────────────────────
source/app              87.04  90.9   100    87.04
source/element          100    100    100    100
source/render/basic     96.99  86.66  93.33  96.99
source/render/browser   65.68  67.64  71.42  65.68  ⚠️
source/render/server    78.59  80.2   87.87  78.59
source/signal           81.08  84.61  100    81.08
source/symbol           100    100    100    100
source/types             0      50     50      0     ⚠️
──────────────────────────────────────────────
整体                    ~77%   ~79%   ~85%   ~77%
```

**低覆盖率模块**:
- `source/types/`: 类型定义文件，无需运行时测试（可接受 0%）
- `source/render/browser/`: 65.68% — browser 调度与提交逻辑是技术债集中区（见 architecture.md §7）

**建议**: `render/browser` 覆盖率提升是 0.8.x Iteration A 的目标之一（见 `optimization-roadmap-0.8.md`）。

---

## 4. 技术债清单（来自 architecture.md §7）

1. Browser / Server 的 `commitDom` 逻辑有较高重复度
2. Signal watcher 的微任务收集策略仍需要更多集成测试验证
3. SSR 与 Browser 的 DOM 属性更新策略尚未完全统一
4. `plugin()` / `renderToHTML()` 仍带有 WIP / 过渡语义

---

## 5. 依赖分析

### 5.1 运行时依赖

```
airx@0.7.2 运行时依赖:
  - csstype@^3.1.3 (类型定义，仅编译时使用)
```

**极简依赖策略**: airx 保持极简运行时，只依赖 `csstype` 做 CSS 类型推断。这是好的设计选择。

### 5.2 开发依赖

```
TypeScript: ^5.4.5
Vitest: ^3.2.4
@vitest/coverage-v8: ^3.2.4
ESLint + typescript-eslint: ^8.35.1
signal-polyfill: ^0.2.2
jsdom: ^26.1.0
```

---

## 6. 文档一致性评估

| 文档 | 当前状态 | 与实际符合度 |
|------|---------|------------|
| `architecture.md` | 较完整，但版本号过时 | 🟡 70% |
| `release-quality-gates.md` | 严重过时（引用 0.4.0） | 🔴 30% |
| `api-compatibility-matrix.md` | 描述 0.3.x API，已过时 | 🔴 20% |
| `api-stability-audit.md` | 2026-03-25 完成，较新 | ✅ 95% |
| `optimization-roadmap-0.8.md` | 有具体迭代规划 | ✅ 90% |
| `ssr-*.md` (6个) | SSR 专项文档 | ✅ 良好 |
| `migration-0.7.md` | 0.7 迁移指南 | ✅ 良好 |

---

## 7. 发布流程成熟度

### 7.1 已有机制

- ✅ CHANGELOG.md（符合 Keep a Changelog 格式）
- ✅ 语义化版本（semver）
- ✅ GitHub Actions CI
- ✅ prepublishOnly build 门禁
- ✅ 测试套件（Vitest + jsdom）
- ✅ 覆盖率检查

### 7.2 缺失机制

- ❌ `package.json` 未包含 `typecheck` script（`release-quality-gates.md` 已有建议但未落实）
- ❌ 下游包（airx-router, vite-plugin）peer dependency 尚未更新至 0.7.x

---

## 8. ROADMAP-0001 实施建议

基于健康检查结果，ROADMAP-0001（建立 Airx 核心运行时治理与版本基线）建议分阶段执行：

### Phase 1: 文档同步（高价值，低风险）

1. 更新 `architecture.md` 版本声明至 0.7.2
2. 更新 `release-quality-gates.md` 至 0.7.x 基线（含 `typecheck` script 建议）
3. 重构或废弃 `api-compatibility-matrix.md`（内容严重过时）

### Phase 2: WIP API 决策

4. 明确 `plugin()` / `renderToHTML()` 的定位：
   - 方案 A：完成实现，解除 WIP 标记
   - 方案 B：从公开 API 中移除
   - 建议在 0.8.x 前决定

### Phase 3: 测试覆盖率提升

5. 以 `optimization-roadmap-0.8.md` Iteration A 为准，提升 `render/browser` 覆盖率

### Phase 4: 下游兼容验证

6. 验证 airx-router 和 vite-plugin 对 0.7.x 的兼容情况

---

## 9. 结论

airx 0.7.x 核心运行时整体健康：
- 构建、lint、测试均通过
- 公开 API 面清晰且稳定
- 依赖极简（仅 csstype）
- 技术债已知且有规划

**主要风险**：文档版本基线不同步，特别是 `release-quality-gates.md` 和 `api-compatibility-matrix.md` 已严重过时，可能导致新贡献者误解项目状态。

**最高优先级修复**：更新 `architecture.md` 至 0.7.2，并决定 `plugin()`/`renderToHTML()` 的去留。

---

*Refs: TASK-0023, ROADMAP-0001*
