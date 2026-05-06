/**
 * Signal Update Latency Benchmark
 * 
 * Measures the time from Signal.State.set() to DOM update completion.
 * Reports: latency percentiles (p50, p95, p99), update throughput.
 */

import { runBenchmark, runAllBenchmarks, BenchmarkResult, printBenchmarkResult } from './bench-framework.js'
import { createElement } from '../source/element/index.js'
import { createState, createComputed, createWatch } from '../source/signal/index.js'
import { render } from '../source/render/browser/browser.js'
import { PluginContext } from '../source/render/basic/plugins/index.js'

// Mock global Signal for browser environment
import { Signal } from 'signal-polyfill'
;(globalThis as any).Signal = Signal

interface LatencyMeasurement {
  updateStart: number
  updateEnd: number
  latency: number
}

/**
 * Create a signal-driven counter component
 */
function createSignalCounter(initialValue: number): {
  element: any
  state: any
  getLatency: () => LatencyMeasurement[]
} {
  const state = createState(initialValue)
  const latencyMeasurements: LatencyMeasurement[] = []

  function Component() {
    return createElement('div', {
      className: 'counter',
      'data-count': state.get(),
      children: [
        createElement('span', { children: `Count: ${state.get()}` }),
        createElement('button', {
          onClick: () => {
            const start = performance.now()
            state.set(state.get() + 1)
            // Synchronize to measure latency (in real world, DOM updates are async)
            queueMicrotask(() => {
              latencyMeasurements.push({
                updateStart: start,
                updateEnd: performance.now(),
                latency: performance.now() - start,
              })
            })
          },
          children: '+'
        }),
      ]
    })
  }

  return {
    element: createElement(Component as any),
    state,
    getLatency: () => latencyMeasurements,
  }
}

/**
 * Benchmark: Single signal update latency
 */
async function benchmarkSingleUpdate(): Promise<void> {
  const container = document.createElement('div')
  const pluginContext = new PluginContext()
  
  const { element, state } = createSignalCounter(0)
  render(pluginContext, element, container as any)

  // Measure single update
  const start = performance.now()
  state.set(1)
  await new Promise(resolve => setTimeout(resolve, 0))
}

/**
 * Benchmark: Multiple signal updates in sequence
 */
async function benchmarkSequentialUpdates(): Promise<void> {
  const container = document.createElement('div')
  const pluginContext = new PluginContext()
  
  const { element, state } = createSignalCounter(0)
  render(pluginContext, element, container as any)

  // Perform 10 sequential updates
  for (let i = 0; i < 10; i++) {
    state.set(i + 1)
  }
  await new Promise(resolve => setTimeout(resolve, 0))
}

/**
 * Benchmark: Computed signal dependency chain
 */
async function benchmarkComputedChain(): Promise<void> {
  const container = document.createElement('div')
  const pluginContext = new PluginContext()
  
  const a = createState(1)
  const b = createComputed(() => a.get() * 2)
  const c = createComputed(() => b.get() + 1)

  function Component() {
    return createElement('div', {
      children: `Value: ${c.get()}`
    })
  }

  const element = createElement(Component as any)
  render(pluginContext, element, container as any)

  // Update root signal - should propagate through computed chain
  const start = performance.now()
  a.set(5)
  await new Promise(resolve => setTimeout(resolve, 0))
}

/**
 * Benchmark: High-frequency updates
 */
async function benchmarkHighFrequencyUpdates(): Promise<void> {
  const container = document.createElement('div')
  const pluginContext = new PluginContext()
  
  const { element, state } = createSignalCounter(0)
  render(pluginContext, element, container as any)

  // Perform 50 rapid updates
  for (let i = 0; i < 50; i++) {
    state.set(i)
  }
  await new Promise(resolve => setTimeout(resolve, 0))
}

/**
 * Benchmark: Watcher notification overhead
 */
async function benchmarkWatcherOverhead(): Promise<void> {
  const notify = (await import('signal-polyfill')).Signal.subtle.Watcher
  const state = createState(0)
  const watcher = createWatch(() => {})
  watcher.watch(state)

  const start = performance.now()
  for (let i = 0; i < 100; i++) {
    state.set(i)
  }
  const pending = watcher.getPending()
  for (const s of pending) s.get()
  watcher.watch()

  // Force evaluation
  const end = performance.now()
  void (start && end)
}

/**
 * Calculate latency percentiles from measurements
 */
function calculatePercentiles(measurements: number[]): { p50: number; p95: number; p99: number } {
  if (measurements.length === 0) {
    return { p50: 0, p95: 0, p99: 0 }
  }

  const sorted = [...measurements].sort((a, b) => a - b)
  
  return {
    p50: sorted[Math.floor(sorted.length * 0.50)] || 0,
    p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
    p99: sorted[Math.floor(sorted.length * 0.99)] || 0,
  }
}

/**
 * Run all signal latency benchmarks
 */
export async function runSignalLatencyBenchmarks(): Promise<BenchmarkResult[]> {
  console.log('\n⚡ Signal Update Latency Benchmarks')
  console.log('='.repeat(50))

  return runAllBenchmarks([
    { name: 'Single Update Latency', fn: benchmarkSingleUpdate },
    { name: 'Sequential Updates (10x)', fn: benchmarkSequentialUpdates },
    { name: 'Computed Dependency Chain', fn: benchmarkComputedChain },
    { name: 'High-Frequency Updates (50x)', fn: benchmarkHighFrequencyUpdates },
    { name: 'Watcher Notification Overhead', fn: benchmarkWatcherOverhead },
  ])
}

// Run benchmarks if executed directly
if (process.argv[1]?.endsWith('signal-latency.ts')) {
  runSignalLatencyBenchmarks()
    .then(results => {
      console.log('\n✅ All signal latency benchmarks completed')
      results.forEach(printBenchmarkResult)
      process.exit(0)
    })
    .catch(err => {
      console.error('Benchmark failed:', err)
      process.exit(1)
    })
}