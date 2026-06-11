import * as airx from 'airx'
import { Signal } from 'signal-polyfill'

// Global signal state
const count = new Signal.State(0)
const doubleCount = new Signal.Computed(() => count.get() * 2)

function Counter() {
  const localCount = new Signal.State(0)

  const increment = () => {
    count.set(count.get() + 1)
    localCount.set(localCount.get() + 1)
  }

  const decrement = () => {
    count.set(count.get() - 1)
    localCount.set(localCount.get() - 1)
  }

  const reset = () => {
    count.set(0)
    localCount.set(0)
  }

  return () => (
    <div className="card">
      <h1>Counter App</h1>
      <p>Global count: {count.get()}</p>
      <p className="double">Double: {doubleCount.get()}</p>
      <p>Local count: {localCount.get()}</p>
      <div>
        <button className="increment" onClick={increment}>+ Increment</button>
        <button className="decrement" onClick={decrement}>− Decrement</button>
        <button className="reset" onClick={reset}>Reset</button>
      </div>
    </div>
  )
}

airx.createApp(<Counter />).mount(document.getElementById('app')!)