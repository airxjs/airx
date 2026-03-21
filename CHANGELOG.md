# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
