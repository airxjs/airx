# Project Architecture

## Mission and Scope

**Mission**: `airx` is a lightweight, Signal-driven JSX web application framework. It provides reactive state management via TC39 Signal primitives, functional component model, virtual DOM diffing, and both browser and server-side rendering.

**Scope**:
- JSX component development and rendering
- Signal-based reactive state management (State, Computed, Effect)
- Component lifecycle (onMounted, onUnmounted)
- Dependency injection via provide/inject
- Context propagation through component tree
- Browser DOM rendering
- Server-side rendering (SSR) to HTML strings
- Plugin system for extensibility
- Hydration (client-side activation of SSR HTML)
- TypeScript-first development

**Out of Scope**:
- Built-in routing (delegated to `airx-router`)
- Built-in styling (delegate to CSS/Tailwind)
- Server-side data fetching (delegate to user)
- Concurrent SSR (thread-local context limitation)
- Production SSR streaming (current serverRender is string-based)

---

## System Boundaries

### Inputs

| Input | Source | Description |
|-------|--------|-------------|
| JSX/TSX source | Developer | Component definitions with JSX syntax |
| Component tree | JSX transform | Virtual DOM element tree |
| Signal state | Developer | `Signal.State`, `Signal.Computed`, `Signal.Effect` |
| Plugin | Developer | Plugin objects implementing `Plugin.install()` |
| Pre-rendered HTML | SSR step | SSR output to be hydrated via `hydrate()` |

### Outputs

| Output | Target | Description |
|--------|--------|-------------|
| DOM mutations | Browser | Real DOM updates via `browserRender()` / `hydrate()` |
| HTML string | Server | SSR output via `serverRender()` / `renderToString()` |
| Type definitions | TypeScript | `output/*.d.ts` for consumer type safety |

### External Integrations

| Integration | Role |
|-------------|------|
| TC39 Signal | Reactive primitives (`Signal.State`, `Computed`, `Effect`, `Watcher`) |
| `csstype` | CSS property TypeScript types |
| esbuild / Vite | JSX transformation (via `vite-plugin-airx`) |
| Browser DOM | Rendering target |

### Ownership Boundaries

- **airx** owns: Component model, rendering, reactivity, provide/inject, plugin context
- **airx-router** owns: Route management, history integration
- **vite-plugin-airx** owns: JSX-to-esbuild configuration
- **Developer** owns: Component logic, state management, styling

---

## Modules and Responsibilities

### `source/app/` — Application Layer

**`app.ts`** (~95 lines):
- Defines `AirxApp` interface
- `createApp(element)` factory creates app instance with:
  - `mount(container)` → browser rendering
  - `plugin(...plugins)` → plugin registration
  - `renderToHTML()` → SSR rendering

### `source/element/` — Virtual DOM and Component Model

**`element.ts`** (~500 lines):
- Core type definitions: `AirxElement`, `AirxComponent`, `AirxChildren`, `Props`
- `createElement(type, props, ...children)` — Creates virtual DOM nodes
- `component(fn)` — Higher-order function wrapping component with lifecycle hooks
- `Fragment` — Container that renders children without wrapper DOM node
- `AirxComponentContext` — Per-component instance data (props, refs, mounted callbacks)
- `AirxComponentRender` — Return type of component render function
- `createErrorRender()` — Error boundary rendering
- `isValidElement()` — Element type guard

### `source/render/` — Rendering Engine

#### `render/basic/` — Core Rendering Logic

**`common.ts`** (~300 lines):
- `reconcile()` — Virtual DOM diffing algorithm; computes minimal DOM operations
- `processComponent()` — Instantiates components, manages render cycle
- `createWatcher()` — Sets up Signal watcher for reactive updates
- `scheduleUpdate()` — Batched update scheduling (prevents redundant renders)

**`hooks/hooks.ts`** (~200 lines):
- `provide(key, value)` — Registers value in current component context
- `inject<T>(key)` — Retrieves nearest ancestor's provided value
- `onMounted(listener)` — Registers callback to run after component mounts
- `onUnmounted(listener)` — Registers callback to run before component unmounts
- `currentComponentContext` — Thread-local accessor for component context

