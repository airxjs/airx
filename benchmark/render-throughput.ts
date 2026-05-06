/**
 * Render Throughput Benchmark
 * 
 * Measures the speed of mounting component trees.
 * Reports: components rendered per second, timing statistics.
 */

import { runBenchmark, runAllBenchmarks, BenchmarkResult, printBenchmarkResult } from './bench-framework.js'
import { createElement, Fragment } from '../source/element/index.js'
import { createState, createComputed } from '../source/signal/index.js'
import { render } from '../source/render/browser/browser.js'
import { PluginContext } from '../source/render/basic/plugins/index.js'

// Mock global Signal for browser environment
import { Signal } from 'signal-polyfill'
;(globalThis as any).Signal = Signal

/**
 * Create a simple counter component for benchmarking
 */
function createCounterComponent(count: number): any {
  return createElement('div', {
    className: 'counter',
    children: [
      createElement('span', { children: `Count: ${count}` }),
      createElement('button', { children: '+' }),
    ]
  })
}

/**
 * Create a complex nested component tree
 */
function createNestedTree(depth: number, breadth: number): any {
  if (depth === 0) {
    return createElement('div', { className: 'leaf', children: `Leaf at depth 0` })
  }

  const children: any[] = []
  for (let i = 0; i < breadth; i++) {
    children.push(createNestedTree(depth - 1, breadth))
  }

  return createElement('div', {
    className: `level-${depth}`,
    children
  })
}

/**
 * Benchmark: Simple component render
 */
async function benchmarkSimpleRender(): Promise<void> {
  const container = document.createElement('div')
  const pluginContext = new PluginContext()
  const element = createElement('div', { id: 'test', children: 'Hello' })

  render(pluginContext, element, container as any)
}

/**
 * Benchmark: Counter component render (realistic use case)
 */
async function benchmarkCounterRender(): Promise<void> {
  const container = document.createElement('div')
  const pluginContext = new PluginContext()
  
  const state = createState(0)
  const element = createCounterComponent(state.get())

  render(pluginContext, element, container as any)
}

/**
 * Benchmark: Nested tree render
 */
async function benchmarkNestedTree(): Promise<void> {
  const container = document.createElement('div')
  const pluginContext = new PluginContext()
  
  // Create a tree with depth 3 and breadth 3 = 1 + 3 + 9 + 27 = 40 nodes
  const element = createNestedTree(3, 3)

  render(pluginContext, element, container as any)
}

/**
 * Benchmark: Deep tree render
 */
async function benchmarkDeepTree(): Promise<void> {
  const container = document.createElement('div')
  const pluginContext = new PluginContext()
  
  // Create a deep tree: depth 6, single branch = 6 nodes
  const element = createNestedTree(6, 1)

  render(pluginContext, element, container as any)
}

/**
 * Benchmark: Wide tree render
 */
async function benchmarkWideTree(): Promise<void> {
  const container = document.createElement('div')
  const pluginContext = new PluginContext()
  
  // Create a wide tree: depth 2, breadth 10 = 1 + 10 + 100 = 111 nodes
  const element = createNestedTree(2, 10)

  render(pluginContext, element, container as any)
}

/**
 * Run all render throughput benchmarks
 */
export async function runRenderThroughputBenchmarks(): Promise<BenchmarkResult[]> {
  console.log('\n🚀 Render Throughput Benchmarks')
  console.log('='.repeat(50))

  return runAllBenchmarks([
    { name: 'Simple Div Render', fn: benchmarkSimpleRender },
    { name: 'Counter Component Render', fn: benchmarkCounterRender },
    { name: 'Nested Tree (3x3)', fn: benchmarkNestedTree },
    { name: 'Deep Tree (depth=6)', fn: benchmarkDeepTree },
    { name: 'Wide Tree (breadth=10)', fn: benchmarkWideTree },
  ])
}

// Run benchmarks if executed directly
if (process.argv[1]?.endsWith('render-throughput.ts')) {
  runRenderThroughputBenchmarks()
    .then(results => {
      console.log('\n✅ All render throughput benchmarks completed')
      results.forEach(printBenchmarkResult)
      process.exit(0)
    })
    .catch(err => {
      console.error('Benchmark failed:', err)
      process.exit(1)
    })
}