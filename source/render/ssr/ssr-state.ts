/**
 * SSR State Management Module
 * 
 * Handles Signal state serialization during SSR (server-side render)
 * and state restoration during client-side hydration.
 * 
 * @experimental
 */

import type { StateSnapshot } from '../browser/hydrate.js'

// Global registry for SSR Signal tracking
// Key: signal ID (string), Value: the Signal.State instance
const ssrSignalRegistry = new Map<string, { value: unknown }>()

let ssrVersion = '0.7.10'

/**
 * Set the Airx version for state snapshots
 */
export function setSSRVersion(version: string): void {
  ssrVersion = version
}

/**
 * Register a Signal for SSR state tracking.
 * During SSR, call this to register Signal.State instances whose
 * values should be serialized into the HTML.
 * 
 * @param id Unique identifier for the signal (e.g., 'counter' or 'user.name')
 * @param signal The Signal.State instance to track
 * @returns The value to use (for immediate serialization)
 */
export function registerSSRSignal(id: string, signal: { get(): unknown }): void {
  ssrSignalRegistry.set(id, { value: signal.get() })
}

/**
 * Get all registered SSR signals as a serializable map.
 * Used during renderToString to generate the state snapshot.
 */
export function getRegisteredSignals(): Record<string, { id: string; value: unknown }> {
  const result: Record<string, { id: string; value: unknown }> = {}
  ssrSignalRegistry.forEach((data, key) => {
    result[key] = { id: key, value: data.value }
  })
  return result
}

/**
 * Generate a complete StateSnapshot for SSR.
 * Call this after rendering completes to get the state to inject into HTML.
 */
export function generateStateSnapshot(): StateSnapshot {
  return {
    signals: getRegisteredSignals(),
    version: ssrVersion,
    timestamp: Date.now()
  }
}

/**
 * Clear all registered signals.
 * Call this before starting a new SSR render to avoid stale state.
 */
export function clearSSRSignals(): void {
  ssrSignalRegistry.clear()
}

/**
 * Inject state snapshot into HTML as a script tag.
 * Returns the modified HTML with the state snapshot appended.
 * If snapshot has no signals, returns original HTML unchanged.
 */
export function injectStateSnapshotIntoHTML(html: string, snapshot: StateSnapshot): string {
  // Only inject if there are actual signals to restore
  if (!snapshot.signals || Object.keys(snapshot.signals).length === 0) {
    return html
  }
  const script = `<script type="airx/ssr-state">${JSON.stringify(snapshot)}</script>`
  return html + script
}

/**
 * Read state snapshot from a container's HTML.
 * Looks for the <script type="airx/ssr-state"> tag and parses it.
 */
export function readStateSnapshotFromDOM(container: HTMLElement): StateSnapshot | null {
  const script = container.querySelector('script[type="airx/ssr-state"]')
  if (!script) {
    return null
  }
  
  try {
    const text = script.textContent || ''
    return JSON.parse(text) as StateSnapshot
  } catch (e) {
    console.warn('[Airx SSR] Failed to parse state snapshot:', e)
    return null
  }
}
