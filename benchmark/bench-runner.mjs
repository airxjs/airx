/**
 * Airx Benchmark Runner
 * Tests what can run in pure Node.js: Signal operations and element creation
 */
import { runAllBenchmarks, printBenchmarkResult, JsonBaselineStore } from './bench-framework.mjs'
import { createElement, Fragment, component } from '../output/element/index.js'
import { Signal } from 'signal-polyfill'
import * as fs from 'fs'

// Destructure Signal properly
const { State, Computed, subtle: { Watcher } } = Signal

// Make Signal available globally
globalThis.Signal = Signal

async function main() {
  console.log('🚀 Starting Airx Performance Benchmark Suite\n')
  console.log('='.repeat(50))

  const results = []

  // Signal benchmarks
  console.log('\n⚡ Signal Performance Benchmarks')
  console.log('-'.repeat(50))

  const signalResults = await runAllBenchmarks([
    {
      name: 'Signal.State set/get (100 ops)',
      fn: async () => {
        const s = new State(0)
        for (let i = 0; i < 100; i++) s.set(i)
        return s.get()
      }
    },
    {
      name: 'Signal.Computed derivation',
      fn: async () => {
        const base = new State(1)
        const derived = new Computed(() => base.get() * 2)
        base.set(42)
        return derived.get()
      }
    },
    {
      name: 'Signal.Watcher (100 updates)',
      fn: async () => {
        const state = new State(0)
        const watcher = new Watcher(() => {})
        watcher.watch(state)
        for (let i = 0; i < 100; i++) state.set(i)
        const pending = watcher.getPending()
        watcher.watch()
        return pending.length
      }
    },
  ])

  results.push(...signalResults)

  // Element creation benchmarks
  console.log('\n📦 Element Creation Benchmarks')
  console.log('-'.repeat(50))

  const elementResults = await runAllBenchmarks([
    {
      name: 'Simple div element',
      fn: async () => {
        return createElement('div', { id: 'test', children: 'Hello' })
      }
    },
    {
      name: 'Element with 5 children',
      fn: async () => {
        return createElement('div', {
          children: [
            createElement('span', { children: 'A' }),
            createElement('span', { children: 'B' }),
            createElement('span', { children: 'C' }),
            createElement('span', { children: 'D' }),
            createElement('span', { children: 'E' }),
          ]
        })
      }
    },
    {
      name: 'Deep tree (depth=5)',
      fn: async () => {
        function createDeepTree(depth) {
          if (depth === 0) return createElement('span', { children: 'leaf' })
          return createElement('div', { children: createDeepTree(depth - 1) })
        }
        return createDeepTree(5)
      }
    },
    {
      name: 'Wide tree (breadth=20)',
      fn: async () => {
        const children = Array.from({ length: 20 }, (_, i) => 
          createElement('span', { children: String(i) })
        )
        return createElement('div', { children })
      }
    },
  ])

  results.push(...elementResults)

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 Benchmark Summary')
  console.log('='.repeat(50))

  for (const result of results) {
    printBenchmarkResult(result)
  }

  // Store results for CI comparison
  const store = new JsonBaselineStore()
  for (const result of results) {
    store.save(result.name, result)
  }

  const resultsPath = './benchmark-results.json'
  fs.writeFileSync(resultsPath, JSON.stringify(store.toJSON(), null, 2))
  console.log(`\n📁 Results saved to ${resultsPath}`)
  console.log('\n✅ Benchmark suite completed successfully')
}

main().catch(err => {
  console.error('Benchmark runner failed:', err)
  process.exit(1)
})
