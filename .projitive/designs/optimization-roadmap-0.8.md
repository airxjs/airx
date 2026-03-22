# Airx 优化行动计划 (0.7.0 → 1.0.0)

## 概述

本文档定义了接下来 Q2-Q3 的优化方向、优先级、资源分配与时间表。

---

## 优化目标

| 维度 | 目标 | 当前 | Gap |
|------|------|------|-----|
| **性能** | 平均渲染 < 16ms | 未测 | 建立基准 |
| **稳定性** | 信号过载处理 | 缺失 | batch() 实现 |
| **可维护性** | 核心测试 > 95% | ~85% | +10% |
| **文档** | 完整 API JSDoc | ~60% | +40% |
| **示例** | 10+ 渐进式示例 | 1 | +9 |

---

## Phase 1: 基础改进（4 周，即刻启动）

### 1.1 Signal.batch() 集成

**任务**: 在高频 Signal 更新时自动应用批处理

**工作内容**：

```typescript
// 当前问题
count.set(1)      // 触发渲染
count.set(2)      // 触发渲染
count.set(3)      // 触发渲染  ← 应该只渲染 1 次

// 目标实现
Signal.batch(() => {
  count.set(1)
  count.set(2)
  count.set(3)    // ← 仅 1 次渲染
})
```

**实施清单**：
- [ ] 创建 `source/signal/batch.ts`
- [ ] 实现 `batched()` 包装函数
- [ ] 在事件处理器中自动启用 batch
- [ ] 编写单测: `source/signal/batch.test.ts`
- [ ] 更新 README 示例

**预期成果**：
- 高频场景渲染次数减少 50-80%
- 内存抖动降低

**工作量**: 1-2 周  
**所有者**: TBD  
**优先级**: 🔴 P0

### 1.2 性能基准框架

**任务**: 建立可重复的性能测试基准

**工作内容**：

创建 `perf/` 目录：
```
perf/
├── bench.config.ts        # Benchmark.js 配置
├── render-bench.ts        # 渲染性能
├── signal-bench.ts        # Signal 更新
├── lifecycle-bench.ts     # 生命周期开销
└── report.md              # 基准报告
```

**基准场景**：

1. **初始化渲染** (Cold start)
   ```typescript
   // 1000 个组件树的首次渲染时间
   benchmark('Render 1000 components', () => {
     const app = createApp(<Tree depth={10} breadth={10} />)
     app.mount(container)
   })
   ```

2. **单元素更新** (Hot path)
   ```typescript
   // 单个 Signal 更新的延迟
   benchmark('Update single signal', () => {
     count.set(count.get() + 1)
   })
   ```

3. **批量更新** (Batch)
   ```typescript
   // 100 个 Signal 同时更新
   benchmark('Update 100 signals', () => {
     Signal.batch(() => {
       for (let i = 0; i < 100; i++) {
         signals[i].set(Math.random())
       }
     })
   })
   ```

4. **内存占用** (Memory)
   ```typescript
   // 1000 个组件树的内存占用
   // 使用 performance.memory 或 heap snapshot
   ```

**预期成果**：
- 确立性能基线
- 性能回归早期发现
- 优化效果量化

**工作量**: 1 周  
**所有者**: TBD  
**优先级**: 🟠 P0

### 1.3 API JSDoc 补充

**任务**: 为所有导出 API 补充完整的 JSDoc 文档

**工作内容**：

```typescript
/**
 * 创建一个 Airx 应用根对象
 * 
 * @param element - 根 JSX 元素或组件
 * @returns 应用对象，支持链式调用 mount()
 * 
 * @example
 * ```tsx
 * import * as airx from 'airx'
 * 
 * const app = airx.createApp(<App />)
 * app.mount(document.body)
 * ```
 * 
 * @see {@link AirxApp} 应用 API 接口
 */
export function createApp(element: AirxElement | AirxComponent): AirxApp
```

**需补充的文件**：
- [ ] `source/app/app.ts` 中 `createApp()`
- [ ] `source/element/element.ts` 中 all functions
- [ ] `source/render/basic/hooks/hooks.ts` 中生命周期钩子
- [ ] `source/types/index.ts` 中接口定义

**预期成果**：
- IDE 智能提示完整
- 自动生成 API 文档可行

**工作量**: 3-4 天  
**所有者**: TBD  
**优先级**: 🟡 P1

---

