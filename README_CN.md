# Airx ☁️

[![npm](h- 🔌 **可扩展**: 插件系统支持高级功能tps://img.shields.io/npm/v/airx.svg)](https://www.npmjs.com/package/airx)
[![build status](https://github.com/airxjs/airx/actions/workflows/check.yml/badge.svg?branch=main)](https://github.com/airxjs/airx/actions/workflows/check.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

> 一个轻量级、Signal 驱动的 JSX Web 应用程序框架

[中文文档](./README_CN.md) • [English Documentation](./README.md)

Airx 是一个基于 **JSX** 和 **Signal** 原语构建的现代前端框架，旨在为构建响应式 Web 应用程序提供简单、高性能且直观的解决方案。

## ✨ 特性

- 🔄 **Signal 驱动的响应式**: 无缝集成 [TC39 Signal 提案](https://github.com/tc39/proposal-signals)
- 📝 **TypeScript 优先**: 完全使用 TypeScript 开发，具有出色的类型安全性
- ⚡ **函数式组件**: 使用简洁的 JSX 函数式语法定义组件
- 🚫 **无复杂 Hooks**: 简单直观的 API，无需 React 风格的 hooks
- 🪶 **轻量级**: 最小的包体积，零依赖
- � **可扩展**: 插件系统支持高级功能
- 🌐 **通用性**: 同时支持浏览器和服务器环境

## 🚀 快速开始

### 安装

```bash
npm install airx
# 或者
yarn add airx
# 或者
pnpm add airx
```

### 基本用法

```tsx
import * as airx from 'airx'

// 使用 Signal 创建响应式状态
const count = new Signal.State(0)
const doubleCount = new Signal.Computed(() => count.get() * 2)

function Counter() {
  const localState = new Signal.State(0)

  const increment = () => {
    count.set(count.get() + 1)
    localState.set(localState.get() + 1)
  }

  // 返回一个渲染函数
  return () => (
    <div>
      <h1>Counter App</h1>
      <p>Global count: {count.get()}</p>
      <p>Double count: {doubleCount.get()}</p>
      <p>Local count: {localState.get()}</p>
      <button onClick={increment}>
        Click me!
      </button>
    </div>
  )
}

// 创建并挂载应用
const app = airx.createApp(<Counter />)
app.mount(document.getElementById('app'))
```

## 📖 核心概念

### 组件

Airx 中的组件是返回渲染函数的简单函数：

```tsx
function MyComponent() {
  const state = new Signal.State('Hello')
  
  return () => (
    <div>{state.get()} World!</div>
  )
}
```

### 状态管理

Airx 利用 Signal 原语进行响应式状态管理：

```tsx
// 状态
const count = new Signal.State(0)

// 计算值
const isEven = new Signal.Computed(() => count.get() % 2 === 0)

// 副作用
const effect = new Signal.Effect(() => {
  console.log('Count changed:', count.get())
})
```

### 上下文与依赖注入

```tsx
const ThemeContext = Symbol('theme')

function App() {
  // 向组件树下层提供值
  airx.provide(ThemeContext, 'dark')
  
  return () => <Child />
}

function Child() {
  // 从父组件注入值
  const theme = airx.inject(ThemeContext)
  
  return () => (
    <div className={`theme-${theme}`}>
      Current theme: {theme}
    </div>
  )
}
```

### 生命周期钩子

```tsx
function Component() {
  airx.onMounted(() => {
    console.log('Component mounted')
    
    // 返回清理函数
    return () => {
      console.log('Component unmounted')
    }
  })

  airx.onUnmounted(() => {
    console.log('Component will unmount')
  })
  
  return () => <div>My Component</div>
}
```

## 📚 API 参考

Airx 遵循最小化 API 设计理念。以下是核心 API：

### `createApp(element)`

创建应用程序实例。

```tsx
const app = airx.createApp(<App />)
app.mount(document.getElementById('root'))
```

### `provide<T>(key, value): ProvideUpdater<T>`

通过上下文向组件树下层提供值。必须在组件内同步调用。

```tsx
function Parent() {
  airx.provide('theme', 'dark')
  return () => <Child />
}
```

### `inject<T>(key): T | undefined`

从组件树中获取提供的值。必须在组件内同步调用。

```tsx
function Child() {
  const theme = airx.inject('theme')
  return () => <div>Theme: {theme}</div>
}
```

### `onMounted(listener): void`

注册组件挂载到 DOM 时的回调。

```tsx
type MountedListener = () => (() => void) | void

airx.onMounted(() => {
  console.log('Mounted!')
  return () => console.log('Cleanup')
})
```

### `onUnmounted(listener): void`

注册组件从 DOM 卸载时的回调。

```tsx
type UnmountedListener = () => void

airx.onUnmounted(() => {
  console.log('Unmounted!')
})
```

### `createElement(type, props, ...children)`

创建虚拟 DOM 元素（通常由 JSX 转译器处理）。

### `Fragment`

用于分组多个元素而不添加额外 DOM 节点的组件。

```tsx
function App() {
  return () => (
    <airx.Fragment>
      <div>First</div>
      <div>Second</div>
    </airx.Fragment>
  )
}
```

## 🔧 开发

### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/airxjs/airx.git
cd airx

# 安装依赖
npm install

# 构建项目
npm run build

# 运行测试
npm test

# 运行测试 UI
npm run test:ui

# 运行测试覆盖率
npm run test:coverage
```

### 项目结构

```text
source/
├── app/           # 应用程序创建和管理
├── element/       # 虚拟 DOM 和 JSX 处理
├── logger/        # 内部日志工具
├── render/        # 渲染引擎
│   ├── basic/     # 核心渲染逻辑
│   ├── browser/   # 浏览器特定渲染
│   └── server/    # 服务器端渲染
├── signal/        # Signal 集成
├── symbol/        # 内部符号
└── types/         # TypeScript 类型定义
```

## 🤝 贡献

我们欢迎贡献！请查看我们的[贡献指南](CONTRIBUTING.md)了解详情。

### 开发工作流

1. Fork 仓库
2. 创建你的功能分支 (`git checkout -b feature/amazing-feature`)
3. 进行更改
4. 为你的更改添加测试
5. 确保所有测试通过 (`npm test`)
6. 提交你的更改 (`git commit -m 'Add amazing feature'`)
7. 推送到分支 (`git push origin feature/amazing-feature`)
8. 打开一个 Pull Request

## 📄 许可证

此项目使用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- 感谢 Airx 项目的所有贡献者和支持者
- 受到 [TC39 Signal 提案](https://github.com/tc39/proposal-signals)的启发
- 由 Airx 社区用 ❤️ 构建

## 📞 支持

- 📖 [文档](https://github.com/airxjs/airx)
- 🐛 [问题跟踪](https://github.com/airxjs/airx/issues)
- 💬 [讨论](https://github.com/airxjs/airx/discussions)

---

Made with ☁️ by the Airx team
