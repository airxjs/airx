/**
 * Airx Benchmark Runner
 * Tests what can run in pure Node.js: Signal operations and element creation
 * 
 * Usage: node benchmark/bench-runner.mjs
 * 
 * Results are saved to benchmark-results.json for historical comparison.
 */
import { runAllBenchmarks, printBenchmarkResult, JsonBaselineStore } from './bench-framework.mjs'
import { createElement, Fragment, component } from '../output/element/index.js'
import { Signal } from 'signal-polyfill'
import * as fs from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// Destructure Signal properly
const { State, Computed, subtle: { Watcher } } = Signal

// Make Signal available globally
globalThis.Signal = Signal

const BASELINE_FILE = './benchmark-results.json'

/**
 * Load previous baseline results for comparison
 */
function loadPreviousBaseline() {
  try {
    if (fs.existsSync(BASELINE_FILE)) {
      const data = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf-8'))
      return data
    }
  } catch (e) {
    // Baseline file doesn't exist or is invalid
  }
  return null
}

/**
 * Calculate percentage change between values
 */
function calcChange(current, previous) {
  if (!previous || previous === 0) return null
  return ((current - previous) / previous) * 100
}

/**
 * Format change string with emoji indicator
 */
function formatChange(change) {
  if (change === null) return ''
  const emoji = change > 0 ? '📈' : change < 0 ? '📉' : '➡️'
  const sign = change > 0 ? '+' : ''
  return `${emoji} ${sign}${change.toFixed(1)}%`
}

/**
 * Print benchmark result with historical comparison
 */
function printResultWithBaseline(result, previous) {
  console.log(`\n📊 ${result.name}`)
  console.log(`   Mean:     ${result.mean.toFixed(4)} ms`)
  console.log(`   Median:   ${result.median.toFixed(4)} ms`)
  console.log(`   StdDev:   ${result.stddev.toFixed(4)} ms`)
  console.log(`   Min/Max:  ${result.min.toFixed(4)} / ${result.max.toFixed(4)} ms`)
  console.log(`   Ops/Sec:  ${result.opsPerSec.toFixed(2)}`)
  console.log(`   Iterations: ${result.iterations}`)
  
  if (previous) {
    // Compare median latency (more stable than mean, less affected by outliers)
    const latencyChange = calcChange(result.median, previous.median)
    if (latencyChange !== null) {
      console.log(`   vs prev:  ${formatChange(-latencyChange)} (median latency)`)
    }
    // Compare ops/sec (higher is better)
    const opsChange = calcChange(result.opsPerSec, previous.opsPerSec)
    if (opsChange !== null) {
      console.log(`            ${formatChange(opsChange)} (throughput)`)
    }
  }
}

async function main() {
  console.log('🚀 Airx Performance Benchmark Suite\n')
  console.log('='.repeat(50))

  // Load previous baseline for comparison
  const previousBaseline = loadPreviousBaseline()
  if (previousBaseline) {
    console.log('📂 Loaded previous baseline for comparison\n')
  } else {
    console.log('📂 No previous baseline found (first run or file missing)\n')
  }

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

  // Summary with comparison
  console.log('\n' + '='.repeat(50))
  console.log('📊 Benchmark Summary')
  console.log('='.repeat(50))

  for (const result of results) {
    const prev = previousBaseline ? previousBaseline[result.name] : null
    printResultWithBaseline(result, prev)
  }

  // Store results for CI comparison
  const store = new JsonBaselineStore()
  for (const result of results) {
    store.save(result.name, result)
  }

  // Bundle size benchmark - runs after build (which already happened)
  console.log('\n📦 Bundle Size Benchmark')
  console.log('-'.repeat(50))

  const outputDir = join(process.cwd(), 'output')
  const indexMin = join(outputDir, 'index.min.js')
  
  let bundleSizeResult
  try {
    const stats = fs.statSync(indexMin)
    const sizeKB = (stats.size / 1024).toFixed(1)
    
    bundleSizeResult = {
      name: 'Bundle Size',
      size: stats.size,
      sizeKB: `${sizeKB}KB`,
      mean: stats.size,
      stddev: 0,
      median: stats.size,
      min: stats.size,
      max: stats.size,
      iterations: 1,
      opsPerSec: 1000 / stats.size, // higher = smaller bundle = better
    }
    
    const prev = previousBaseline ? previousBaseline['Bundle Size'] : null
    console.log(`\n📊 Bundle Size`)
    console.log(`   Size:     ${sizeKB}KB (${stats.size} bytes)`)
    if (prev) {
      const change = ((stats.size - prev.size) / prev.size * 100)
      const emoji = change > 0 ? '📈' : change < 0 ? '📉' : '➡️'
      console.log(`   vs prev:  ${emoji} ${change >= 0 ? '+' : ''}${change.toFixed(1)}%`)
    }
    
    store.save('Bundle Size', bundleSizeResult)
    console.log('\n✅ Bundle size tracked successfully')
  } catch (e) {
    console.warn('⚠️  Could not measure bundle size:', e.message)
  }

  fs.writeFileSync(BASELINE_FILE, JSON.stringify(store.toJSON(), null, 2))
  console.log(`\n📁 Results saved to ${BASELINE_FILE}`)
  console.log('\n✅ Benchmark suite completed successfully')
}

main().catch(err => {
  console.error('Benchmark runner failed:', err)
  process.exit(1)
})