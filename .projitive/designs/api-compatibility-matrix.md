# Airx API 与版本兼容矩阵

## 1. 目标

本文档用于收敛 Airx 作为生态核心运行时的 API 面、版本边界与下游兼容关系，避免主站、router、vite-plugin 在升级时各自做隐式判断。

## 2. 当前包状态

- 包名: `airx`
- 当前版本: `0.3.1`
- 代码入口: `source/index.ts`
- 运行时基础: JSX + Signal
- 构建方式: Vite library build（ESM only）

## 3. 当前公开 API 面

根据 `source/index.ts`，当前 Airx 的核心公开能力分为四类。

### 3.1 应用入口

- `createApp`

### 3.2 JSX / 组件模型

- `Fragment`
- `component`
- `createElement`
- `AirxComponent`
- `AirxElement`
- `AirxChildren`
- `AirxComponentContext`

### 3.3 上下文与生命周期

- `provide`
- `inject`
- `onMounted`
- `onUnmounted`

### 3.4 插件与类型

- `Plugin`
- `types` 中导出的类型集合

## 4. API 设计边界

### 4.1 运行时模型

Airx 0.3.x 的 README 明确强调：

- 以 Signal 为状态基础
- 使用 JSX 函数组件语法
- 不再围绕旧的 `createRef/watch` 模型设计 API

这意味着 0.3.x 的认知模型已经和主站当前使用的 0.1.x 明显分叉。

### 4.2 向后兼容结论

| 维度 | 0.1.x 主站模型 | 0.3.x 当前模型 | 兼容结论 |
| --- | --- | --- | --- |
| 状态模型 | `createRef`, `watch` | `Signal.State`, `Signal.Computed` | 不兼容 |
| 生命周期 | `onMounted` 风格存在 | `onMounted`, `onUnmounted` | 部分兼容 |
| JSX 工厂 | `__airx__.createElement` | `createElement` | 概念兼容 |
| 组件模式 | 返回渲染函数 | 返回渲染函数 | 兼容 |
| 上下文机制 | `provide/inject` | `provide/inject` | 基本兼容 |

结论：

- `0.3.x` 不能被视为 `0.1.x` 的无痛升级。
- 主站当前依赖 `airx@^0.1.6`，升级到 `0.3.x` 前必须单独评估状态模型迁移成本。

## 5. 下游项目兼容矩阵

### 5.1 与 airx-router

- `airx-router@0.2.1`
- peer dependency: `airx@^0.2.0`

兼容结论：

| 项目 | 当前版本 | 依赖要求 | 结论 |
| --- | --- | --- | --- |
| airx | 0.3.1 | 自身 | 基线版本 |
| airx-router | 0.2.1 | `airx@^0.2.0` | 与 airx 0.3.1 语义兼容，但需行为验证 |

说明：

- 从 semver 范围看，`^0.2.0` 可接受 `0.2.x`，是否覆盖 `0.3.x` 需要按 npm 0.x 规则谨慎确认。
- 在治理层应把 router 与 airx 的兼容关系视为“需验证”，而不是“已证明稳定”。

### 5.2 与 vite-plugin-airx

- `vite-plugin-airx@0.2.0`
- 对 `airx` 没有 peer dependency 约束
- 主要作用是注入 JSX 转换配置

兼容结论：

| 项目 | 当前版本 | 依赖要求 | 结论 |
| --- | --- | --- | --- |
| vite-plugin-airx | 0.2.0 | `vite@^5.0.0` | 与 airx API 直接耦合低，但与 JSX 工厂命名强耦合 |

说明：

- 该插件当前默认注入 `__airx__.Fragment` 与 `__airx__.createElement`。
- 只要 Airx 保持这两个导出稳定，插件接入层可以保持低改动。

### 5.3 与主站 yinxulai.github.io

主站当前依赖：

- `airx@^0.1.6`
- `airx-router@^0.1.0`

兼容结论：

| 消费方 | 当前依赖 | 与 airx 0.3.1 的关系 |
| --- | --- | --- |
| yinxulai.github.io | `airx@^0.1.6`, `airx-router@^0.1.0` | 明确不兼容，需单独迁移 |

## 6. 治理决策

### 6.1 当前推荐策略

- Airx 核心仓库继续以 `0.3.x` 为当前代演进线。
- 主站仓库继续固定在 `0.1.x` 认知模型，直到明确启动迁移专项。
- Router 与 Vite 插件需建立对 Airx 当前代的兼容性验证，不再依赖经验判断。

### 6.2 升级触发条件

满足以下任一条件时，必须重新评估矩阵：

1. Airx 核心导出面发生变化
2. JSX 工厂命名或插件注入方式变化
3. Router 提升 peer dependency 范围
4. 主站决定从 `0.1.x` 迁移到新模型

## 7. 下一步任务建议

- TASK-0003: 建立 Airx 发布与质量门禁清单
- TASK-0004: 沉淀 0.3.x 演进与迁移说明
- Router 侧补齐与 Airx 的行为兼容验证
- 主站侧建立从 0.1.x 到 0.3.x 的迁移评估文档
