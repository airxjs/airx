/**
 * Airx Benchmark Suite Runner
 * 
 * Executes all performance benchmarks and generates a combined report.
 * This is the main entry point for `npm run benchmark`.
 */

import { runRenderThroughputBenchmarks } from './render-throughput.js'
import { runSignalLatencyBenchmarks } from './signal-latency.js'
import { runSSRSpeedBenchmarks } from './ssr-speed.js'
import { printBenchmarkResult, JsonBaselineStore } from './bench-framework.js'
import * as fs from 'fs'

async function main() {
  console.log('🚀 Starting Airx Performance Benchmark Suite\n')
  console.log('='.repeat(50))

  const results = []

  try {
    // Run all benchmark categories
    console.log('\n📦 Render Throughput Benchmarks')
    console.log('-'.repeat(50))
    const renderResults = await runRenderThroughputBenchmarks()
    results.push(...renderResults)

    console.log('\n⚡ Signal Update Latency Benchmarks')
    console.log('-'.repeat(50))
    const signalResults = await runSignalLatencyBenchmarks()
    results.push(...signalResults)

    console.log('\n🌐 SSR Speed Benchmarks')
    console.log('-'.repeat(50))
    const ssrResults = await runSSRSpeedBenchmarks()
    results.push(...ssrResults)

  } catch (error) {
    console.error('❌ Benchmark execution failed:', error)
    process.exit(1)
  }

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