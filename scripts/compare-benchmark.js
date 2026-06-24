/**
 * Benchmark Comparison Script
 * 
 * Compares current benchmark results with baseline.
 * Fails CI if performance regression exceeds threshold.
 * 
 * Usage: node scripts/compare-benchmark.js
 */

import * as fs from 'fs'
import * as path from 'path'

const BASELINE_FILE = './benchmark-results.json'
const DEFAULT_THRESHOLD = 0.1 // 10% regression threshold

/**
 * Load benchmark results from JSON file
 */
function loadResults(filepath) {
  try {
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, 'utf-8'))
    }
  } catch (e) {
    console.error(`Failed to load ${filepath}:`, e.message)
  }
  return null
}

/**
 * Calculate percentage change
 */
function calcChange(current, previous) {
  if (!previous || previous === 0) return null
  return ((current - previous) / previous) * 100
}

/**
 * Determine if regression is acceptable
 * For latency metrics: positive change = regression (slower)
 * For ops/sec metrics: negative change = regression (lower throughput)
 * For size metrics (bundle size): positive change = regression (larger)
 */
function checkRegression(metricName, current, previous, threshold) {
  // Determine if this is a latency or throughput metric
  const isLatency = metricName.includes('latency') || 
                    metricName.includes('set/get') || 
                    metricName.includes('update') ||
                    metricName.includes('derivation')
  
  const isThroughput = metricName.includes('ops') || metricName.includes('throughput')
  
  // Bundle size uses 'size' field (bytes), lower is better
  const isSize = metricName === 'Bundle Size' || current.size != null
  
  let change, isRegressed
  
  if (isSize) {
    // Larger bundle = regression
    change = calcChange(current.size, previous.size)
    isRegressed = change > threshold * 100
  } else if (isLatency) {
    // Higher latency = regression
    change = calcChange(current.median, previous.median)
    isRegressed = change > threshold * 100
  } else if (isThroughput) {
    // Lower ops/sec = regression
    change = calcChange(current.opsPerSec, previous.opsPerSec)
    isRegressed = change < -threshold * 100
  } else {
    // Default: compare median latency
    change = calcChange(current.median, previous.median)
    isRegressed = Math.abs(change) > threshold * 100
  }
  
  return { change, isRegressed, isLatency, isThroughput, isSize }
}

/**
 * Format change with indicator
 * For size metrics: negative change (smaller) = improvement, positive = regression
 */
function formatChange(change, isRegressed, isSize) {
  if (change === null) return 'N/A'
  const sign = change >= 0 ? '+' : ''
  // For size: smaller is better, so inverted logic
  const emoji = isSize
    ? (isRegressed ? '🔴' : '✅')
    : (isRegressed ? '🔴' : '✅')
  return `${emoji} ${sign}${change.toFixed(2)}%`
}

/**
 * Main comparison function
 */
function compareWithBaseline(currentResults, baseline, threshold = DEFAULT_THRESHOLD) {
  const regressions = []
  const improvements = []
  const noChange = []
  
  for (const [name, current] of Object.entries(currentResults)) {
    const previous = baseline[name]
    
    if (!previous) {
      console.log(`\n⚠️  New metric: ${name} (no baseline)`)
      continue
    }
    
    const { change, isRegressed, isSize } = checkRegression(name, current, previous, threshold)
    
    if (change === null) {
      noChange.push({ name, current, previous })
      continue
    }
    
    const status = formatChange(change, isRegressed, isSize)
    
    console.log(`\n📊 ${name}`)
    if (isSize) {
      console.log(`   Current:  ${current.sizeKB} (${current.size} bytes)`)
      console.log(`   Baseline: ${previous.sizeKB} (${previous.size} bytes)`)
    } else {
      console.log(`   Current:  ${current.median.toFixed(4)} ms (${current.opsPerSec.toFixed(2)} ops/s)`)
      console.log(`   Baseline: ${previous.median.toFixed(4)} ms (${previous.opsPerSec.toFixed(2)} ops/s)`)
    }
    console.log(`   Change:   ${status}`)
    
    if (isRegressed) {
      regressions.push({ name, change, current, previous, threshold })
    } else if (change !== null && Math.abs(change) < 1) {
      // Small improvement (less than 1%) - not significant
      noChange.push({ name, change })
    } else {
      improvements.push({ name, change })
    }
  }
  
  return { regressions, improvements, noChange }
}

/**
 * Print summary report
 */
function printSummary(results, threshold) {
  const { regressions, improvements, noChange } = results
  
  console.log('\n' + '='.repeat(60))
  console.log('📋 Benchmark Regression Summary')
  console.log('='.repeat(60))
  console.log(`Threshold: ${(threshold * 100).toFixed(0)}%`)
  console.log('')
  
  if (regressions.length > 0) {
    console.log('🔴 REGRESSIONS DETECTED:')
    for (const r of regressions) {
      console.log(`   - ${r.name}: ${r.change?.toFixed(2)}% (threshold: ${(r.threshold * 100).toFixed(0)}%)`)
    }
    console.log('')
  }
  
  if (improvements.length > 0) {
    console.log('🟢 Improvements:')
    for (const i of improvements) {
      console.log(`   - ${i.name}: ${i.change?.toFixed(2)}%`)
    }
    console.log('')
  }
  
  console.log(`Total metrics checked: ${regressions.length + improvements.length + noChange.length}`)
  console.log(`Regressions: ${regressions.length}`)
  console.log(`Improvements: ${improvements.length}`)
  console.log(`No significant change: ${noChange.length}`)
  
  return regressions.length === 0
}

/**
 * Main entry point
 */
function main() {
  console.log('🔍 Airx Performance Regression Check')
  console.log('='.repeat(60))
  
  // Load current results and baseline
  const current = loadResults(BASELINE_FILE)
  if (!current) {
    console.error('\n❌ No benchmark results found. Run `npm run benchmark` first.')
    process.exit(1)
  }
  
  // Check for CI_PULL_BASE_REF or use baseline file directly
  const baselinePath = process.env.BASELINE_FILE || 
                       path.join(process.cwd(), 'benchmark-results-baseline.json')
  const baseline = loadResults(baselinePath)
  
  if (!baseline) {
    console.log('\n⚠️  No baseline found. This appears to be the first run.')
    console.log('   CI will use current results as baseline for future comparisons.')
    console.log('\n✅ No regressions to report (baseline comparison skipped)')
    process.exit(0)
  }
  
  // Get threshold from environment or use default
  const threshold = parseFloat(process.env.REGRESSION_THRESHOLD) || DEFAULT_THRESHOLD
  
  // Compare
  const results = compareWithBaseline(current, baseline, threshold)
  
  // Print summary and determine exit code
  const passed = printSummary(results, threshold)
  
  if (passed) {
    console.log('\n✅ All metrics within acceptable threshold')
    process.exit(0)
  } else {
    console.log('\n❌ Performance regression detected!')
    console.log('   Please investigate the regressions before merging.')
    process.exit(1)
  }
}

main()