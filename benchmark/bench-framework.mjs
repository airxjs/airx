/**
 * Airx Benchmark Framework - Compiled version
 */

export class BenchmarkResult {
  constructor(name, mean, stddev, median, min, max, iterations, opsPerSec) {
    this.name = name
    this.mean = mean
    this.stddev = stddev
    this.median = median
    this.min = min
    this.max = max
    this.iterations = iterations
    this.opsPerSec = opsPerSec
  }
}

const DEFAULT_CONFIG = {
  warmupIterations: 10,
  measuredIterations: 100,
  maxDurationMs: 60000,
}

export async function runBenchmark(name, fn, config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const measurements = []

  for (let i = 0; i < cfg.warmupIterations; i++) {
    await fn()
  }

  const startTime = Date.now()
  for (let i = 0; i < cfg.measuredIterations; i++) {
    const iterStart = performance.now()
    await fn()
    const iterEnd = performance.now()
    measurements.push(iterEnd - iterStart)

    if (Date.now() - startTime > cfg.maxDurationMs) break
  }

  return calculateStats(name, measurements)
}

function calculateStats(name, measurements) {
  if (measurements.length === 0) throw new Error('No measurements')
  
  const sorted = [...measurements].sort((a, b) => a - b)
  const sum = measurements.reduce((acc, v) => acc + v, 0)
  const mean = sum / measurements.length

  const squaredDiffs = measurements.map(v => Math.pow(v - mean, 2))
  const variance = squaredDiffs.reduce((acc, v) => acc + v, 0) / measurements.length
  const stddev = Math.sqrt(variance)

  const median = sorted[Math.floor(sorted.length / 2)]
  const min = sorted[0]
  const max = sorted[sorted.length - 1]

  const totalTime = measurements.reduce((acc, v) => acc + v, 0)
  const opsPerSec = totalTime > 0 ? (measurements.length / totalTime) * 1000 : 0

  return new BenchmarkResult(name, mean, stddev, median, min, max, measurements.length, opsPerSec)
}

export function printBenchmarkResult(result) {
  console.log(`\n📊 ${result.name}`)
  console.log(`   Mean:     ${result.mean.toFixed(4)} ms`)
  console.log(`   Median:   ${result.median.toFixed(4)} ms`)
  console.log(`   StdDev:   ${result.stddev.toFixed(4)} ms`)
  console.log(`   Min/Max:  ${result.min.toFixed(4)} / ${result.max.toFixed(4)} ms`)
  console.log(`   Ops/Sec:  ${result.opsPerSec.toFixed(2)}`)
  console.log(`   Iterations: ${result.iterations}`)
}

export async function runAllBenchmarks(benchmarks, config = {}) {
  const results = []
  for (const bench of benchmarks) {
    console.log(`\n⏱ Running ${bench.name}...`)
    const result = await runBenchmark(bench.name, bench.fn, config)
    printBenchmarkResult(result)
    results.push(result)
  }
  return results
}

export class JsonBaselineStore {
  constructor() {
    this.baselines = new Map()
  }
  save(key, result) { this.baselines.set(key, result) }
  load(key) { return this.baselines.get(key) }
  toJSON() { return Object.fromEntries(this.baselines) }
}
