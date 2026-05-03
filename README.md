# Airx ☁️

[![npm](https://img.shields.io/npm/v/airx.svg)](https://www.npmjs.com/package/airx)
[![build status](https://github.com/airxjs/airx/actions/workflows/check.yml/badge.svg?branch=main)](https://github.com/airxjs/airx/actions/workflows/check.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

> A lightweight, Signal-driven JSX web application framework

[中文文档](./README_CN.md) • [English Documentation](./README.md)

Airx is a modern frontend framework built on **JSX** and **Signal** primitives, designed to provide a simple, performant, and intuitive solution for building reactive web applications.

## ✨ Features

- 🔄 **Signal-driven reactivity**: Seamlessly integrates with [TC39 Signal proposal](https://github.com/tc39/proposal-signals)
- 📝 **TypeScript-first**: Developed entirely in TypeScript with excellent type safety
- ⚡ **Functional components**: Define components using clean JSX functional syntax
- 🚫 **No hooks complexity**: Simple and straightforward API without React-style hooks
- 🪶 **Lightweight**: Minimal bundle size with zero dependencies
- 🔌 **Extensible**: Plugin system for advanced functionality
- 🌐 **Universal**: Works in both browser and server environments

## 🚀 Quick Start

### Installation

```bash
npm install airx
# or
yarn add airx
# or
pnpm add airx
```

### Basic Usage

```tsx
import * as airx from 'airx'
import { Signal } from 'signal-polyfill'

// Create reactive state using Signal
const count = new Signal.State(0)
const doubleCount = new Signal.Computed(() => count.get() * 2)

function Counter() {
  const localState = new Signal.State(0)

  const increment = () => {
    count.set(count.get() + 1)
    localState.set(localState.get() + 1)
  }

  // Return a render function
  return () => (
    <div>
      <h1>Counter App</h1>
      <p>Global count: {count.get()}</p>
      <p>Double count: {doubleCount.get()}</p>
      <p>Local count: {localState.get()}</p>
      <button onClick={increment}>
        Click me!
      </button>
    </div>
  )
}

// Create and mount the app
const app = airx.createApp(<Counter />)
app.mount(document.getElementById('app'))
```

## 🌐 Server-Side Rendering (SSR)

Airx supports server-side rendering (SSR) out of the box. SSR allows you to render your components to HTML strings on the server, which can improve initial page load performance and SEO.

### Quick Start

```tsx
import * as airx from 'airx'

// Create an SSR app
const app = airx.createSSRApp(<MyComponent />)

// Render to HTML string
const html = await app.renderToString()
// html === '<div><h1>Hello World</h1></div>'
```

### Full SSR Example

```tsx
import { createSSRApp } from 'airx'

// Define a component
function UserCard({ name, email }: { name: string; email: string }) {
  return () => (
    <div className="user-card">
      <h2>{name}</h2>
      <p>{email}</p>
    </div>
  )
}

// Server-side rendering
async function renderPage() {
  const app = createSSRApp(
    <UserCard name="Alice" email="alice@example.com" />
  )
  
  const html = await app.renderToString()
  console.log(html)
  // <div class="user-card"><h2>Alice</h2><p>alice@example.com</p></div>
  
  return html
}
```

### Hydration (Client-Side Activation)

> ✅ Hydration is stable in 0.8.0+ for activating server-rendered HTML on the client.

```tsx
import { createSSRApp, hydrate } from 'airx'

// Server: render HTML
const app = createSSRApp(<App />)
const ssrHtml = await app.renderToString()
// Send ssrHtml to client...

// Client: activate SSR HTML
const container = document.getElementById('app')
if (container) {
  container.innerHTML = ssrHtml
  const { unmount } = hydrate(<App />, container)
  // App is now interactive!
}
```

### API Reference

#### `createSSRApp(element)`

Creates an SSR application instance for server-side rendering.

```tsx
const app = airx.createSSRApp(<MyComponent />)
```

#### `app.renderToString()`

Renders an SSR app to an HTML string (returns a Promise).

```tsx
const html = await app.renderToString()
```

#### `hydrate(element, container, options?)`

Activates server-rendered HTML on the client for interactive updates.

```tsx
const hydrated = hydrate(<App />, container, {
  stateSnapshot,  // optional: Signal state from SSR
  forceReset: false  // optional: skip SSR state, recalculate from scratch
})

// hydrated.unmount() - cleanup function
```

## 📖 Core Concepts

### Components

Components in Airx are simple functions that return a render function:

```tsx
function MyComponent() {
  const state = new Signal.State('Hello')
  
  return () => (
    <div>{state.get()} World!</div>
  )
}
```

### State Management

Airx leverages the Signal primitive for reactive state management:

```tsx
// State
const count = new Signal.State(0)

// Computed values
const isEven = new Signal.Computed(() => count.get() % 2 === 0)

// Effects
const effect = new Signal.Effect(() => {
  console.log('Count changed:', count.get())
})
```

### Context & Dependency Injection

```tsx
const ThemeContext = Symbol('theme')

function App() {
  // Provide values down the component tree
  airx.provide(ThemeContext, 'dark')
  
  return () => <Child />
}

function Child() {
  // Inject values from parent components
  const theme = airx.inject(ThemeContext)
  
  return () => (
    <div className={`theme-${theme}`}>
      Current theme: {theme}
    </div>
  )
}
```

### Lifecycle Hooks

```tsx
function Component() {
  airx.onMounted(() => {
    console.log('Component mounted')
    
    // Return cleanup function
    return () => {
      console.log('Component unmounted')
    }
  })

  airx.onUnmounted(() => {
    console.log('Component will unmount')
  })
  
  return () => <div>My Component</div>
}

## 📚 API Reference

Airx follows a minimal API design philosophy. Here are the core APIs:

### `createApp(element)`

Creates an application instance.

```tsx
const app = airx.createApp(<App />)
app.mount(document.getElementById('root'))
```

### `provide<T>(key, value): ProvideUpdater<T>`

Provides a value down the component tree through context. Must be called synchronously within a component.

```tsx
function Parent() {
  airx.provide('theme', 'dark')
  return () => <Child />
}
```

### `inject<T>(key): T | undefined`

Retrieves a provided value from the component tree. Must be called synchronously within a component.

```tsx
function Child() {
  const theme = airx.inject('theme')
  return () => <div>Theme: {theme}</div>
}
```

### `onMounted(listener): void`

Registers a callback for when the component is mounted to the DOM.

```tsx
type MountedListener = () => (() => void) | void

airx.onMounted(() => {
  console.log('Mounted!')
  return () => console.log('Cleanup')
})
```

### `onUnmounted(listener): void`

Registers a callback for when the component is unmounted from the DOM.

```tsx
type UnmountedListener = () => void

airx.onUnmounted(() => {
  console.log('Unmounted!')
})
```

### `createElement(type, props, ...children)`

Creates virtual DOM elements (usually handled by JSX transpiler).

### `Fragment`

A component for grouping multiple elements without adding extra DOM nodes.

```tsx
function App() {
  return () => (
    <airx.Fragment>
      <div>First</div>
      <div>Second</div>
    </airx.Fragment>
  )
}
```

## 🔧 Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/airxjs/airx.git
cd airx

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Project Structure

```text
source/
├── app/           # Application creation and management
├── element/       # Virtual DOM and JSX handling
├── logger/        # Internal logging utilities
├── render/        # Rendering engine
│   ├── basic/     # Core rendering logic
│   ├── browser/   # Browser-specific rendering
│   └── server/    # Server-side rendering
├── signal/        # Signal integration
├── symbol/        # Internal symbols
└── types/         # TypeScript type definitions
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for your changes
5. Ensure all tests pass (`npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Thanks to all contributors and supporters of the Airx project
- Inspired by the [TC39 Signal proposal](https://github.com/tc39/proposal-signals)
- Built with ❤️ by the Airx community

## 📞 Support

- 📖 [Documentation](https://github.com/airxjs/airx)
- 🐛 [Issue Tracker](https://github.com/airxjs/airx/issues)
- 💬 [Discussions](https://github.com/airxjs/airx/discussions)

---

Made with ☁️ by the Airx team
