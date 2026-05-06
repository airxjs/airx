# TASK-0086 Research Brief: Tree-shaking Audit

## Status
- **Task**: TASK-0086
- **Title**: Airx 0.9.0: Tree-shaking audit - verify dead code elimination
- **Status**: IN_PROGRESS
- **Roadmap**: ROADMAP-0004
- **Date**: 2026-05-06

---

## Research Findings

### Current Export Structure

The `output/index.js` uses named exports + wildcard re-exports:

```typescript
// output/index.js
export * from './types/index.js';         // Named exports → ✅ Tree-shakeable
export { createApp } from './app/index.js'; // Named → ✅ Tree-shakeable
export { Fragment, component, createElement } from './element/index.js'; // Named → ✅
export { ErrorBoundary, createErrorBoundary } from './element/index.js'; // Named → ✅
export { inject, provide, onMounted, onUnmounted } from './render/index.js'; // Named → ✅
```

The `render/index.js` (source: `source/render/index.ts`) re-exports:

```typescript
export { render as serverRender } from './server/index.js'        // Named
export { render as browserRender } from './browser/index.js'      // Named
export { type SSRApp, createSSRApp, renderToString, hydrate, type HydrateOptions } from './server/index.js' // Named
```

### Module Dependency Graph

```
render/index.js
├── server/index.js (12.5KB) → server.js
│   ├── browser/index.js → browser.js (6KB) + hydrate.js (7.5KB)
│   └── ssr/index.js (217B)
└── browser/index.js (6KB) → browser.js (6KB) + hydrate.js (7.5KB)

shared:
├── render/basic/common.js (20.8KB) — shared reconciliation
├── render/basic/commit-helpers.js (3.4KB)
├── render/basic/commit-walker.js (1.1KB)
├── render/basic/errors.js (1.8KB)
└── render/basic/hooks/hooks.js
```

### Key Finding: server.js Imports browser.js

Critically, `server/server.js` imports from `browser/index.js`:

```javascript
import { hydrate as clientHydrate } from '../browser/index.js';
```

This creates a dependency where `serverRender` → `browser/index.js` → `hydrate.js` (7.5KB).

**Impact**: Even SSR-only users cannot tree-shake the 7.5KB `hydrate.js`.

### Tree-shaking Analysis

| Consumer Use Case | Pulled Modules | Estimated Size |
|---|---|---|
| `import { browserRender } from 'airx'` | browser.js + common.js | ~27KB |
| `import { createApp } from 'airx'` | app.js + common.js | ~22KB |
| `import { serverRender } from 'airx'` | server.js + browser.js + hydrate.js + common.js | ~48KB |
| `import { renderToString } from 'airx'` | server.js + browser.js + hydrate.js + common.js | ~48KB |
| Full import (`import 'airx'`) | All modules | ~67KB ESM |

### `export *` Impact Assessment

**Finding**: `export *` is used in `element/index.js` and `app/index.js`. Modern bundlers (Rollup/esbuild/Vite) handle `export *` correctly for tree-shaking because they perform full module graph analysis.

The real issue is **not** `export *` but **module graph topology**: when browser consumers import `browserRender`, the bundler follows the dependency chain and pulls in the entire `render/index.js` transitive closure, including modules that could be conditionally loaded.

### Recommendations

1. **Add subpath exports** (highest impact):
   - `airx/browser` → `output/render/browser/index.js` (for browser-only apps)
   - `airx/server` → `output/render/server/index.js` (for SSR-only apps, still includes hydrate)
   - `airx` → `output/index.js` (full bundle, unchanged)

2. **Circular dependency issue** (needs resolution):
   - `server/index.js` imports `browser/index.js` for hydration
   - This prevents true SSR-only usage
   - Recommendation: Extract `hydrate` body into `server/hydrate-utils.js` that doesn't import browser DOM APIs

3. **Tree-shaking current verdict**: ✅ **Adequate** for named imports
   - `export *` does NOT prevent tree-shaking with modern bundlers
   - Named imports (`import { browserRender } from 'airx'`) work correctly
   - The main issue is module graph topology, not export style

---

## Validation

- ✅ `npm run typecheck` passes
- ✅ `npm test` — 378/378 tests pass

---

## Next Steps

- **TASK-0085**: Implement subpath exports (`./browser`, `./server`)
- **Future**: Resolve server→browser circular dependency to enable true SSR-only builds
