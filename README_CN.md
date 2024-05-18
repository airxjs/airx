# airx

[![npm](https://img.shields.io/npm/v/airx.svg)](https://www.npmjs.com/package/airx) [![build status](https://github.com/airxjs/airx/actions/workflows/check.yml/badge.svg?branch=main)](https://github.com/airxjs/airx/actions/workflows/check.yml)

☁️ Airx 是一个轻量级的 JSX 网页应用框架。

Airx 是基于 `JSX` 和 `Signal` 的前端开发框架，旨在为构建网页应用提供简单直接的解决方案。

## 特点

- 与 [Signal](https://github.com/tc39/proposal-signals) 及其生态系统无缝配合！
- 完全使用 TypeScript 开发，对类型友好
- 使用 JSX 函数式语法定义组件
- 没有像 React 一样的 hooks 😊
- 极少的 API，且易于学习

## 入门指南

### 准备工作

由于 `Signal` 目前为提案阶段，尚未正式进入标准，因此你需要通过 [`Polyfill`](https://github.com/proposal-signals/signal-polyfill) 来使用，关于 `Polyfill` 的安装请查阅相关文档。

**注意！你需要将 Signal 添加到全局空间，并且确保所有应用代码使用相同的 Signal 实例**

### 安装使用

要开始使用 Airx，请按照以下步骤进行操作：

1. 使用 npm 或 yarn 安装 Airx：

```shell
npm install airx
```

2. 在项目中导入必要的函数和组件：

```javascript
import * as airx from 'airx'

// 所有基于 Signal 的值都可以自动触发更新
const state = new Signal.State(1)
const computed = new Signal.Computed(() => state.get() + 100)

function App() {
  const innerState = new Signal.State(1)

  const handleClick = () => {
    state.set(state.get() + 1)
    innerState.set(innerState.get() + 1)
  }

  // 返回一个渲染函数
  return () => (
    <button onClick={handleClick}>
      {state.get()}
      {computed.get()}
      {innerState.get()}
    </button>
  )
}

const app = airx.createApp(<App />);
app.mount(document.getElementById('app'));
```

## API

我们只有很少的几个 API，因为我们追求最小内核的设计。将来，我们还将开放插件系统。

### createApp

创建一个应用实例。

### provide

```ts
function provide: <T = unknown>(key: unknown, value: T): ProvideUpdater<T>
```

通过 `context` 向下注入值，必须直接或间接在组件内部同步调用。

### inject

```ts
function inject<T = unknown>(key: unknown): T | undefined
```

通过 `context` 向上查找指定值，必须直接或间接在组件内部同步调用。

### onMounted

```ts
type MountedListener = () => (() => void) | void
function onMounted(listener: MountedListener): void
```

注册 DOM 挂载回调，必须直接或间接在组件内部同步调用。

### onUnmounted

```ts
type UnmountedListener = () => void
function onUnmounted(listener: UnmountedListener): void
```

注册 DOM 卸载回调，必须直接或间接在组件内部同步调用。

## 许可证

该项目使用 MIT 许可证。详细信息请参阅 [LICENSE](LICENSE) 文件。

## 贡献

欢迎贡献！如果您有任何想法、建议或错误报告，请打开一个 issue 或提交一个 pull request。

## 鸣谢

我们要感谢 Airx 项目的所有贡献者和支持者。

---

欲了解更多信息，请查阅[官方文档](https://github.com/airxjs/airx)
