# Airx Architecture

> 项目架构文档，描述 Airx 当前版本的公开 API、运行时处理流程与演进边界。
>
> **当前版本基线: 0.7.2**（2026-03-24）

## 1. 项目定位

**airx** 是一个基于 JSX 的视图层框架，核心关注以下能力：
- 声明式元素与函数式组件
- 基于 Signal 的响应式渲染
- 依赖注入与组件生命周期
- Browser / Server 双环境渲染

**不提供**：路由、全局状态方案、打包链路与服务端框架集成层。

## 2. 当前技术基线

| 类别 | 技术 |
|------|------|
| 语言 | TypeScript strict mode |
| 构建 | Vite 7 + Rollup |
| 类型产物 | vite-plugin-dts |
| 测试 | Vitest + jsdom |
| Signal | signal-polyfill |
| 发布格式 | ESM + UMD/CJS + d.ts |

当前包版本基线为 **0.7.2**（2026-03-24）。

## 3. 模块划分

```
source/
├── app/           # createApp 与应用入口封装
├── element/       # JSX element、组件类型、错误渲染兜底
├── render/
│   ├── basic/     # Instance 树、协调逻辑、hooks、插件系统
│   ├── browser/   # 浏览器调度与 DOM 提交
│   └── server/    # SSR 字符串渲染
├── signal/        # 对 signal-polyfill 的运行时包装
├── logger/        # 调试日志
├── symbol/        # 内部标记 Symbol
├── types/         # JSX / DOM / CSS 类型扩展
└── index.ts       # 公开 API 出口
```

## 4. 公开 API 边界

### 4.1 对外导出

当前公开 API 以 [source/index.ts](../../source/index.ts) 为准，包含：
- App API：`createApp`、`AirxApp`、`Plugin`
- Element API：`createElement`、`component`、`Fragment`
- 类型：`AirxElement`、`AirxChildren`、`AirxComponent`、`AirxComponentContext`
- Render Hook API：`provide`、`inject`、`onMounted`、`onUnmounted`

`createRef`、`watch`、`Ref` 已在 0.7.0 代际移除，不再属于公开 API。

### 4.2 内部模块

以下模块是运行时内部实现，不承诺稳定：
- `source/render/basic/common.ts`：Instance 树与协调逻辑
- `source/render/basic/plugins/internal/*`：内置插件系统
- `source/symbol/*`：内部 Symbol
- `source/logger/*`：日志实现

## 5. 运行时架构

### 5.1 总体关系

```
createApp(element)
  -> PluginContext(BasicLogic, InjectSystem, user plugins)
  -> browserRender(...) | serverRender(...)
  -> performUnitOfWork(...)
  -> reconcileChildren(...)
  -> commitDom(...)
```

### 5.2 App 层

`createApp` 负责三件事：
1. 构造 `PluginContext`
2. 把函数组件入口标准化为 `AirxElement`
3. 分发到浏览器渲染或服务端渲染

这里不持有路由、store 或异步数据层语义，只负责把元素树交给 render 层。

### 5.3 Element 层

`createElement` 负责构造统一的 `AirxElement` 结构：
- `type` 可以是原生标签字符串或函数组件
- `props.children` 总是被标准化为数组
- `Fragment` 只是返回 children 的轻量组件

`createErrorRender` 提供组件渲染异常时的最小 UI 兜底。

### 5.4 Render Basic 层

`render/basic/common.ts` 是核心执行引擎，负责：
- `Instance` 树结构维护（parent / child / sibling）
- `reconcileChildren` 子节点协调
- `performUnitOfWork` 单步执行与遍历推进
- 组件上下文与生命周期管理

关键点：
- 无 key 时采用内部 key：`airx-element-inner-key:${index}`
- `memoProps` 维持 props 引用稳定
- `providedMap` / `injectedMap` 保存依赖注入状态

### 5.5 Signal 集成

函数组件有两种执行路径：
1. **静态组件**：组件直接返回 `AirxElement`
2. **响应式组件**：组件返回渲染函数，渲染函数在 `Signal.Watcher` + `Signal.Computed` 中执行

响应式组件的依赖收集策略：
- 初次执行组件函数，拿到 render function
- 创建 watcher 追踪 Signal 变更
- Signal 变更时把当前 instance 标记为 `needReRender`
- 重新进入 `performUnitOfWork`，完成子树协调

### 5.6 Browser 渲染

Browser 渲染由两部分组成：
1. `workLoop`：消费 `nextUnitOfWork`
2. `commitDom`：把 Instance 树变化提交到真实 DOM

当前策略：
- 初次渲染同步启动一轮 `workLoop`
- 若仍有剩余工作，则通过 `requestIdleCallback` 调度下一轮
- 若宿主环境不支持 `requestIdleCallback`，降级到 `setTimeout`
- 仅在存在剩余工作时继续调度，避免空转

### 5.7 Server 渲染

Server 渲染复用大部分协调逻辑，但使用自定义 `ServerElement`：
- 同步跑完整个 `performUnitOfWork`
- 提交到 `ServerElement` 树
- 最终通过 `toString()` 输出 HTML 字符串

这保证了 Browser / Server 共享一套组件与 children 协调模型，但 DOM 提交实现仍各自维护。

## 6. 插件边界

`PluginContext` 默认注册两类内置插件：
- `BasicLogic`：props 比较、DOM 属性更新、类型复用判断
- `InjectSystem`：检测注入值是否变化，必要时使组件重新构建

用户插件可以扩展：
- `isReRender(instance)`
- `updateDom(dom, nextProps, prevProps)`
- `isReuseInstance(instance, nextElement)`

插件是 Airx 当前最主要的扩展点。

## 7. 已知技术债

当前版本明确存在以下技术债：
- Browser / Server 的 `commitDom` 逻辑有较高重复度
- Signal watcher 的微任务收集策略仍需要更多集成测试验证
- SSR 与 Browser 的 DOM 属性更新策略尚未完全统一
- `plugin()` / `renderToHTML()` 仍带有 WIP / 过渡语义

## 8. 演进方向

0.7.x 到 0.10.x 的重点方向：
1. 提炼通用 DOM 提交流程，消除 Browser / Server 重复逻辑
2. 强化 Signal 更新路径和调度语义测试
3. 明确插件与生命周期的稳定边界
4. 完成对外文档与实现的一致化

## 9. 相关文档

- [发布门禁清单](../../.projitive/designs/release-quality-gates.md)
- [功能正确性矩阵](../../.projitive/designs/functional-correctness-matrix.md)
- [Signals 对齐计划](../../.projitive/designs/signals-alignment-test-plan.md)
- [0.7 迁移指南](../../.projitive/designs/migration-0.7.md)
- [0.8 优化路线图](../../.projitive/designs/optimization-roadmap-0.8.md)
