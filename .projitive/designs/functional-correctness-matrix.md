# Airx 功能正确性验证矩阵与可用性门禁

## 1. 目标

定义 Airx 核心能力的“正确性验证矩阵”，确保后续实现和发布以可验证标准推进，而不是依赖经验判断。

覆盖范围：
- 渲染与调度
- 组件生命周期
- 上下文依赖注入
- Signal 驱动响应
- App 级 API 可用性

## 2. 验证对象

基于当前对外 API（`source/index.ts`）：
- `createApp`
- `createElement`, `Fragment`, `component`
- `provide`, `inject`, `onMounted`, `onUnmounted`
- SSR `renderToHTML`
- 插件链 `plugin(...plugins)`

## 3. 正确性矩阵

| 编号 | 领域 | 场景 | 验收标准 | 级别 |
| --- | --- | --- | --- | --- |
| C-01 | 渲染 | createApp + mount 基础渲染 | 首次 mount 后 DOM 与预期一致 | P0 |
| C-02 | 渲染 | 再次 mount 同容器 | 旧内容被清空且新树渲染正确 | P1 |
| C-03 | 渲染 | 兄弟节点 reconcile | sibling 顺序稳定，无丢失/重排异常 | P0 |
| C-04 | 渲染 | 文本/comment 子节点 | `null/false/''` 处理符合预期 | P1 |
| C-05 | 渲染 | 错误渲染回退 | 组件抛错后可生成错误渲染结果 | P0 |
| L-01 | 生命周期 | onMounted 调用时机 | 组件挂载后调用一次 | P0 |
| L-02 | 生命周期 | onUnmounted 清理 | 卸载时触发清理函数一次 | P0 |
| L-03 | 生命周期 | 嵌套组件清理顺序 | 子组件清理先于父组件 | P1 |
| I-01 | 注入 | provide/inject 基本传递 | 子组件可读到最近 provider 值 | P0 |
| I-02 | 注入 | 多层 provider 覆盖 | 最近层覆盖生效 | P1 |
| I-03 | 注入 | inject 缺失场景 | 缺失时行为稳定（null/undefined 或约定值） | P1 |
| S-01 | Signal 响应 | state 写入触发重渲染 | 变更后 UI 更新一次且不丢事件 | P0 |
| S-02 | Signal 响应 | 连续写入与微任务调度 | 最终一致，无死循环 | P0 |
| S-03 | Signal 响应 | 条件依赖切换 | 旧依赖不再触发，新增依赖可触发 | P0 |
| S-04 | Signal 响应 | 卸载后写入 | 不再触发卸载实例渲染 | P0 |
| A-01 | App API | plugin 链调用 | 插件按注册顺序参与渲染流程 | P1 |
| A-02 | App API | renderToHTML 输出 | SSR 输出非空且结构符合预期 | P1 |
| A-03 | App API | 函数组件作为 createApp 输入 | 会自动转换为 element 并正确渲染 | P0 |

## 4. 门禁分级

### 4.1 发布阻断门禁（P0）

必须全部通过，否则禁止发布：
- C-01, C-03, C-05
- L-01, L-02
- I-01
- S-01, S-02, S-03, S-04
- A-03

### 4.2 增强门禁（P1）

建议同里程碑内通过：
- C-02, C-04
- L-03
- I-02, I-03
- A-01, A-02

## 5. 测试组织方案

建议目录：
- `tests/core/render.spec.ts`（C-*）
- `tests/core/lifecycle.spec.ts`（L-*）
- `tests/core/injection.spec.ts`（I-*）
- `tests/core/signals-reactivity.spec.ts`（S-*）
- `tests/core/app-api.spec.ts`（A-*）

建议运行入口：
- `npm run test:core`：只跑 P0 + P1 核心集
- `npm run test`：全部测试

## 6. 与 Signals 计划的关系

本矩阵与 `signals-alignment-test-plan.md` 关系：
- Signals 计划聚焦语义对齐深度（proposal/polyfill 层）。
- 本矩阵聚焦 Airx 对外能力正确性（产品行为层）。
- 两者共享 S-* 用例编号体系，避免重复建设。

## 7. 执行顺序

1. 先落地 P0 用例。
2. 接入 CI 作为阻断门禁。
3. 补齐 P1 用例。
4. 将每次回归缺陷映射到矩阵编号并补测。

## 8. 完成定义

当且仅当满足以下条件，视为 TASK-0006 完成：
- 形成可执行矩阵（编号、场景、验收标准完整）。
- 明确 P0/P1 门禁分级。
- 能与 Signals 对齐计划形成联动。
- 可直接指导后续实现与 CI 门禁接入。
