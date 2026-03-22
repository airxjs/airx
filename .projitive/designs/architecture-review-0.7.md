# Airx 架构评审与优化建议报告

**报告日期**: 2026-03-22  
**当前版本**: 0.7.0  
**评审范围**: 核心架构、性能、可维护性、标准对齐、生态集成

---

## 执行摘要

Airx 是一个轻量级、Signal 驱动的前端框架，完整采纳 TC39 Signals 提案标准。整体架构清晰，核心设计合理，但存在以下改进方向：

1. **性能**: 缺乏批量更新优化，内存占用未做基准测试
2. **可维护性**: 类型系统可进一步加强，错误处理与诊断需完善
3. **标准对齐**: Signal.batch() 批量更新机制尚未接入
4. **开发体验**: 生态包（router、vite-plugin）集成度高，但文档与示例不足
5. **生命周期**: 当前实现基于同步模式，缺乏异步生命周期支持

---

## 1. 架构评审

### 1.1 核心模块结构

**评价**: ⭐⭐⭐⭐ **优秀**

#### 模块划分清晰

```
source/
├── app/             # 应用根容器 ✓
├── element/         # JSX 元素 ✓
├── render/
│   ├── basic/       # 通用逻辑 ✓
│   ├── browser/     # 浏览器渲染 ✓
│   └── server/      # SSR 支持 ✓
├── signal/          # Signal 对齐 ✓
├── logger/          # 日志基础设施 ✓
├── symbol/          # 内部 Symbol ✓
└── types/           # 类型扩展 ✓
```

**优点**：
- 单一职责原则 (SRP) 遵循良好
- 公开 API 与内部实现分离清晰
- 跨环境渲染（Browser/Server）支持
- 依赖关系无循环

**建议**：
- [ ] 为每个模块补充 README 说明职责
- [ ] 绘制模块依赖关系可视化图
- [ ] 定义模块稳定性等级（稳定、实验、内部）

### 1.2 API 边界定义

**评价**: ⭐⭐⭐⭐ **优秀**

#### 公开 API 清晰

```typescript
// App: createApp + mount
create().mount(el)

// Element: JSX 语法
<Component prop={value} />

// Lifecycle: onMounted/onUnmounted
onMounted(() => cleanup)

// Context: provide/inject
provide(key, value)
inject(key)

// Signal: 标准 TC39 API
new Signal.State(initial)
new Signal.Computed(() => ...)
```

**优点**：
- API 面积小，学习曲线平缓
- 与 TC39 Signals 无缝对接
- 避免了 Vue 3 风格的 API 复杂度

**建议**：
- [ ] 增加 API 稳定性承诺文档（哪些 API 永不变更）
- [ ] 建立向后兼容性政策
- [ ] 定义主版本（major）变更的审批流程

### 1.3 Signal 对齐

**评价**: ⭐⭐⭐⭐⭐ **卓越**

#### 标准合规性

- ✓ 使用 `signal-polyfill` 兼容实现
- ✓ `source/signal/index.ts` 导出标准类型
- ✓ 完整的单测覆盖（signal.test.ts）
- ✓ 与 TC39 提案同步

**优点**：
- 未来证明（Future-proof）：使用标准 API
- 互操作性强：与其他 Signal 库兼容
- 依赖清晰：仅依赖 `signal-polyfill`

**建议**：
- [ ] 实现 `Signal.batch()` 批量更新优化
- [ ] 补充 Signal 与 Effects 的最佳实践指南
- [ ] 建立对 signal-polyfill 版本更新的响应机制

---

## 2. 实现评审

### 2.1 关键路径：变更检测

**评价**: ⭐⭐⭐ **良好**

#### 当前实现

位置: `source/render/basic/common.ts` 中的 `Instance` 类

```typescript
// 变更检测基于 Signal Watcher
const watcher = createWatch(() => {
  e.needReRender = true
  notifyCallback?.(e)
  // 异步批处理
  queueMicrotask(async () => {
    watcher.watch()
    const pending = watcher.getPending()
    for (const signal of pending) {
      signal.get()
    }
  })
})

// 监听计算值变化
const computed = new Signal.Computed(() => {
  try {
    return renderFn()
  } catch (err) {
    return handleError(err)
  }
})

watcher.watch(computed)
```