**`plugins/index.ts`**:
- `Plugin` interface — `{ install(ctx: PluginContext): void }`
- `PluginContext` — Central plugin registry; passed to plugins on app creation

**`plugins/plugin.ts`** — Plugin hook interface:
- `isReRender?(instance)` — 插件检查是否需要重新渲染，返回 `true` 则强制重新渲染
- `updateDom?(dom, nextProps, prevProps?)` — DOM 属性更新钩子，在 Browser renderer 中调用，SSR 中不使用
- `isReuseInstance?(instance, nextElement)` — 插件检查是否复用现有实例，返回 `false` 则强制重新创建

**Plugin `updateDom` 职责边界** (Browser renderer):
| 操作 | 实现位置 | 说明 |
|------|----------|------|
| 文本内容更新 | `updateDom` 钩子 | 通过 `textContent` 设置 |
| 样式更新 | `updateDom` 钩子 | 遍历 `style` 对象，增量更新 |
| class 更新 | `updateDom` 钩子 | `setAttribute('class', ...)` |
| 普通属性更新 | `updateDom` 钩子 | `setAttribute`/`removeAttribute` |
| 事件监听 | `updateDom` 钩子 | `addEventListener`/`removeEventListener` |
| DOM 创建 | renderer 内核 | `document.createElement` 等平台 API |
| DOM 插入 | renderer 内核 | `insertDomIntoParent` |
| DOM 删除 | renderer 内核 | `removeDeletions` |
| 组件实例复用 | renderer 内核 + `isReuseInstance` 钩子 | 协同决策 |

#### `render/browser/` — Browser Renderer

**`browser.ts`** (~200 lines):
- `browserRender(ctx, element, container)` — Renders to live DOM
- `insertHTML()` — Safe HTML insertion (avoids script injection)
- Handles: element creation, DOM insertion, attribute updates, text updates, event listeners
- Cleanup: unmount callbacks, watcher teardown

#### `render/server/` — SSR Renderer

**`server.ts`** (~350 lines):
- `serverRender(ctx, element, callback)` — Renders to string via callback
- `SSRApp` interface: `renderToString()` → Promise\<string\>
- `createSSRApp(element)` — Creates SSR app instance
- `hydrate()` — Activates SSR-rendered HTML on the client for interactive updates
- Limitation: String-based, not streaming
- Calls `clearSSRSignals()` before each render to avoid stale SSR state

#### `render/ssr/` — SSR State Management

**`ssr-state.ts`** (~110 lines):
- `registerSSRSignal(id, signal)` — Registers Signal.State for SSR tracking
- `getRegisteredSignals()` — Returns all tracked signals as serializable map
- `generateStateSnapshot()` — Creates complete StateSnapshot for SSR
- `injectStateSnapshotIntoHTML(html, snapshot)` — Appends `airx/ssr-state` script tag
- `readStateSnapshotFromDOM(container)` — Parses state snapshot from DOM
- `clearSSRSignals()` — Clears registry between SSR renders (called by serverRender)
- Enables stateful SSR: signal values are captured and embedded in HTML for client restoration

**`render/browser/hydrate.ts`** — StateSnapshot interface definition
- `StateSnapshot` interface: `{ signals, version, timestamp }`
- `HydrateOptions`: `{ stateSnapshot?, forceReset? }`
- `HydratedApp`: `{ container, unmount }`
- `getRegisteredSignals()` — Returns all signals as serializable map
- `generateStateSnapshot()` — Creates `StateSnapshot` { signals, version, timestamp }
- `clearSSRSignals()` — Clears registry between SSR renders (called by serverRender)
- `injectStateSnapshotIntoHTML(html, snapshot)` — Appends `airx/ssr-state` script tag
- Enables stateful SSR: signal values are captured and embedded in HTML for client restoration

### `source/signal/` — Signal Integration

