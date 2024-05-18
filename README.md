# airx

[![npm](https://img.shields.io/npm/v/airx.svg)](https://www.npmjs.com/package/airx) [![build status](https://github.com/airxjs/airx/actions/workflows/check.yml/badge.svg?branch=main)](https://github.com/airxjs/airx/actions/workflows/check.yml)

☁️ Airx is a lightweight JSX web application framework.

Airx is a frontend development framework based on `JSX` and `Signal`, aimed at providing a simple and direct solution for building web applications.

## Features

- Seamlessly integrates with [Signal](https://github.com/tc39/proposal-signals) and its ecosystem!
- Developed entirely using TypeScript, TypeScript-friendly
- Defines components using JSX functional syntax
- No hooks like React 😊
- Minimal API for easy learning

## Getting Started

To begin using Airx, follow these steps:

1. Install Airx using npm or yarn:

```shell
npm install airx
```

2. Import necessary functions and components into your project:

```javascript
import * as airx from 'airx'

// All values based on Signal automatically trigger updates
const state = new Signal.State(1)
const computed = new Signal.Computed(() => state.get() + 100)

function App() {
  const innerState = new Signal.State(1)

  const handleClick = () => {
    state.set(state.get() + 1)
    innerState.set(innerState.get() + 1)
  }

  // Return a rendering function
  return () => (
    <button onClick={handleClick}>
      {state.get()}
      {computed.get()}
      {innerState.get()}
    </button>
  )
}

const app = airx.createApp(<App />);
app.mount(document.getElementById('app'));
```

## API

We have only a few APIs because we pursue a minimal core design. In the future, we will also open up a plugin system.

### createApp

Create an application instance.

### provide

```ts
function provide: <T = unknown>(key: unknown, value: T): ProvideUpdater<T>
```

Inject a value downwards through the `context`, must be called synchronously directly or indirectly within a component.

### inject

```ts
function inject<T = unknown>(key: unknown): T | undefined
```

Look up a specified value upwards through the `context`, must be called synchronously directly or indirectly within a component.

### onMounted

```ts
type MountedListener = () => (() => void) | void
function onMounted(listener: MountedListener): void
```

Register a callback for when the DOM is mounted, must be called synchronously directly or indirectly within a component.

### onUnmounted

```ts
type UnmountedListener = () => void
function onUnmounted(listener: UnmountedListener): void
```

Register a callback for when the DOM is unmounted, must be called synchronously directly or indirectly within a component.

## License

This project uses the MIT License. For detailed information, please refer to the [LICENSE](LICENSE) file.

## Contribution

Contributions are welcome! If you have any ideas, suggestions, or bug reports, please open an issue or submit a pull request.

## Acknowledgements

We want to thank all contributors and supporters of the Airx project.

---

For more information, please refer to the [official documentation](https://github.com/airxjs/airx)