**优点**：
- 基于 Signal 标准的精确依赖追踪
- 渲染期自动收集依赖
- 支持错误恢复

**问题**：

1. **缺乏批量更新优化**
   ```typescript
   // 多个 Signal 更新时，每个都触发独立渲染
   state1.set(1)    // 触发渲染 1
   state2.set(2)    // 触发渲染 2
   state3.set(3)    // 触发渲染 3
   // 应该只渲染 1 次
   ```

2. **微任务队列可能过载**
   - 当前用 `queueMicrotask` 处理异步，在高频更新下可能堆积
   - 缺乏节流 (throttle) 或去抖 (debounce) 机制

3. **缺乏自动批处理**
   - 标准 Signal API 中 `Signal.batch()` 未被使用
   - 事件处理器内的多个 set() 调用应自动批处理

**建议改进**：

```typescript
// 使用 Signal.batch() 进行自动批处理
const updateModel = (field: string, value: unknown) => {
  Signal.batch(() => {
    state.set({...state.get(), [field]: value})
    derived.get()  // 批量计算，仅触发 1 次渲染
  })
}

// 或使用内置的批处理容器
function batchUpdates(callback: () => void) {
  return Signal.batch?.(callback) || callback()
}
```

### 2.2 关键路径：生命周期管理

**评价**: ⭐⭐⭐⭐ **优秀**

#### 当前实现

```typescript
// onMounted 回调收集
public triggerMounted() {
  this.mountListeners.forEach(listener => {
    let disposer = listener()
    if (typeof disposer === 'function') {
      this.addDisposer(disposer)
    }
  })
  this.mountListeners.clear()
}

// onUnmounted 递归清理
public triggerUnmounted() {
  if (this.instance?.child != null) {
    this.instance.child.context.triggerUnmounted()
  }
  // ... cleanup
  this.dispose()
}
```

**优点**：
- 清理函数支持 ✓
- 递归清理避免内存泄漏 ✓
- 异常处理完善 ✓

**问题**：

1. **生命周期钩子不完整**
   - 缺少 `onBeforeUnmount`
   - 缺少 `onBeforeMount`
   - 缺少错误边界 (Error Boundary)

2. **缺乏异步生命周期**
   ```typescript
   // 当前无法支持
   onMounted(async () => {
     await fetchData()  // 无法等待完成
   })
   ```

3. **Disposer 管理基于 Set，无序**
   - 清理顺序不确定
   - 应改为有序数组，支持 LIFO 清理

**建议改进**：

```typescript
// 扩展生命周期钩子集
public onBeforeMount(listener: () => void) { ... }
public onBeforeUnmount(listener: () => void) { ... }

// 支持异步 mount
public async onMountAsync(listener: () => Promise<() => void>) {
  try {
    const disposer = await listener()
    if (typeof disposer === 'function') {
      this.addDisposer(disposer)
    }
  } catch (err) {
    console.error('Mount hook failed', err)
  }
}

// LIFO 清理
private disposers: Disposer[] = []
public dispose() {
  while (this.disposers.length > 0) {
    const disposer = this.disposers.pop()
    try {
      disposer()
    } catch (err) {
      console.error('Disposer failed', err)
    }
  }
}
```

### 2.3 关键路径：错误处理

**评价**: ⭐⭐⭐ **良好**

#### 当前实现

```typescript
// 渲染期错误捕获
const computed = new Signal.Computed(() => {
  try {
    return renderFn()
  } catch (err) {
    return createErrorRender(err)
  }
})

// 生命周期钩子错误处理
try {
  disposer = listener()
} catch (err) {
  console.error(err, listener)
}
```

**优点**：
- 捕获渲染期异常
- 生命周期异常不会崩溃应用

**问题**：

