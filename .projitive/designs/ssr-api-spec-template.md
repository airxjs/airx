# SSR API 设计模板

## 1. 文档元信息
- 任务: TASK-0014
- 路线图: ROADMAP-0003
- 版本目标:
- 作者/评审:

## 2. 设计目标
- API 简单直观、可自解释。
- 类型约束明确、错误模型可预测。
- 与现有 createApp 与渲染模型保持一致体验。

## 3. 候选接口

### createSSRApp
```ts
// 示例签名（按实际方案调整）
export declare function createSSRApp(root: unknown, options?: SSRAppOptions): SSRApp
```
- 入参:
- 返回值:
- 错误语义:

### renderToString
```ts
export declare function renderToString(input: unknown, context?: SSRContext): Promise<string>
```
- 入参:
- 返回值:
- 错误语义:

### hydrate
```ts
export declare function hydrate(root: unknown, container: Element, context?: SSRContext): void
```
- 入参:
- 返回值:
- 错误语义:

## 4. 类型契约
```ts
interface SSRAppOptions {
  // TODO
}

interface SSRContext {
  // TODO
}

interface SSRSerializePayload {
  // TODO
}
```

## 5. 注水协议
- 序列化内容:
- 注入位置:
- 客户端读取时机:
- 失败回退策略:

## 6. 兼容性评估
- 与 createApp:
- 与 Router:
- 与 Signal:
- 与现有测试体系:

## 7. 使用示例
```ts
// server
const html = await renderToString(App)

// client
hydrate(App, document.getElementById('app')!)
```

## 8. 决策记录
- 最终接口:
- 未采纳接口:
- 迁移建议:

## 9. 验收标准
- [ ] API 命名清晰
- [ ] 类型可表达主要场景
- [ ] 错误语义可测试
- [ ] 示例最小可运行
