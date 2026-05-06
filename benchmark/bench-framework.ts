/**
 * Airx Benchmark Framework
 * 
 * Provides utilities for running reproducible performance benchmarks.
 * Supports warm-up runs, statistical analysis, and result comparison.
 */

export interface BenchmarkResult {
  name: string
  mean: number
  stddev: number
  median: number
  min: number
  max: number
  iterations: number
  opsPerSec: number
}

export interface BenchmarkConfig {
  warmupIterations?: number
  measuredIterations?: number
  maxDurationMs?: number
}

const DEFAULT_CONFIG: Required<BenchmarkConfig> = {
  warmupIterations: 10,
  measuredIterations: 100,
  maxDurationMs: 60000,
}

/**
 * Run a benchmark and collect statistical metrics
 */
export async function runBenchmark<T>(
  name: string,
  fn: () => T | Promise<T>,
  config: BenchmarkConfig = {}
): Promise<BenchmarkResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const measurements: number[] = []

  // Warm-up phase - JIT compilation, cache warming
  for (let i = 0; i < cfg.warmupIterations; i++) {
    await fn()
  }

  // Measurement phase
  const startTime = Date.now()
  for (let i = 0; i < cfg.measuredIterations; i++) {
    const iterStart = performance.now()
    await fn()
    const iterEnd = performance.now()
    measurements.push(iterEnd - iterStart)

    // Safety timeout
    if (Date.now() - startTime > cfg.maxDurationMs) {
      break
    }
  }

  return calculateStats(name, measurements)
}

/**
 * Calculate statistical metrics from measurements
 */
export function calculateStats(name: string, measurements: number[]): BenchmarkResult {
  if (measurements.length === 0) {
    throw new Error('No measurements collected')
  }

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

  return {
    name,
    mean,
    stddev,
    median,
    min,
    max,
    iterations: measurements.length,
    opsPerSec,
  }
}

/**
 * Print benchmark results in a formatted table
 */
export function printBenchmarkResult(result: BenchmarkResult): void {
  console.log(`\n📊 ${result.name}`)
  console.log(`   Mean:     ${result.mean.toFixed(4)} ms`)
  console.log(`   Median:   ${result.median.toFixed(4)} ms`)
  console.log(`   StdDev:   ${result.stddev.toFixed(4)} ms`)
  console.log(`   Min/Max:  ${result.min.toFixed(4)} / ${result.max.toFixed(4)} ms`)
  console.log(`   Ops/Sec:  ${result.opsPerSec.toFixed(2)}`)
  console.log(`   Iterations: ${result.iterations}`)
}

/**
 * Compare two benchmark results and report regression
 */
export function compareResults(baseline: BenchmarkResult, current: BenchmarkResult): {
  regression: number
  significant: boolean
} {
  // Calculate percentage change in mean
  const change = ((current.mean - baseline.mean) / baseline.mean) * 100
  const regression = -change // positive means regression

  // Consider 5% change as significant
  const significant = Math.abs(change) > 5

  return { regression, significant }
}

/**
 * Run multiple benchmarks and return combined report
 */
export async function runAllBenchmarks(
  benchmarks: Array<{ name: string; fn: () => void | Promise<void> }>,
  config: BenchmarkConfig = {}
): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = []

  for (const bench of benchmarks) {
    console.log(`\n⏱ Running ${bench.name}...`)
    const result = await runBenchmark(bench.name, bench.fn, config)
    printBenchmarkResult(result)
    results.push(result)
  }

  return results
}

/**
 * Baseline storage interface for CI integration
 */
export interface BaselineStore {
  save(key: string, result: BenchmarkResult): void
  load(key: string): BenchmarkResult | undefined
}

export class JsonBaselineStore implements BaselineStore {
  private baselines = new Map<string, BenchmarkResult>()

  save(key: string, result: BenchmarkResult): void {
    this.baselines.set(key, result)
  }

  load(key: string): BenchmarkResult | undefined {
    return this.baselines.get(key)
  }

  toJSON(): Record<string, BenchmarkResult> {
    return Object.fromEntries(this.baselines)
  }

  static fromJSON(data: Record<string, BenchmarkResult>): JsonBaselineStore {
    const store = new JsonBaselineStore()
    for (const [key, value] of Object.entries(data)) {
      store.baselines.set(key, value)
    }
    return store
  }
}