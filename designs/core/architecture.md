---
applyTo: "**"
---

# Airx 架构文档

> 定义系统模块边界、职责和交互关系

---

## 1. 系统概述

**项目**: Airx -轻量级 Signal驱动 JSX 前端框架
**类型**: 前端框架 (TypeScript)
**核心功能**: 基于 TC39 Signal 提案的响应式 JSX 组件框架

---

## 2. 模块架构

### 2.1 核心模块

| 模块 | 路径 | 职责 |
|------|------|------|
| **app** | `source/app/` | 应用生命周期管理 (createApp, mount) |
| **element** | `source/element/` | DOM 元素创建与操作 |
| **render** | `source/render/` | 渲染引擎与插件系统 |
| **signal** | `source/signal/` | Signal 响应式原语集成 |
| **symbol** | `source/symbol/` | 内置组件符号 (Fragment, Portal 等) |
| **types** | `source/types/` | TypeScript 类型定义 |
| **logger** | `source/logger/` | 日志系统 |

### 2.2 JSX 运行时

| 运行时 | 路径 | 用途 |
|--------|------|------|
| **jsx-runtime** | `source/jsx-runtime.ts` | 生产环境 JSX 转换 |
| **jsx-dev-runtime** | `source/jsx-dev-runtime.ts` | 开发环境 JSX 转换（含调试信息） |

### 2.3 入口

- `source/index.ts` - 主入口，导出所有公共 API
- `source/jsx-runtime.ts` - JSX 转换入口（供编译器使用）

---

## 3. 关键设计决策

### 3.1 Signal 集成
- 使用 `signal-polyfill` 作为 Signal 实现基础
- 兼容 TC39 Signal 提案标准 API
- 支持 Signal.State / Signal.Computed / Signal.Effect

### 3.2 插件系统
- `Plugin` 接口定义渲染生命周期钩子
- 支持 DOM 渲染和 SSR 双重路径

### 3.3 SSR 支持
- 通过 `renderToString()` 支持服务端渲染
- 提供完整的水合 (hydration) 机制

---

## 4. 依赖关系

```
index.ts
├── app/index.ts (createApp, AirxApp)
├── element/index.ts (createElement, component)
├── render/index.ts (Plugin, render)
├── signal/ (reexport from signal-polyfill)
└── jsx-runtime.ts / jsx-dev-runtime.ts
```

---

## 5. 构建产物

| 产物 | 格式 | 说明 |
|------|------|------|
| ESM | `.js` + `.d.ts` | 主构建产物 |
| CJS | 通过 ESM 兼容 |兼容旧环境 |
| Types | `.d.ts` | 类型声明 |

