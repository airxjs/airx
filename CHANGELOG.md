# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.8.0] - 2026-05-03

### Breaking Changes

- **hydrate() API Stabilized** — Removed @experimental marker and runtime warnings from `hydrate()`, which is now a stable public API. Update any code that relied on the experimental warning.

- **ErrorBoundary Component** — Implemented ErrorBoundary component for graceful error handling in the component tree
- **Hydrate State Serialization** — Implemented `hydrate()` state serialization and reading for SSR hydration state transfer
- **Experimental Markers & Runtime Warnings** — Added experimental API markers and runtime warnings when hydrate stateSnapshot restore is incomplete

### Performance

- **Idle Scheduling Fix** — Prevent unnecessary idle scheduling after work completion

### Refactor

- **Shared Commit Helpers** — Extracted shared `createCommitWalker` function to eliminate browser/server commit logic duplication
- **Plugin/Commit Responsibility Docs** — Documented `plugin.updateDom` boundary and commit responsibilities (TASK-0067)

### Fixed

- **Hydrate Dev Mode Warning** — Added runtime warning in dev mode when hydrate stateSnapshot restore is incomplete
- **DOM Updates During Yield** — Enhanced render logic to ensure DOM updates correctly after signal changes during yield
- **Lint Warnings** — Removed 6 unused variable/eslint warnings across the codebase

### Testing

- **Scheduler Idle Regression Tests** — Added regression tests for browser scheduler idle behavior (TASK-0066)
- **Hydrate Integration Tests** — Strengthened `hydrate()` integration test coverage (370 tests)

### Documentation

- **Architecture Updates** — Updated architecture.md with hydrate state snapshot docs and SSR state management
- **API Stability Audit** — Updated api-stability-audit for plugin/renderToHTML boundaries

### Infrastructure

- **TypeScript Typecheck in CI** — Added typecheck step to CI pipeline for early type error detection

---

## [0.7.10] - 2026-04-16

### Added

- **Commit Walker Abstraction** — Extracted `commitWalkV2` as shared `createCommitWalker` function for browser and server commit logic reuse
- **SSR Hydrate Improvements** — Enhanced hydration support with `plugin.updateDom` binding during hydration

### Performance

- **PluginContext Reuse** — Reuse `PluginContext` across `workLoop` iterations to reduce allocation overhead

### Refactor

- **Logger Cleanup** — Removed unused variables and fixed semicolon issues in logger tests

### Fixed

- **DOM Updates During Yield** — Enhanced render logic to ensure DOM updates correctly after signal changes during yield
- **Dev Mode Hydration Warning** — Added runtime warning in dev mode when hydrate stateSnapshot restore is incomplete

### Testing

- **Hydrate Test Coverage** — Strengthened `hydrate()` integration test coverage (370 tests)

---

## [0.7.8] - 2026-04-12

### Fixed

- **DOM Updates After Signal Yield** — Enhanced render logic to ensure DOM updates correctly after signal changes during yield

---

## [0.7.4] - 2026-04-06

### Added

- **Log Level Support** — Added `AirxApp.debug()` API and log level support (`setLogLevel`)
- **Boolean/Null Attribute Support** — Enhanced `updateDom` to handle boolean and null attributes
- **innerHTML Support** — Added innerHTML support in element rendering

### Fixed

- **Reactive Dependency Tracking** — Stabilized reactive dependency tracking
- **Idle Scheduling** — Prevent unnecessary idle scheduling after work completion
- **Hydration stateSnapshot Warning** — Warn in dev mode when hydrate stateSnapshot restore is incomplete

### Performance

- **Signal Watcher Optimization** — Optimized signalWatcher to handle immediate re-subscription and avoid missed updates

---

## [0.7.3] - 2026-04-02

### Fixed

- **DOM Reconciliation `insertBefore`** — Added `ServerElement.insertBefore` method to fix DOM reconciliation in SSR hydration scenarios
- **Re-render Logic** — Corrected `performUnitOfWork` re-render logic for reactive components to prevent unnecessary re-renders
- **Provide/Inject Value Changes** — Fixed `inject.test.ts` to correctly handle provide/inject value change scenarios
- **Type Errors** — Fixed TypeScript type errors in DOM reconciliation code

### Performance

- **DOM Move Optimization** — Optimized DOM `move` operation in reconciliation algorithm, reducing unnecessary DOM mutations

### Refactor

- **Common Utilities** — Extracted `getParentDom` / `getChildDoms` helper functions to `common.ts` for better code reuse

### Testing

- **Lint Fixes** — Resolved lint errors in `common.signal-integration.test.ts`
- **Test Coverage** — All 319 tests passing

---

## [0.7.0] - 2026-03-22

### Breaking Changes

- **Removed Legacy API** — Removed deprecated `createRef` and `watch` functions from `source/legacy.ts`. 
  - Use `Signal.State` instead of `createRef`
  - Use `Signal.Computed` or `Signal.Effect` instead of `watch`
  - For migration guide, see `.projitive/designs/migration-0.7.md`
  - This aligns fully with TC39 Signals proposal standard

### Removed

- `createRef<T>()` function
- `watch<T>()` function  
- `Ref<T>` type and `LegacyRef<T>` class
- `source/legacy.ts` file

### Migration

See detailed migration guide in [`.projitive/designs/migration-0.7.md`](.projitive/designs/migration-0.7.md) for step-by-step instructions on upgrading from 0.6.x.

---

## [0.6.0] - 2026-03-22

### Added

- **Static Components Support** — Components can now be defined with static rendering optimization (`source/render/common/index.ts`)
- **Improved JSX Type System** — More precise JSX intrinsic elements and attribute typing
- **Function Type Ref** — Support for function-type ref callbacks
- **Children via Props** — Support passing children via `children` prop in `createElement`

### Changed

- **Project Structure Reorganization** — Modular directory layout with clear separation (`app/`, `element/`, `render/`, `signal/`)
- **Render Module Refactor** — Reorganized render module with comprehensive test suite
- **ESLint Upgrade** — Upgraded `@typescript-eslint/*` to v8.35.1 with TypeScript 5.8 compatibility fix
- **GitHub Actions Node Version** — Upgraded CI to newer Node version

### Fixed

- **Ref Type Narrowing** — Improved ref type coverage and edge cases
- **Bug Fixes** — Various bug fixes from PR #32 (`fix-bugs`)

### Infrastructure

- **Governance Workspace** — Established AI-first project governance with Projitive
- **Release Quality Gates** — Defined build, lint, type, test, and downstream compatibility gates
- **Functional Correctness Matrix** — Complete verification matrix for core features
- **Signals Alignment** — TC39 proposal-signals alignment plan and test coverage
- **Infrastructure Upgrade Baseline** — Version upgrade strategy for 2026-Q2/Q3

---

## [0.4.0] - 2024-06-05

> Previous stable release

## [0.3.0] - 2024-05-XX

> See git history for details
