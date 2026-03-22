# Airx 发布与质量门禁清单

## 1. 目标

本文档定义 `airx` 包在发布前必须通过的最小治理门禁，确保每次发布的质量可追溯、下游兼容风险可控。

## 2. 当前包状态

- 包名: `airx`
- 当前版本: `0.4.0`
- 构建方式: Rollup
- 质量门禁状态: 建设中
- 开发分支: `dev`
- 发布基线分支: `main`

## 3. 门禁清单

### 3.1 构建门禁 (Build Gate)

| 检查项 | 命令 | 验收标准 |
| --- | --- | --- |
| 构建成功 | `npm run build` | 退出码为 0，生成 `output/esm/` 和 `output/umd/` |
| 类型声明 | `output/esm/index.d.ts` 存在 | 文件非空，包含主要类型导出 |
| 包体积 | `output/` 目录大小 | 无异常增长（相比上一版本 `< 20%`） |

### 3.2 代码质量门禁 (Lint Gate)

| 检查项 | 命令 | 验收标准 |
| --- | --- | --- |
| ESLint | `npm run lint` | 退出码为 0，无 Error 级问题 |
| 关键路径覆盖 | 手动检查 | `source/index.ts` 公开 API 均有 lint 覆盖 |

### 3.3 类型检查门禁 (Type Gate)

| 检查项 | 命令 | 验收标准 |
| --- | --- | --- |
| TypeScript 编译 | `npx tsc --noEmit` | 退出码为 0，无类型错误 |
| API 表面稳定 | `output/esm/index.d.ts` 对比 | 公开 API 数量不减少 |

**注意**: 当前 `package.json` 的 `scripts` 中未包含 `typecheck`，建议补充:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

### 3.4 行为验证门禁 (Test Gate)

| 检查项 | 命令/方式 | 验收标准 |
| --- | --- | --- |
| 单元测试 | `npm test` | 所有测试通过 |
| 核心正确性矩阵 | `npm run test:core` | P0 用例全部通过 |
| Signal 语义验证 | `npm run test:signal` | MVP 用例全部通过 |
| 渲染行为验证 | 手动或示例应用 | 基础 JSX 渲染、provide/inject 正常工作 |

**注意**: 当前 `airx` 包**没有测试套件**，这是质量风险点。后续测试应以 `functional-correctness-matrix.md` 和 `signals-alignment-test-plan.md` 为准。

### 3.5 下游兼容门禁 (Downstream Compatibility Gate)

| 检查项 | 验证方式 | 验收标准 |
| --- | --- | --- |
| airx-router 兼容 | 在 router 项目运行 `npm run build` | 构建成功，router 能找到 airx 公开 API |
| vite-plugin-airx 兼容 | 检查 JSX 工厂命名 | `createElement` 和 `Fragment` 导出稳定 |
| peerDependencies 验证 | `npm ls airx` (在 router 中) | 无版本冲突警告 |

**验证步骤**:

```bash
# 1. 在 airx 目录构建
cd airx && npm run build

# 2. 在 router 目录验证兼容
cd ../router && npm install && npm run build

# 3. 在 vite-plugin 目录验证兼容
cd ../vite-plugin && npm install && npm run build
```

### 3.6 发布门禁 (Publish Gate)

| 检查项 | 验收标准 |
| --- | --- |
| 版本号规范 | 符合 semver: `major.minor.patch` |
| Changelog 更新 | `CHANGELOG.md` 或 GitHub Releases 有本次变更记录 |
| npm 发布dry-run | `npm publish --dry-run` 检查文件列表正确 |
| Git tag | 对应版本有 git tag `v{x.y.z}` |

## 4. GitHub Actions 工作流增强建议

### 4.1 当前 check.yml 问题

```yaml
# 当前问题：
# - 缺少 TypeScript 类型检查
# - 缺少 test 门禁
# - 缺少下游兼容性验证
# - workflow action 版本偏旧（v3）
```

### 4.2 建议的 check.yml

```yaml
name: Code Check

on:
  push:
    branches: ["dev", "main"]
  pull_request:
    branches: ["*"]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build

  downstream-check:
    needs: [typecheck, test, build]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check router compatibility
        run: |
          cd ../router && npm install && npm run build
      - name: Check vite-plugin compatibility
        run: |
          cd ../vite-plugin && npm install && npm run build
```

## 5. 发布流程

### 5.0 分支策略

- 所有日常开发在 `dev` 分支进行。
- 发布候选必须先在 `dev` 完成 lint/typecheck/test/build 全绿。
- 对外发布以前，变更通过合并进入 `main`，再由 release 流程触发 publish。

### 5.1 标准发布步骤

1. **本地验证**
   ```bash
   npm run lint      # 1. Lint 通过
  npm run typecheck # 2. 类型检查通过
  npm test         # 3. 测试通过
  npm run build    # 4. 构建成功
  npm publish --dry-run  # 5. 预览发布内容
   ```

2. **版本更新**
   ```bash
   # 遵循 semver
  npm version patch  # 0.4.0 -> 0.4.1
  npm version minor  # 0.4.0 -> 0.5.0
  npm version major  # 0.4.0 -> 1.0.0
   ```

3. **Git 提交**
   ```bash
   git add .
  git commit -m "chore: release v0.4.1"
  git tag v0.4.1
   git push && git push --tags
   ```

4. **GitHub Release**
   - 创建 GitHub Release
   - 填写 changelog
   - 触发 publish.yml 工作流

### 5.2 热修复流程

对于紧急 bug 修复:

1. 从 `main` 创建修复分支 `fix/xxx`
2. 完成修复后走标准发布步骤
3. 合并回 `main`

## 6. 质量指标

### 6.1 门禁通过率目标

| 指标 | 目标 |
| --- | --- |
| CI 通过率 | 100% |
|Lint 问题数 | 0 Error |
| TypeScript 错误 | 0 |

### 6.2 变更风险评估

发布前需确认:

- [ ] API 是否有破坏性变更
- [ ] 是否有需要 deprecation 处理的废弃 API
- [ ] 下游包 (router, vite-plugin) 是否需要同步更新

## 7. 当前待办

- [ ] 在 `package.json` 中补充 `typecheck` 脚本
- [ ] 在 `package.json` 中补充 `test` 与 `test:core` 脚本
- [ ] 建立基础测试套件
- [ ] 增强 `check.yml` 工作流
- [ ] 补充 downstream-check job

## 8. 相关文档

- [API 兼容矩阵](./api-compatibility-matrix.md)
- [基建升级基线](./infrastructure-upgrade-baseline.md)
- [功能正确性验证矩阵](./functional-correctness-matrix.md)
- [Signals 对齐与单测计划](./signals-alignment-test-plan.md)
- [Router 兼容矩阵 (router 项目)](../router/.projitive/designs/router-airx-compatibility-matrix.md)
