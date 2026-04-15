# Code Style

## Core Principles

- **类型安全**：所有 TypeScript 代码必须类型正确
- **框架规范**：遵循 JSX 框架设计模式
- **Tree-shakable**：保持模块化，支持按需导入

## Naming and Structure

### 文件组织
```
/source/              — 源码
  index.ts            — 主入口
  jsx-runtime.ts      — JSX 运行时
  jsx-dev-runtime.ts  — JSX 开发运行时
  app/                — 应用模块
  element/            — 元素模块
  render/             — 渲染模块
  signal/             — 响应式模块
  symbol/             — 符号定义
  types/              — 类型定义
  logger/             — 日志模块
```

### 命名规则
- **文件**：`kebab-case.ts` / `PascalCase.tsx`
- **组件/类**：`PascalCase`
- **函数/变量**：`camelCase`
- **常量**：`SCREAMING_SNAKE_CASE`

### 导出规范
- 所有公开 API 通过 index.ts 导出
- 子模块通过独立入口导出（如 jsx-runtime）

## Testing and Validation

### 验证命令
```bash
pnpm run build     # TypeScript 编译
pnpm run lint      # ESLint 检查
pnpm run test      # Vitest 测试
```

### 测试要求
- 核心模块必须有单元测试
- JSX 运行时需要集成测试

## Review Checklist

- [ ] TypeScript 类型完整
- [ ] ESLint 检查通过
- [ ] 所有测试通过
- [ ] 构建成功，输出正确
- [ ] 公开 API 有 JSDoc 注释
- [ ] 无循环依赖

## Change Triggers

当以下情况发生时，需更新本文档：
- 引入新的代码规范
- 调整模块结构
- 更新公开 API
