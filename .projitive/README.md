# Projitive Governance Workspace

This directory (`.projitive/`) is the governance root for this project.

## Conventions
- Keep roadmap/task source of truth in .projitive governance store.
- Treat roadmap.md/tasks.md as generated views from governance store.
- Keep IDs stable (TASK-xxxx / ROADMAP-xxxx).
- Update report evidence before status transitions.

## Project Info
- Project: airx
- Package: `airx`
- Role: AirxJS 生态的核心运行时与 JSX 框架
- Tech Stack: TypeScript, Rollup, ESLint
- Primary Concern: 核心 API 稳定性、版本兼容性、运行时质量门禁

## Ecosystem Relation
- Upstream Role: 为 `airx-router` 和 `vite-plugin-airx` 提供基础组件模型与运行时能力
- Downstream Impact: API 变更会直接影响主站与 airxjs 生态中的其他子项目

## Current Governance Focus
- 建立版本兼容与发布治理基线
- 明确 0.3.x 核心 API 的演进方向
- 为后续质量门禁与发布文档补齐任务和里程碑
