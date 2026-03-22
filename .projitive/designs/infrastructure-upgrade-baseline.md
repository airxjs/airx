# Airx 基建升级基线与版本策略

## 1. 目标

为 Airx 建立可持续的基建升级策略，覆盖 Node、TypeScript、构建链与 CI，避免一次性升级造成不可控回归。

## 2. 当前基线快照

基于当前 `package.json` 与 CI：

- Node: CI 使用 Node 20（`check.yml`）
- TypeScript: `^5.4.5`
- 构建: Rollup + `rollup-plugin-typescript2`
- Lint: ESLint 8 + `@typescript-eslint` 7
- 测试: 暂无 test 脚本与测试门禁
- CI: `check.yml` 仅 `lint + build`，无 typecheck/test

## 3. 目标版本与支持窗口

### 3.1 Node 支持策略

- 运行与构建基线: Node 20 LTS
- 预备支持: Node 22 LTS（进入兼容验证后再提升）
- 不再承诺: Node < 20

### 3.2 TypeScript 策略

- 当前线: 5.4.x
- 目标线: 5.6+（在 CI 双版本验证后切换）
- 策略: “小步升级 + API 声明稳定检查”

### 3.3 构建链策略

- 保持 Rollup 主链稳定。
- 优先升级与安全相关插件（node-resolve/commonjs/eslint）。
- 任何构建链升级都必须跑完核心正确性矩阵（TASK-0006）。

## 4. 升级阶段计划

### 阶段 U0：门禁补齐（先于升级）

必须先补齐以下脚本与 CI 任务：
- `typecheck`: `tsc --noEmit`
- `test`: Vitest（先空壳后补用例）
- CI 增加 `typecheck` 与 `test` job

### 阶段 U1：安全与低风险升级

- 升级 lint/构建周边非破坏性依赖。
- 保持主 API 不变，验证 `output/esm/index.d.ts` 稳定。

### 阶段 U2：TS 与工具链主版本升级

- 升级 TS 到目标线。
- 运行 Signals 计划（TASK-0007）与正确性矩阵（TASK-0006）全量验证。

### 阶段 U3：CI 与发布流程现代化

- `actions/checkout` 与 `actions/setup-node` 升级到 v4。
- 将 test/typecheck 纳入发布阻断门禁。

## 5. 风险矩阵

| 风险 | 触发场景 | 影响 | 缓解措施 |
| --- | --- | --- | --- |
| 类型声明漂移 | TS 升级后 d.ts 变化 | 下游编译失败 | 增加 d.ts diff 检查 |
| 调度语义回归 | signal/polyfill 版本变化 | 运行时更新异常 | 跑 Signals MVP 用例 |
| 构建输出变化 | Rollup 插件升级 | 包体积或格式异常 | build 产物对比 + smoke test |
| CI 漏检 | 仅 lint/build | 隐藏回归进入发布 | 增加 typecheck/test 阻断 |

## 6. 回滚策略

- 任一 P0 门禁失败，禁止发布。
- 回滚顺序：
  1. 回退依赖版本变更提交
  2. 恢复上一个可用 lockfile
  3. 恢复 CI 到上个稳定模板
- 只允许 fast-forward 发布，不允许带未知失败状态发布。

## 7. 验收标准（TASK-0005）

- 有明确版本支持窗口（Node/TS/构建链）。
- 有分阶段升级路径（U0-U3）。
- 有风险矩阵与回滚策略。
- 可直接指导下一步“脚本补齐 + CI 门禁补齐”的实施工作。

## 8. 与其他任务关系

- 依赖 TASK-0006（正确性矩阵）作为升级后验证标准。
- 依赖 TASK-0007（Signals 计划）作为响应语义回归标准。
- 后续可拆分实施任务：
  - 增加 `typecheck` / `test` 脚本
  - 改造 `check.yml` 为 lint + typecheck + test + build
