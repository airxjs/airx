# WIP API Decision: plugin() / renderToHTML()

> **决策日期**: 2026-03-25
> **任务**: TASK-0025 → TASK-0046
> **状态**: ✅ **已决策并实施**

---

## 背景

airx 0.7.x 中，`AirxApp.plugin()` 和 `AirxApp.renderToHTML()` 被标记为 `@deprecated WIP`。随着 0.8.x 规划推进，需要明确这两个 API 的去留。

---

## 审计结论

### plugin()

| 项目 | 状态 |
|------|------|
| 代码位置 | `source/app/app.ts#L70-73` |
| 实现状态 | ✅ 功能完整 |
| 测试覆盖 | ✅ 12 tests in `app.test.ts` (plugin chaining, multiple plugins) |
| 设计价值 | ✅ 扩展机制核心入口，airx 插件系统的基础 |
| **结论** | **保留，解除 WIP 标记** |

### renderToHTML()

| 项目 | 状态 |
|------|------|
| 代码位置 | `source/app/app.ts#L81-85` |
| 实现状态 | ✅ 功能完整，调用 `serverRender()` 返回 `Promise<string>` |
| 测试覆盖 | ✅ `app.test.ts` 有完整测试 |
| 设计价值 | ✅ SSR 能力的直接暴露 |
| **结论** | **保留，解除 WIP 标记** |

---

## 决策

**方案：保留 API，移除 @deprecated WIP 标记，完善 JSDoc 文档**

理由：
1. 两个 API 都功能完整，测试覆盖充分
2. `plugin()` 是扩展机制的核心入口，有实际价值
3. `renderToHTML()` 是 SSR 能力的一部分，用户有此需求
4. `@deprecated WIP` 标记是状态遗留，不表示实际质量问题

---

## 实施结果（2026-03-25，TASK-0025）

| 操作 | 文件 | 状态 |
|------|------|------|
| 移除 plugin() @deprecated WIP 标记 | `source/app/app.ts` | ✅ |
| 移除 renderToHTML() @deprecated WIP 标记 | `source/app/app.ts` | ✅ |
| plugin() 补充 JSDoc 示例 | `source/app/app.ts` | ✅ |
| renderToHTML() 补充 JSDoc 示例 | `source/app/app.ts` | ✅ |
| Build | `npm run build` | ✅ PASS |
| Lint | `npm run lint` | ✅ PASS |
| Tests | `npm run test` | ✅ 183/183 PASS |

---

## 后续行动

无阻塞项。如未来需废弃这两个 API，重新评估即可。

---

*Refs: TASK-0025, TASK-0046, ROADMAP-0001*
