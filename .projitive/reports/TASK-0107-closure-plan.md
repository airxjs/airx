# Airx 0.10.0 生态关闭计划

> Task: TASK-0107 | 制定 airx 0.10.0 生态关闭计划
> Date: 2026-06-11
> Status: ✅ Complete
> Roadmap: ROADMAP-0005 (Airx 0.10.0 - API & Ecosystem Closure)

---

## 🎯 目标

Airx 0.10.0 是"生态关闭"版本，目标是：
1. 锁定稳定 API surface，无 breaking changes
2. 清理已废弃功能，明确版本支持周期
3. 补充缺失的官方示例，提升开发者上手体验
4. 确保所有官方包（core + router + vite-plugin）文档完整

---

## 📅 时间线

| 阶段 | 时间 | 内容 |
|------|------|------|
| Phase 1: API 审计 | 2026-Q3 初 | 完成 TASK-0106，输出 API 审计报告 |
| Phase 2: 关闭执行 | 2026-Q3 中 | 补充示例、发布 deprecation 声明 |
| Phase 3: 发版准备 | 2026-Q3 末 - Q4 初 | 最终 review、CHANGELOG、发版 |
| Phase 4: 发布 | 2026-Q4 | 0.10.0 正式发布 |

---

## 📦 关闭范围

### 1. airx (core) — v0.9.x → v0.10.0

**当前状态**:
- 400 tests ✅
- Lint clean ✅
- Typecheck clean ✅
- 0 个功能级 deprecated API（仅 2 个 ARIA 类型 deprecation）
- 无 experimental 标记

**关闭要求**:
- ✅ 确认稳定 API surface 并文档化
- ✅ 补充 `examples/` 目录（3-5 个完整示例）
- ✅ 发布 API 稳定性声明
- ✅ 更新 CHANGELOG 标注 0.10.0 为 LTS（或明确支持周期）

**不需要关闭**（功能正常，无须废弃）:
- hydrate API（已稳定，0.8.0 已移除 experimental）
- Signal  primitives（已稳定）
- SSR renderToString（已稳定）

---

### 2. airx-router — v0.9.x → v0.10.0

**当前状态**:
- 28 tests ✅
- Lint clean ✅
- README 完整（EN）

**关闭要求**:
- ⚠️ 确认与 airx core 0.10.0 的兼容性
- ⚠️ 如有余力，补充中文 README（可选）

---

### 3. vite-plugin-airx — v0.9.x → v0.10.0

**当前状态**:
- Typecheck clean ✅
- 无测试套件（可接受）
- README 完整（EN）

**关闭要求**:
- ⚠️ 确认 Vite 5/6/7/8 兼容性覆盖
- ⚠️ 补充 smoke test（建议，非必须）

---

## 📋 执行任务清单

### P0 — 必须完成

| # | 任务 | 负责 | 状态 |
|---|------|------|------|
| 1 | TASK-0106: API surface 审计 + breaking change 风险识别 | AI | TODO |
| 2 | 创建 `examples/` 目录（至少 3 个完整示例） | AI | TODO |
| 3 | 发布 airx 0.10.0 API 稳定性声明 | AI | TODO |
| 4 | 更新 CHANGELOG for 0.10.0 | AI | TODO |
| 5 | 确认 router + vite-plugin 与 core 0.10.0 兼容 | AI | TODO |

### P1 — 建议完成

| # | 任务 | 状态 |
|---|------|------|
| 6 | 补充 vite-plugin smoke test | TODO |
| 7 | 补充 router 中文 README（可选） | TODO |

---

## 🔄 迁移路径

### 从 0.9.x 升级到 0.10.0

预期：**无 breaking changes**，平滑升级

```
npm install airx@latest airx-router@latest vite-plugin-airx@latest
```

如有任何 deprecated API 清理，将提供：
1. 控制台 warning（明确指出需要迁移的 API）
2. CHANGELOG 明确说明迁移步骤
3. 迁移指南文档（如需要）

---

## 📁 产出物

- TASK-0106 审计报告（API surface + breaking change 风险）
- `examples/` 目录（含 3-5 个完整示例）
- API 稳定性声明文档
- 更新后的 CHANGELOG.md

---

## ⚠️ 风险与假设

| 风险/假设 | 影响 | 缓解 |
|-----------|------|------|
| 假设：0.10.0 无 breaking changes | 高 | Phase 1 TASK-0106 将确认 |
| 风险：外部消费者使用内部 API | 中 | API 审计时识别，必要时标记为 @internal |
| 风险：examples/ 示例维护负担 | 低 | 保持示例简单，降低维护成本 |
| 假设：0.10.0 后进入维护模式 | 中 | 需与阿来确认长期规划 |

---

## ❓ 待确认事项

1. **Airx 0.10.0 后是进入维护模式还是继续活跃开发？**
   - 如果继续活跃开发：需要制定后续版本计划
   - 如果进入维护模式：需要公告和社区交接计划

2. **是否需要为 0.10.0 设置 LTS 支持周期？**
   - 例如：维护 12 个月，提供安全更新

3. **airx-router 和 vite-plugin 是否随 core 一起发版？**
   - 建议：保持独立发版，版本号对齐（均 0.10.0）

---

*本计划基于 2026-06-11 的 ecosystem audit (TASK-0108) 结果制定*