## Phase 2: 功能增强（4-6 周，Week 5-10）

### 2.1 异步生命周期支持

**任务**: 支持在 onMounted 中执行异步操作

**当前问题**：
```typescript
// 无法支持，onMounted 是同步的
onMounted(async () => {
  const data = await fetchData()
  state.set(data)
})
```

**目标设计**：
```typescript
// 新增异步钩子
onMountedAsync(async () => {
  const data = await fetchData()
  state.set(data)
  
  return () => {
    // cleanup
  }
})

// 或保持当前，支持返回 Promise<cleanup>
onMounted(async () => {
  const data = await fetchData()
  state.set(data)
  
  return () => {}  // 清理函数
})
```

**实施清单**：
- [ ] 修改 `AirxComponentContext.onMounted()` 类型定义
- [ ] 实现异步 listener 支持
- [ ] 处理错误与超时
- [ ] 编写完整单测
- [ ] 更新文档与示例

**预期成果**：
- 支持 async/await 数据加载
- 清晰的 SSR 支持

**工作量**: 2 周  
**所有者**: TBD  
**优先级**: 🟠 P1

### 2.2 错误边界实现

**任务**: 实现错误边界 (Error Boundary)，父组件可捕获子组件错误

**当前问题**：
```typescript
// 子组件崩溃会导致整个树崩溃
function Parent() {
  return () => <ChildWithError />  // 如果 ChildWithError 抛错，无法捕获
}
```

**目标设计**：
```typescript
// 错误边界包装器
import { withErrorBoundary } from 'airx'

function Parent() {
  const SafeChild = withErrorBoundary(ChildWithError, {
    fallback: (err) => <div>组件崩溃: {err.message}</div>,
    onError: (err) => console.log('子组件错误:', err)
  })
  
  return () => <SafeChild />
}
```

**实施清单**：
- [ ] 创建 `source/render/error-boundary.ts`
- [ ] 实现 `withErrorBoundary()` 高阶组件
- [ ] 支持自定义 fallback 组件
- [ ] 支持错误恢复与重试
- [ ] 编写单测与集成测试

**预期成果**：
- 应用稳定性提升
- 优雅降级能力

**工作量**: 2.5 周  
**所有者**: TBD  
**优先级**: 🟠 P1

### 2.3 扩展生命周期钩子

**任务**: 补充 `onBeforeMount`, `onBeforeUnmount` 等钩子

**当前 API**：
```typescript
onMounted(() => {})       // 挂载后
onUnmounted(() => {})     // 卸载时（开始）
```

**扩展目标**：
```typescript
onBeforeMount(() => {})        // 挂载前
onMounted(() => {})            // 挂载后
onBeforeUnmount(() => {})      // 卸载前
onUnmounted(() => {})          // 卸载后

onUpdated?.(deps => {})        // 依赖更新后
onErrorCaptured?.(err => {})   // 捕获错误
```

**实施清单**：
- [ ] 扩展 `AirxComponentContext` 接口
- [ ] 实现新钩子的触发逻辑
- [ ] 定义钩子执行顺序
- [ ] 编写完整单测
- [ ] 文档与示例

**预期成果**：
- 更灵活的生命周期控制
- 与其他框架 API 更接近

**工作量**: 1.5 周  
**所有者**: TBD  
**优先级**: 🟡 P1

---

## Phase 3: 工具与内容（2-4 周，并行或 Week 6+）

### 3.1 文档扩展

**任务**: 补充 API 文档、最佳实践、故障排除

**内容清单**：
- [ ] **API 参考** (已有 JSDoc，需生成 HTML)
  - `docs/api/createApp.md`
  - `docs/api/createElement.md`
  - `docs/api/hooks.md`
  - `docs/api/signals.md`

- [ ] **最佳实践** (新增)
  - `docs/guides/signal-patterns.md`
  - `docs/guides/component-patterns.md`
  - `docs/guides/lifecycle-best-practices.md`
  - `docs/guides/ssr-guide.md`

- [ ] **故障排除** (新增)
  - `docs/troubleshooting/faq.md`
  - `docs/troubleshooting/common-errors.md`

**工作量**: 1.5 周  
**所有者**: TBD  
**优先级**: 🟡 P2

### 3.2 示例项目扩展

**任务**: 创建 5-10 个渐进式示例

