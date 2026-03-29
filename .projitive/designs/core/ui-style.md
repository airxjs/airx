# UI Style

## Visual Language

### This Project Has No UI

`airx` is a **JSX web application framework**, not a product with a user interface:
- No frontend, no styles, no design tokens
- This document exists to satisfy governance requirements but records **N/A**

### Framework Philosophy

**No styling opinions** — airx deliberately does not include:
- CSS framework integration (Tailwind, CSS-in-JS, etc.)
- Design token system
- Component library
- Theme system

Styling is entirely the **user's responsibility** when building applications with airx.

---

## Components and Patterns

### airx Rendering Model

airx provides rendering primitives without UI opinions:

| Function | Purpose |
|----------|---------|
| `browserRender()` | Renders JSX component tree to browser DOM |
| `serverRender()` | SSR to HTML string |
| `renderToString()` | Pure string rendering |

### Plugin System

Extensibility via `Plugin.install()` — no built-in UI plugins.

---

## Accessibility

Since airx has no UI components, accessibility is **delegated to framework users**:

- Users choose their own component libraries
- Users implement their own ARIA patterns
- Users choose their own focus management

---

## Relationship to Design Systems

Applications built **with** airx may use any design system:
- shadcn/ui + TailwindCSS
- Radix UI primitives
- CSS Modules
- Any CSS approach

**This project does not prescribe a design system.**

---

## Change Triggers

Update this document if:
1. airx ever adds built-in UI components or design tokens
2. Framework philosophy around styling changes
