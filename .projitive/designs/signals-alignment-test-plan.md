# Airx Signals 对齐与单测全覆盖计划

## 1. 目标

本计划用于推动 Airx 在 Signals 相关行为上达到“可解释、可验证、可回归”的状态，重点覆盖：

- 变化收集（dependency/change tracking）
- 响应处理（reaction scheduling）
- 生命周期清理（watch/unwatch/dispose）

对齐基线：
- 提案: https://github.com/tc39/proposal-signals
- Polyfill: https://github.com/proposal-signals/signal-polyfill

## 2. 当前实现事实（基于代码）

### 2.1 Signal 封装层
文件: `source/signal/index.ts`

- 通过 `globalThis.Signal` 获取运行时实现。
- 提供 `createState/createComputed/createWatch/isState` 四个核心封装。
- 有单实例保护：检测到多个 Signal 实例会抛错。

### 2.2 渲染层响应机制
文件: `source/render/common/index.ts`

- 组件返回 render 函数时，为组件实例创建 `signalWatcher`。
- 在 watcher 回调中：
  - 标记 `instance.needReRender = true`
  - 触发更新调度 `onUpdateRequire`
  - 在 `queueMicrotask` 中 `watch()` 并消费 `getPending()`
- 每次渲染会构建 `childrenComputed`，并由 watcher 订阅。
- 组件销毁时通过 `addDisposer(() => signalWatcher.unwatch())` 清理。

## 3. 语义对齐范围

### 3.1 变化收集（必须覆盖）

1. 首次渲染仅收集实际读取到的 state/computed。
2. 条件分支切换后，旧分支依赖不再触发更新。
3. 嵌套 computed 的依赖图变化能正确传播。
4. 多个 state 在同一更新周期中的 pending 列表消费完整。

### 3.2 响应处理（必须覆盖）

1. 写入 state 后，组件更新不会丢失（no missed update）。
2. 连续写入时，响应顺序稳定且不会无限循环。
3. microtask 调度下，pending 消费与重新 watch 的时序正确。
4. 渲染报错路径（error render）不会破坏后续响应订阅。

### 3.3 清理语义（必须覆盖）

1. 组件卸载后 watcher 必须 `unwatch`。
2. 卸载后再写 state，不应触发已卸载实例更新。
3. ref 为 state 时，mount 设置 dom，unmount 置为 `undefined`。

## 4. 单测矩阵

| 编号 | 领域 | 用例 | 期望 |
| --- | --- | --- | --- |
| S-01 | 收集 | 首次渲染读取单一 state | 写入该 state 触发一次重渲染 |
| S-02 | 收集 | 条件依赖切换 A->B | A 变化不再触发，B 变化触发 |
| S-03 | 收集 | computed 链 A->B->C | 源 state 变化正确传导到 C |
| S-04 | 收集 | 多依赖同 tick 写入 | pending 全部消费，无漏更新 |
| R-01 | 响应 | 单次写入 | 正确进入更新流程并提交 children |
| R-02 | 响应 | 连续多次写入 | 最终视图正确，无死循环 |
| R-03 | 响应 | render 抛错后恢复 | error render 可见，后续更新仍可继续 |
| R-04 | 响应 | parent 触发 child 重渲染 | 子组件读取值与期望一致 |
| L-01 | 清理 | unmount 触发 unwatch | watcher 清理被调用 |
| L-02 | 清理 | unmount 后 state 变化 | 不再触发卸载实例更新 |
| L-03 | 清理 | ref state mount/unmount | mount 赋值 dom，unmount 置 undefined |

## 5. 测试落地方案

### 5.1 工具链建议

- 测试框架: Vitest
- 运行环境: jsdom（覆盖 dom/ref/mount 场景）
- 目录建议:
  - `tests/signal/signal-runtime.spec.ts`
  - `tests/signal/render-reactivity.spec.ts`
  - `tests/signal/lifecycle-cleanup.spec.ts`

### 5.2 断言策略

- 黑盒断言优先：以组件输出与调用次数为主要观察面。
- 必要时白盒断言：通过 mock `createWatch` 或 hook 调度函数校验调用顺序。
- 时序断言：使用 `await Promise.resolve()` 推进 microtask 队列。

### 5.3 最小通过标准（MVP）

- S-01/S-02/R-01/R-02/L-01/L-02 6 条用例先全绿。
- 剩余用例在同一里程碑内补齐。

## 6. 风险与控制

### 风险

1. `getPending()` 的消费语义受 polyfill 版本细节影响。
2. 测试里若过度白盒化，后续重构成本高。
3. render 报错恢复行为目前依赖 `createErrorRender`，边界场景易漏。

### 控制措施

1. 先建立黑盒行为快照，再补白盒顺序断言。
2. polyfill 升级前必须跑完整 signals 测试矩阵。
3. 所有回归 bug 必须新增用例并加入矩阵编号。

## 7. 执行顺序

1. 搭建 Vitest + jsdom 基础设施。
2. 先实现 S-01/S-02/R-01/R-02。
3. 再实现 L-01/L-02。
4. 最后补 S-03/S-04/R-03/R-04/L-03。
5. 在 CI 中加入 `test` 门禁并纳入发布检查。

## 8. 完成定义

当且仅当满足以下条件，视为“Signals 对齐与测试计划完成并可执行”：

- 文档化覆盖变化收集、响应处理、清理语义。
- 至少 6 条 MVP 用例在实现后应可独立验证。
- 每条用例可映射到具体代码路径。
- 后续任务可直接按“执行顺序”进入实现阶段。