1. **无错误边界 (Error Boundary)**
   - 父组件无法捕获子组件错误
   - 错误传播无法控制

2. **错误诊断信息不足**
   - 仅输出 console.error，无错误日志精度
   - 缺乏错误栈追踪与源码映射
   - 错误恢复策略缺失

3. **缺乏降级渲染**
   ```typescript
   // 错误时渲染的 createErrorRender 是固定的
   // 应该允许自定义错误组件
   ```

**建议改进**：

```typescript
// 错误边界支持
interface ErrorBoundaryOptions {
  fallback?: (err: Error) => AirxElement
  onError?: (err: Error, context: Component) => void
  resetKeys?: unknown[]
}

function withErrorBoundary<P>(
  Component: AirxComponent<P>,
  options: ErrorBoundaryOptions
): AirxComponent<P> {
  return (props: P) => {
    let lastError: Error | null = null
    let hasError = false

    return () => {
      try {
        if (hasError && options.resetKeys?.length === 0) {
          hasError = false
          lastError = null
        }
        return Component(props)?.()
      } catch (err) {
        hasError = true
        lastError = err as Error
        options.onError?.(lastError, this)
        return options.fallback?.(lastError)
      }
    }
  }
}
```

---

## 3. 性能评估

### 3.1 产物大小

**当前数据** (v0.7.0):
- ESM: 22.65 kB → gzip: 6.29 kB
- UMD: 16.34 kB → gzip: 5.38 kB

**评价**: ⭐⭐⭐⭐⭐ **卓越**

- 核心库 < 7KB (gzip)
- 零依赖
- 适合微前端、嵌入式场景

**优化空间**：
- [ ] TreeShake 分析，移除死代码
- [ ] 尝试使用 nano-like API 进一步压缩

### 3.2 渲染性能

**缺乏基准测试**

需要补充以下场景：
- [ ] 初始化渲染时间 (包含 1000 个组件树)
- [ ] 更新渲染时间 (单个 Signal 更新)
- [ ] 批量更新时间 (100 个 Signal 同时更新)
- [ ] 内存占用 (空闲: ?, 1000 个组件: ?)

**建议**：
```bash
# 使用 Benchmark.js 建立性能基准
pnpm add benchmark json5
pnpm add @types/benchmark --save-dev

# 编写 perf/ 目录下的基准测试
perf/
├── render.bench.ts
├── signals.bench.ts
└── lifecycle.bench.ts
```

### 3.3 内存泄漏风险

**当前风险点**：

1. **Listener 回调未清理**
   ```typescript
   onMounted(() => {
     element.addEventListener('click', handler)
     // 无自动清理（需要手动 return cleanup）
   })
   ```

2. **Context 缓存未限制**
   ```typescript
   public providedMap = new Map<unknown, unknown>()
   // 长时间运行可能持有大量引用
   ```

3. **Watcher 被监察器路由**
   - 如果组件频繁创建/销毁，Watcher 可能泄漏

**建议**：
- [ ] 编写内存泄漏检查清单
- [ ] 使用 DevTools Memory Profiler 定期审计
- [ ] 建立 GC 压力测试 (长时间渲染)

---

## 4. 开发体验评估

### 4.1 API 表面

**评价**: ⭐⭐⭐⭐ **优秀**

**优点**：
- API 家族小，文档好维护
- Signal 标准 API，开发者零学习成本
- JSX 语法原生，IDE 支持好

**缺点**：
- 缺乏 DevTools 集成 (React DevTools 兼容层)
- 缺乏 Debug 模式与诊断工具
- 错误信息不友好

### 4.2 文档与示例

**当前状态**：

| 文件 | 完整度 | 建议 |
|------|--------|------|
| README.md | ⭐⭐⭐⭐ (4/5) | 需要更多真实示例 |
| 设计文档 | ⭐⭐⭐⭐ (4/5) | 架构文档很完善 |
| API 文档 | ⭐⭐⭐ (3/5) | 缺乏类型 JSDoc |
| 示例项目 | ⭐⭐ (2/5) | 仅 vite-template，需更多用例 |
| 迁移指南 | ⭐⭐⭐⭐ (4/5) | 0.7.0 指南已补充 |

