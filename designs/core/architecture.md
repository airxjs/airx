# Airx 核心架构文档

## 1. 概述

Airx 是一个基于 JSX 和 Signals 的前端框架，核心定位：轻量、快速、响应式。

**当前版本**: 0.4.0
**代码入口**: `source/index.ts`
**构建工具**: Rollup
**信号库**: `signal-polyfill` (对应 TC39 Signals 提案实现)

## 2. 模块结构

```
source/
├── index.ts          # 主入口，导出所有公开 API
├── element.ts        # JSX 元素模型（AirxElement, createElement, component）
├── types.ts          # 类型定义
├── symbol.ts         # 内部 Symbol 定义
├── logger.ts         # 日志工具
├── render/           # 渲染层
│   ├── index.ts      # 导出 inject/provide/onMounted/onUnmounted + Plugin 系统
│   ├── browser.ts    # 浏览器渲染
│   ├── server.ts     # 服务端渲染
│   └── common/
│       ├── hooks.ts  # 生命周期钩子（provide/inject/onMounted/onUnmounted）
│       ├── plugins.ts # 插件系统（Plugin/PluginContext）
│       └── index.ts
└── signal/           # Signals 集成层
    └── index.ts      # 封装 signal-polyfill，对齐 TC39 提案语义
```

## 3. 核心模块职责

### 3.1 Signal 层 (`source/signal/`)

**职责**: 封装 `signal-polyfill`，提供响应式状态管理。

**导出**:
- `createWatch(notify)` → 创建 Watcher
- `createState<T>(initial, options?)` → 创建 State Signal
- `createComputed<T>(computation, options?)` → 创建 Computed Signal
- `isState<T>(target)` → 类型守卫

**实现要点**:
- 延迟加载 `Signal`（通过全局对象 `globalNS['Signal']` 获取）
- 确保全局只有一个 Signal 实例
- 异常情况：若 Signal 未定义或存在多实例则抛出错误

**关键文件**: `source/signal/index.ts#L1-L30`

### 3.2 Element 层 (`source/element.ts`)

**职责**: 定义 JSX 元素模型和组件抽象。

**核心类型**:
- `AirxElement<P>`: 虚拟 DOM 元素 `{ type, props, [symbol]: true }`
- `AirxComponent<P>`: 函数式组件 `(props: P) => AirxComponentRender`
- `AirxChildren`: 合法的子节点类型（null/string/number/boolean/AirxElement/Array）

**导出**:
- `createElement(type, props, ...children)` → 创建 AirxElement
- `isValidElement(element)` → 元素校验
- `Fragment` → 片段组件
- `component(comp)` → 组件包装器（identity 函数）
- `createErrorRender(error)` → 错误边界渲染

**关键文件**: `source/element.ts#L1-L100`

### 3.3 Render 层 (`source/render/`)

#### 浏览器渲染 (`browser.ts`)

- 通过 `browserRender(appContext, element, container)` 挂载到 DOM
- 每次 mount 先清空容器内容

#### 服务端渲染 (`server.ts`)

- 通过 `serverRender(appContext, element, resolve)` 生成 HTML 字符串

#### 生命周期钩子 (`common/hooks.ts`)

- `provide(key, value)` / `inject(key)` — 依赖注入
- `onMounted(listener)` / `onUnmounted(listener)` — 生命周期

#### 插件系统 (`common/plugins.ts`)

- `Plugin` — 插件接口
- `PluginContext` — 插件注册与执行上下文

### 3.4 应用入口 (`source/index.ts`)

`createApp(element)` 返回 `AirxApp`:
- `mount(container)` — 浏览器渲染
- `plugin(...plugins)` — 注册插件 **[deprecated WIP]**
- `renderToHTML()` — 服务端渲染 **[deprecated WIP]**

## 4. API 公开面（按 category）

| Category | APIs |
|----------|------|
| App | `createApp` |
| JSX/Component | `Fragment`, `component`, `createElement`, `AirxComponent`, `AirxElement`, `AirxChildren`, `AirxComponentContext` |
| Context/Lifecycle | `provide`, `inject`, `onMounted`, `onUnmounted` |
| Plugin/Types | `Plugin`, types 集合 |
| Signal | `createWatch`, `createState`, `createComputed`, `isState` |

## 5. 版本与构建

- **构建输出**: UMD + ESM + Types
- **主文件**: `output/umd/index.js`, `output/esm/index.js`, `output/esm/index.d.ts`
- **包名**: `airx`

## 6. 技术约束

1. **Signal 必须全局唯一**：不允许同一全局环境存在多个 Signal 实例
2. **Signal 延迟加载**：用于支持 polyfill 的按需加载场景
3. **插件系统 WIP**：`plugin()` 和 `renderToHTML()` 接口尚未稳定
4. **无内置测试框架**：当前 `package.json` 无 test 脚本，测试覆盖为 0