**示例清单**：
1. **Counter** (现有)
2. **Todo List** - 单列表操作
3. **Form Validation** - 表单与验证
4. **Async Data** - 数据加载
5. **Context API** - provide/inject 用法
6. **Lifecycle Hooks** - 生命周期完整示例
7. **Error Handling** - 错误边界
8. **SSR App** - 服务端渲染
9. **Router Integration** - 与 airx-router 集成
10. **Performance Monitoring** - 性能监控

**预期成果**：
- 新用户快速上手
- 常见场景有参考实现

**工作量**: 2 周  
**所有者**: TBD  
**优先级**: 🟡 P2

### 3.3 DevTools 原型

**任务**: 探索 ReactDevTools 兼容层或独立 DevTools 原型

**调研内容**：
- [ ] ReactDevTools Hook API 研究
- [ ] Airx 组件树与 React 树的映射
- [ ] 独立 Airx DevTools 原型（使用 browser extension API）

**预期成果**：
- DevTools 原型可行性评估
- 后续实现的技术方案

**工作量**: 1 周（调研）  
**所有者**: TBD  
**优先级**: 🟣 P3

---

## 时间表 (Q2 2026)

```
Week 1-2   ├─ Signal.batch() 集成 (P0)
           ├─ 性能基准框架 (P0)
           └─ API JSDoc (P1)

Week 3-4   ├─ 异步生命周期 (P1)
           ├─ 错误边界 (P1)
           └─ 文档扩展 (P2) [并行]

Week 5-6   ├─ 生命周期扩展 (P1)
           ├─ 示例项目 (P2) [并行]
           └─ 下游包兼容性测试

Week 7-8   ├─ DevTools 调研 (P3)
           ├─ 性能优化 (基于 benchmark)
           └─ 发布 0.8.0-beta

Week 9-10  ├─ 稳定性修复
           ├─ 性能微调
           └─ 发布 0.8.0 stable

...

Q3         ├─ DevTools 实现 (可选)
           ├─ 高级特性探索
           └─ 1.0.0 准备
```

---

## 资源分配

| 角色 | 职责 | 周期 | 优先级 |
|------|------|------|--------|
| **核心开发** | Signal.batch, 异步钩子, 错误边界 | 8 周 | P0-P1 |
| **性能工程师** | 性能基准, 优化 | 4 周 | P0 |
| **文档编者** | API JSDoc, 最佳实践, 示例 | 5 周 | P1-P2 |
| **QA/测试** | 兼容性, 性能回归, 集成测试 | 持续 | P1 |

---

## 风险与缓释

| 风险 | 影响 | 缓释措施 |
|------|------|---------|
| **Signal.batch() 影响广泛** | 高 | 充分的单测覆盖，分步发布 |
| **异步钩子改变 API** | 中 | 向后兼容设计，充分文档 |
| **性能基准建立难** | 低 | 参考其他框架方案 |
| **DevTools 实现复杂** | 低 | 列为 P3，可后延 |

---

## 成功指标

**0.8.0 发布时**：
- ✅ Signal.batch() 実装完成，性能提升 50%+
- ✅ 性能基准框架建立，1000 component 渲染 < 100ms
- ✅ API 文档 JSDoc 完整 (100%)
- ✅ 异步生命周期支持
- ✅ 错误边界实现
- ✅ 5+ 官方示例项目
- ✅ 下游包 (router, vite-plugin) 兼容性验证

**1.0.0 发布时**：
- ✅ API 冻结，向后兼容承诺
- ✅ 完整文档与示例库
- ✅ 所有主流浏览器支持验证
- ✅ TypeScript 5.0+、strict 模式全支持
- ✅ 测试覆盖 > 95%
- ✅ DevTools 支持 (可选)

---

## 下一步行动

1. **立即** (本周):
   - [ ] 分配 Signal.batch() 开发者
   - [ ] 创建性能基准代码框架
   - [ ] 启动 API JSDoc 补充

2. **下周** (Week 2):
   - [ ] 完成 batch() 初稿
   - [ ] 性能基准数据收集
   - [ ] 计划异步钩子设计评审

3. **两周后** (Week 3):
   - [ ] batch() 合并至 Dev
   - [ ] 异步生命周期设计完成
   - [ ] 示例项目规划启动

---

**计划发布日期**: 2026-06-30 (0.8.0)  
**最后更新**: 2026-03-22  
**维护者**: Airx Core Team
