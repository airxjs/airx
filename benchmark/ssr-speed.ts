/**
 * SSR Speed Benchmark
 * 
 * Measures renderToString() execution time for server-side rendering.
 * Reports: average time per render, renders per second.
 */

import { runBenchmark, runAllBenchmarks, BenchmarkResult, printBenchmarkResult } from './bench-framework.js'
import { createElement, Fragment } from '../source/element/index.js'
import { createState } from '../source/signal/index.js'
import { createSSRApp, renderToString } from '../source/render/server/server.js'

// Mock global Signal for SSR environment
import { Signal } from 'signal-polyfill'
;(globalThis as any).Signal = Signal

/**
 * Create a simple static component tree
 */
function createStaticTree(depth: number, breadth: number): any {
  if (depth === 0) {
    return createElement('span', { children: `leaf` })
  }

  const children: any[] = []
  for (let i = 0; i < breadth; i++) {
    children.push(createStaticTree(depth - 1, breadth))
  }

  return createElement('div', { children })
}

/**
 * Create a component tree with signal dependencies
 */
function createSignalTree(): any {
  const count = createState(42)

  function Counter() {
    return createElement('div', {
      children: [
        createElement('h1', { children: `Count: ${count.get()}` }),
        createElement('p', { children: 'Description text here' }),
        createElement('ul', {
          children: [
            createElement('li', { children: 'Item 1' }),
            createElement('li', { children: 'Item 2' }),
            createElement('li', { children: 'Item 3' }),
          ]
        })
      ]
    })
  }

  return createElement(Counter as any)
}

/**
 * Create a realistic page structure
 */
function createPageStructure(): any {
  function Header() {
    return createElement('header', {
      children: [
        createElement('h1', { children: 'My App' }),
        createElement('nav', {
          children: [
            createElement('a', { href: '/', children: 'Home' }),
            createElement('a', { href: '/about', children: 'About' }),
          ]
        })
      ]
    })
  }

  function MainContent() {
    return createElement('main', {
      children: [
        createElement('article', {
          children: [
            createElement('h2', { children: 'Article Title' }),
            createElement('p', { children: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' }),
            createElement('p', { children: 'Another paragraph of text.' }),
          ]
        }),
        createElement('aside', {
          children: [
            createElement('h3', { children: 'Sidebar' }),
            createElement('ul', {
              children: [
                createElement('li', { children: 'Link 1' }),
                createElement('li', { children: 'Link 2' }),
              ]
            })
          ]
        })
      ]
    })
  }

  function Footer() {
    return createElement('footer', {
      children: createElement('p', { children: '© 2026 Airx' })
    })
  }

  return createElement('div', {
    children: [
      createElement(Header as any),
      createElement(MainContent as any),
      createElement(Footer as any),
    ]
  })
}

/**
 * Benchmark: Simple static render
 */
async function benchmarkSimpleSSR(): Promise<void> {
  const app = createSSRApp(
    createElement('div', { id: 'app', children: 'Hello World' })
  )
  await renderToString(app)
}

/**
 * Benchmark: Nested static tree render
 */
async function benchmarkNestedSSR(): Promise<void> {
  const app = createSSRApp(createStaticTree(4, 3))
  await renderToString(app)
}

/**
 * Benchmark: Deep tree SSR
 */
async function benchmarkDeepSSR(): Promise<void> {
  const app = createSSRApp(createStaticTree(6, 1))
  await renderToString(app)
}

/**
 * Benchmark: Wide tree SSR
 */
async function benchmarkWideSSR(): Promise<void> {
  const app = createSSRApp(createStaticTree(2, 8))
  await renderToString(app)
}

/**
 * Benchmark: Page structure render
 */
async function benchmarkPageSSR(): Promise<void> {
  const app = createSSRApp(createPageStructure())
  await renderToString(app)
}

/**
 * Benchmark: Signal-driven render
 */
async function benchmarkSignalSSR(): Promise<void> {
  const app = createSSRApp(createSignalTree())
  await renderToString(app)
}

/**
 * Run all SSR speed benchmarks
 */
export async function runSSRSpeedBenchmarks(): Promise<BenchmarkResult[]> {
  console.log('\n🚀 SSR Speed Benchmarks')
  console.log('='.repeat(50))

  return runAllBenchmarks([
    { name: 'Simple Static Render', fn: benchmarkSimpleSSR },
    { name: 'Nested Tree (4x3)', fn: benchmarkNestedSSR },
    { name: 'Deep Tree (depth=6)', fn: benchmarkDeepSSR },
    { name: 'Wide Tree (breadth=8)', fn: benchmarkWideSSR },
    { name: 'Page Structure', fn: benchmarkPageSSR },
    { name: 'Signal-Driven Render', fn: benchmarkSignalSSR },
  ])
}

// Run benchmarks if executed directly
if (process.argv[1]?.endsWith('ssr-speed.ts')) {
  runSSRSpeedBenchmarks()
    .then(results => {
      console.log('\n✅ All SSR speed benchmarks completed')
      results.forEach(printBenchmarkResult)
      process.exit(0)
    })
    .catch(err => {
      console.error('Benchmark failed:', err)
      process.exit(1)
    })
}