**`signal.ts`** (~50 lines):
- Thin wrapper around global `Signal` constructor
- `getSignal()` — Lazy loads global `Signal`, enforces single-instance policy
- Re-exports: `Signal.State`, `Signal.Computed`, `Signal.Effect`, `Signal.subtle.Watcher`

### `source/symbol/` — Internal Symbols

- Provider/injection symbols
- Internal airx symbols for private properties

### `source/logger/` — Internal Logging

- Development-time logging utilities

### JSX Runtime Exports

- **`jsx-runtime.ts`** — Automatic JSX runtime (`__jsx`, `__jsx Fragment`)
- **`jsx-dev-runtime.ts`** — Development JSX runtime (with extra checks)

---

## Key Flows

### App Creation and Mount Flow

```
1. createApp(element)
   ├── Convert component to element if needed (ensureAsElement)
   ├── Create PluginContext (empty registry)
   └── Return AirxApp { mount, plugin, renderToHTML }
   ↓
2. app.mount(container)
   ├── container.innerHTML = '' (clear)
   └── browserRender(appContext, element, container)
       ↓
       3. browserRender()
           ├── processComponent(element) → render component tree
           │   └── If component: call render function → get children
           ├── reconcile() → compute DOM operations
           └── Apply DOM mutations to container
```

### Reactive Update Flow (Signal Change)

```
1. Signal.State.set(newValue)
   ↓
2. Signal notifies all computed/derived values
   ↓
3. Computed re-evaluates → triggers Effect
   ↓
4. createWatcher() receives notification
   ↓
5. scheduleUpdate() batches the update
   ↓
6. Next microtask: processComponent() re-renders affected components
   ↓
7. reconcile() diffs old vs new virtual DOM
   ↓
8. Minimal DOM operations applied
```

### provide/inject Flow

```
1. Parent component calls provide(key, value)
   └── Inserts into currentComponentContext (thread-local)
   ↓
2. Child component calls inject(key)
   └── Walks up currentComponentContext chain
   └── Returns first matching value or undefined
```

### SSR Flow

```
1. createSSRApp(element) → SSRApp instance
   ↓
2. app.renderToString()
   └── serverRender(appContext, element, resolve)
       ├── clearSSRSignals() — clear stale state
       ├── serverRender() recursively renders elements to string
       │   ├── registerSSRSignal() — track Signal.State values during render
       │   ├── Text nodes → escaped text content
       │   ├── Element nodes → `<tag>...children...</tag>`
       │   └── Fragment → just children
       └── generateStateSnapshot() — capture signal values
           └── injectStateSnapshotIntoHTML(html, snapshot)
               └── Append `<script type="airx/ssr-state">` with JSON state
```

### Hydration Flow

```
1. SSR HTML injected into DOM (contains airx/ssr-state script tag)
   ↓
2. createSSRApp(element)
   └── app.hydrate(container, options)
       ├── Parse state snapshot from `airx/ssr-state` script tag
       ├── Restore Signal.State values from snapshot
       └── Attach event listeners and reactive state to existing DOM
           ↓
       3. After hydration, component tree is interactive
          └── Signal changes trigger targeted re-renders via scheduleUpdate()
```

### Plugin Installation Flow

```
1. app.plugin(customPlugin)
   └── appContext.registerPlugin(customPlugin)
   ↓
2. During first render (mount or SSR)
   └── Each plugin.install(appContext) called in registration order
   ↓
3. Plugin has access to:
   ├── App context for sharing state
   └── Hooks (future: render hooks, etc.)
```

---

## Change Triggers

Update this document when any of the following occur:

1. ~~**Hydration implemented (0.8.x)** — SSR section needs major update~~ ✅ Done in 0.7.x
2. **Streaming SSR support added** — server renderer architecture changes
3. **New rendering target** (e.g., native, canvas) — new render module
4. **Concurrent SSR support** — thread-local context replaced with proper context
5. **Plugin hook API added** — plugin system section expands significantly
6. **Signal integration changes** — Signal wrapper layer changes
7. **Breaking changes to component model** — element.ts section changes
8. **Routing built-in** — scope expands to include routing
