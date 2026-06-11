# Airx Examples

This directory contains official examples demonstrating Airx features and integrations.

## Examples

### 1. [counter](./counter/) — Signal State & Computed
Basic counter app demonstrating:
- `Signal.State` for reactive state
- `Signal.Computed` for derived values
- `onClick` event handling
- Multiple state management patterns (global + local)

**Run**: `cd counter && pnpm install && pnpm dev`

---

### 2. [async-data](./async-data/) — Async Data Fetching
Demonstrates:
- `onMounted` lifecycle hook
- Async data fetching with loading/error states
- Signal-driven reactive UI updates

**Run**: `cd async-data && pnpm install && pnpm dev`

---

### 3. [ssr-hydration](./ssr-hydration/) — Server-Side Rendering
Full SSR lifecycle example:
- `createSSRApp` for server rendering
- `renderToString()` for HTML generation
- `hydrate()` for client-side activation
- State snapshot embedding

**Run**: 
- Server: `cd ssr-hydration && pnpm install && pnpm server`
- Client dev: `cd ssr-hydration && pnpm install && pnpm dev`

---

### 4. [router](./router/) — Client-Side Routing
Integration with `airx-router`:
- Nested route configuration
- Dynamic path parameters (`:id`)
- Layout components with child routes
- Browser history integration

**Run**: `cd router && pnpm install && pnpm dev`

---

### 5. [plugin](./plugin/) — Plugin System
Custom plugin examples:
- `LoggerPlugin` — logging all render events
- `DebugBorderPlugin` — visual debugging
- `MountTrackerPlugin` — render count tracking
- Plugin chaining with `.plugin()`

**Run**: `cd plugin && pnpm install && pnpm dev`

---

## Prerequisites

All examples use workspace protocol (`workspace:*`) for local package references. 
To run examples, you need a pnpm workspace set up at the monorepo root.

Example monorepo `pnpm-workspace.yaml`:
```yaml
packages:
  - 'examples/*'
  - 'packages/*'
```

Then from the monorepo root:
```bash
pnpm install
cd examples/<example-name>
pnpm dev
```