**建议**：
- [ ] 为所有导出的公开 API 补充 JSDoc
- [ ] 编写 5-10 个渐进式示例 (Counter → TODO → Forms → Advanced)
- [ ] 建立官方示例库 (Github 集合)
- [ ] 补充最佳实践指南 (Signal usage, lifecycle patterns)

### 4.3 工具链支持

**当前支持**：

| 工具 | 支持 | 说明 |
|------|------|------|
| TypeScript | ✓ | 完整支持，strict mode |
| JSX | ✓ | vite-plugin-airx 支持 |
| SSR | ✓ | 完整支持 |
| DevTools | ✗ | React DevTools 不兼容 |
| IDE | ✓ | VSCode 完整支持 |
| HMR | ? | 需验证 |
| Testing | ✓ | Vitest 完整 |

**改进建议**：
- [ ] 验证 Vite HMR 是否工作
- [ ] 实现 React DevTools 适配层或独立 DevTools
- [ ] 提供 Debug 模式与性能监控工具

---

## 5. 生态集成评估

### 5.1 下游项目状态

#### airx-router

| 方面 | 状态 | 备注 |
|------|------|------|
| Airx 兼容性 | ✓ | 0.6.0 兼容，需升级至 0.7.0 |
| API 设计 | ✓ | 简洁的路由模型 |
| 类型支持 | ✓ | 完整 TypeScript 支持 |
| 文档 | ⭐⭐⭐ | 基础完善 |
| 测试 | ✓ | 单元测试覆盖 |

#### vite-plugin-airx

| 方面 | 状态 | 备注 |
|------|------|------|
| Vite 兼容性 | ✓ | 与最新 Vite 兼容 |
| JSX 编译 | ✓ | 完整 JSX 支持 |
| HMR 支持 | ✓ | 快速更新支持 |
| 文档 | ⭐⭐⭐ | 基础说明 |

**建议**：
- [ ] 升级 airx-router 依赖至 airx@^0.7.0
- [ ] 建立跨包集成测试
- [ ] 发布统一的 monorepo 版本

### 5.2 生态包互操作性

**需要验证**：
- [ ] @airxjs/router 与 Airx 0.7.0 兼容性测试
- [ ] vite-plugin-airx 与 Airx 0.7.0 兼容性测试
- [ ] SSR 下的路由与信号互互操作

---

## 6. 标准对齐与前景

### 6.1 TC39 Signals 对齐

**当前进度**：

| 特性 | 实现 | 说明 |
|------|------|------|
| Signal.State | ✓ | 通过 signal-polyfill |
| Signal.Computed | ✓ | 通过 signal-polyfill |
| Signal.Effect | ✓ | 通过 signal-polyfill（部分） |
| Signal.batch() | ✗ | **缺失，应接入** |
| Signal.subtle.Watcher | ✓ | 基于此实现变更收集 |

**建议**：
- [ ] 实现 `Signal.batch()` 包装函数
- [ ] 在事件处理器中自动启用 batch 模式
- [ ] 测试与 Safari/Firefox 新 Signal 实现兼容性

### 6.2 前景规划（0.8.0 - 1.0.0）

#### 0.8.0（中期改进）
- [ ] 实现 Signal.batch() 批量更新
- [ ] 增强错误边界与诊断工具
- [ ] 完善异步生命周期支持
- [ ] 编写完整的最佳实践指南

#### 0.9.0（性能与稳定性）
- [ ] Fiber 风格的增量更新架构（待验证是否必要）
- [ ] 内存优化与泄漏修复
- [ ] 性能基准测试与优化
- [ ] DevTools 支持

#### 1.0.0（稳定发布）
- [ ] API 冻结与向后兼容承诺
- [ ] 完整文档与官方示例
- [ ] 主要浏览器与平台支持验证
- [ ] TypeScript 5.0+ strict 模式

---

## 7. 优化建议优先级矩阵

