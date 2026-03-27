# Code Style

## Core Principles

- **最小化运行时**：核心库零依赖，避免运行时开销
- **全面类型化**：TypeScript 严格模式，无 any 类型
- **一致的响应式**：统一使用 signal-polyfill 作为响应式基础
- **直观的 API**：API 设计对新手友好，减少心智负担

## Naming Conventions

### 文件与目录
- 核心模块：`source/element/`, `source/signal/`, `source/render/`
- 入口文件：`index.ts`
- 类型文件：与实现同目录，或 `source/types/*.ts`

### 导出命名
- 组件：大写开头 `Router`, `Signal`
- 工具函数：camelCase `createElement`, `inject`
- 类型：PascalCase 或描述性名称 `AirxElement`, `AirxChildren`

## Testing Standards

### 覆盖率要求
- 核心模块（element, signal, render）≥ 80% 覆盖率
- 新增公共 API 必须有测试

### 测试工具
- Vitest + @vitest/ui
- @testing-library/react 兼容模式（airx 的 JSX 等效）

### 验证命令
```bash
npm test        # 单元测试
npm run type    # 类型检查
npm run lint    # ESLint
npm run build   # 构建
```

## API Design Rules

### 稳定性承诺
- 公共 API 须有文档注释
- 破坏性变更须在 CHANGELOG 标注

### 扩展点设计
- 优先使用注入（provide/inject）而非硬编码依赖
- 允许自定义渲染器（render slot）

## Change Triggers

- 新增或改变公共 API
- 引入新的核心概念（如新的响应式原语）
- 升级依赖包导致 API 变化
