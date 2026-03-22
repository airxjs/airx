# Airx 0.8.x Optimization Roadmap

## 1. Goal

本路线图承接 TASK-0011，目标不是一次性重写运行时，而是在 0.7.x 到 0.10.x 之间按优先级持续消化当前技术债。

核心目标如下：

1. 让 Browser 调度与提交流程可验证、可扩展。
2. 收敛 Browser / Server 的重复实现，减少后续回归成本。
3. 补齐文档与实现的一致性，降低下游接入误解。
4. 为 router、vite-plugin 等下游包提供更稳定的运行时边界。

## 2. Baseline

结合 [designs/research/TASK-0011.implementation-research.md](../../designs/research/TASK-0011.implementation-research.md) 与现有实现，当前最关键的技术债集中在以下位置：

- [source/render/browser/browser.ts#L14-L240](../../source/render/browser/browser.ts#L14-L240): 浏览器调度与提交逻辑。
- [source/render/server/server.ts#L104-L314](../../source/render/server/server.ts#L104-L314): 服务端提交逻辑与浏览器版本重复。
- [source/render/basic/common.ts#L191-L533](../../source/render/basic/common.ts#L191-L533): children 协调、Signal watcher 与遍历主路径。
- [source/render/basic/plugins/internal/basic/basic.ts#L55-L173](../../source/render/basic/plugins/internal/basic/basic.ts#L55-L173): DOM 更新与实例复用判断。
- [designs/core/architecture.md#L1-L127](../../designs/core/architecture.md#L1-L127): 运行时文档基线。

## 3. Iterations

### Iteration A: 0.7.1 稳定化

目标：先把最容易产生运行时噪声的问题收口。

工作项：

- 完成 Browser 调度器优化，避免无工作时持续排队，并补充宿主兼容降级。
- 为调度器补充回归测试，确认同步完成时不会空转。
- 更新架构文档，统一 0.7.0 API 边界与实现流程描述。

验收标准：

- render/browser 定向测试通过。
- 研究简报、架构文档、路线图三者内容一致。
- 无新增公开 API 变更。

### Iteration B: 0.8.0 提交流程收敛

目标：降低维护成本，为后续性能优化腾出空间。

工作项：

- 提取 browser/server 共用的 commit helper。
- 收敛 DOM 创建、删除、父节点查找与深度遍历逻辑。
- 明确哪些 DOM 更新必须走插件，哪些属于 renderer 内核职责。

验收标准：

- browser/server 重复逻辑显著下降。
- DOM 提交改动有双端回归测试覆盖。
- 不引入 SSR 输出差异。

### Iteration C: 0.9.0 响应式一致性与测试补强

目标：增强对 Signal 与注入系统边界的信心。

工作项：

- 为 `performUnitOfWork` 增加真实 Signal watcher 集成测试。
- 补充 provide/inject 变化、列表 children 复用、生命周期交错场景测试。
- 评估 watcher 的微任务收集策略是否需要抽象或替换。

验收标准：

- common/browser/server 三层关键路径均有集成测试。
- 明确记录未覆盖边界与风险。

### Iteration D: 0.10.0 API 与生态收口

目标：明确对外长期稳定边界。

工作项：

- 决定 `plugin()` 与 `renderToHTML()` 的长期定位。
- 清理 README / README_CN 与代码导出不一致内容。
- 与 router、vite-plugin 对齐版本说明与接入约束。

验收标准：

- README、架构文档、CHANGELOG 保持一致。
- 下游包不再依赖模糊或过渡语义。

## 4. Priority

| Priority | Topic | Reason |
| -------- | ----- | ------ |
| P0 | Browser 调度空转 | 直接影响运行时行为与后续性能分析 |
| P1 | 提交流程重复 | 影响维护成本与回归风险 |
| P1 | Signal/Inject 集成测试 | 当前实现复杂但验证不足 |
| P2 | 文档与 API 一致性 | 影响下游接入与版本升级理解 |

## 5. Process Constraints

每轮迭代都应遵守以下流程：

1. 先更新 research brief 或设计说明，再进入代码修改。
2. 优先做小步收敛，不把重构和行为变更混在同一轮。
3. 每次运行时改动都要有最小回归测试。
4. 改动公开 API 或迁移路径时，同步更新 CHANGELOG 与迁移文档。

## 6. Current Outcome

本轮已完成的第一步：

- 优化 browser 调度器，使其只在存在剩余工作时继续调度。
- 增加 `requestIdleCallback` 不可用时的降级路径。
- 更新核心架构文档并补齐 TASK-0011 研究简报。

下一步建议从 commit 提交流程收敛开始，而不是继续堆叠零散修补。
