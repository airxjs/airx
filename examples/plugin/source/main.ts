import * as airx from 'airx'
import type { Plugin } from 'airx'
import { Signal } from 'signal-polyfill'

// Custom plugin: adds console logging to all renders
function loggerPlugin(): Plugin {
  return {
    isReRender() {
      console.log('[LoggerPlugin] Re-render triggered')
    },
    updateDom(dom, nextProps, prevProps) {
      console.log('[LoggerPlugin] DOM update:', dom.tagName, Object.keys(nextProps || {}))
    },
    isReuseInstance() {
      console.log('[LoggerPlugin] Instance reuse check')
    }
  }
}

// Custom plugin: adds debug border to all elements
function debugBorderPlugin(): Plugin {
  return {
    updateDom(dom) {
      const el = dom as HTMLElement
      el.style.outline = '2px dashed #6366f1'
      el.style.outlineOffset = '2px'
    }
  }
}

// Custom plugin: tracks mount/unmount
function mountTrackerPlugin(): Plugin {
  let mountCount = 0

  return {
    isReRender() {
      // Track re-renders
    },
    updateDom() {
      mountCount++
      console.log(`[MountTracker] Total DOM updates: ${mountCount}`)
    }
  }
}

// App component with counter
function App() {
  const count = new Signal.State(0)
  const items = new Signal.State(['Apple', 'Banana', 'Cherry'])

  const addItem = () => {
    const next = count.get() + 1
    count.set(next)
    items.set([...items.get(), `Item ${next}`])
  }

  return () => (
    <div className="card">
      <h1>Plugin Demo</h1>
      <p>Count: {count.get()}</p>
      <button onClick={addItem}>Add Item</button>
      
      <ul>
        {items.get().map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>

      <div className="plugin-info">
        <h3>Active Plugins</h3>
        <p><strong>LoggerPlugin</strong>: Logs all render and DOM update events to console</p>
        <p><strong>DebugBorderPlugin</strong>: Draws a dashed purple outline around all DOM elements</p>
        <p><strong>MountTrackerPlugin</strong>: Tracks total DOM update count</p>
      </div>
    </div>
  )
}

// Create app with multiple plugins
airx.createApp(<App />)
  .plugin(loggerPlugin())
  .plugin(debugBorderPlugin())
  .plugin(mountTrackerPlugin())
  .mount(document.getElementById('app')!)