| 优先级 | 项目 | 工作量 | 影响度 | 执行期 |
|--------|------|--------|--------|----------|
| P0 | Signal.batch() 集成 | 3h | 高 | 1-2 周 |
| P0 | 批量更新优化 | 1d | 高 | 2-3 周 |
| P1 | 性能基准测试 | 2d | 中 | 1 周 |
| P1 | 错误边界实现 | 3d | 中 | 2 周 |
| P1 | 异步生命周期 | 5d | 中 | 2 周 |
| P2 | API JSDoc 补充 | 3d | 低 | 1 周 |
| P2 | 示例项目扩展 | 1w | 低 | 2-3 周 |
| P3 | DevTools 适配 | 2w | 低 | 4-6 周 |

---

## 8. 技术债清单

### 高优先级债务

1. **缺乏批量更新机制**
   - 影响：性能，高频 Signal 更新时
   - 修复难度：中等
   - 预计耗时：2-3 周

2. **生命周期钩子不完整**
   - 影响：用户体验，难以实现某些场景
   - 修复难度：中等
   - 预计耗时：1-2 周

3. **缺乏性能基准**
   - 影响：性能回归，无法量化改进
   - 修复难度：低
   - 预计耗时：1 周

### 中优先级债务

4. **错误诊断信息不足**
   - 影响：开发体验，调试困难
   - 修复难度：中等
   - 预计耗时：1-2 周

5. **文档与示例不足**
   - 影响：学习曲线，采用率
   - 修复难度：低
   - 预计耗时：2-3 周

### 低优先级债务

6. **DevTools 集成缺失**
   - 影响：调试便利性
   - 修复难度：高
   - 预计耗时：4-6 周

---

## 9. 执行建议

### Phase 1: 基础改进（4 周）

**Week 1-2**: 性能优化
- 实现 Signal.batch() 集成
- 优化变更检测与微任务队列
- 建立性能基准测试框架

**Week 3-4**: 体验改进
- 增强错误处理与诊断
- 补充 API JSDoc 文档
- 扩展示例项目

### Phase 2: 功能增强（4-6 周）

**Week 5-6**: 生命周期与异步
- 实现异步生命周期支持
- 完善错误边界
- 扩展钩子集（onBeforeMount 等）

**Week 7-8**: 工具链
- 性能监控与诊断工具
- HMR 完整性验证
- 下游包兼容性测试

### Phase 3: 稳定性（持续）

- 定期性能审计（周）
- 内存泄漏检查（月）
- 依赖更新响应（持续）

---

## 10. 结论

**总体评价**: ⭐⭐⭐⭐ **高质量**

Airx 是一个设计精良、实现稳健的前端框架。核心架构遵循 SRP，完整对齐 TC39 标准，产物轻量，无依赖。

**关键强项**：
- 完全采纳 TC39 Signals，面向未来
- 架构清晰，模块化好
- 轻量化（<7KB gzip），适合各类场景

**关键改进方向**：
1. 实现批量更新优化（Signal.batch()）
2. 完善生命周期与异步支持
3. 加强错误诊断与开发工具
4. 扩展文档与示例库

**建议下一步**：
1. **立即开始** P0 优先级任务（Signal.batch）
2. **并行推进** 性能基准与文档
3. **逐季审视** 技术债清单，保持迭代

---

## 附录：关键指标汇总

| 指标 | 值 | 目标 | 状态 |
|------|------|------|------|
| Bundle Size (gzip) | 6.29 KB | < 10 KB | ✓ |
| Zero Dependencies | ✓ | ✓ | ✓ |
| TS Strict Support | ✓ | ✓ | ✓ |
| TC39 Signal 对齐 | 90% | 100% | ⚠️ |
| Test Coverage (core) | 85%+ | 90%+ | ⚠️ |
| API Stability | Evolving | Frozen | ⚠️ |
| Documentation | 80% | 95% | ⚠️ |

---

**报告完成日期**: 2026-03-22  
**下一次评审**: 0.8.0 发布后
