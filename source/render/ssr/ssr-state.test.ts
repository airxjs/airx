import { describe, it, expect, beforeEach, vi } from 'vitest'
import { type StateSnapshot } from '../browser/hydrate.js'
import {
  registerSSRSignal,
  getRegisteredSignals,
  generateStateSnapshot,
  clearSSRSignals,
  injectStateSnapshotIntoHTML,
  readStateSnapshotFromDOM,
  setSSRVersion
} from './ssr-state.js'

describe('SSR State Module', () => {
  beforeEach(() => {
    clearSSRSignals()
  })

  describe('registerSSRSignal', () => {
    it('should register a signal with its current value', () => {
      const signal = { get: () => 42 }
      registerSSRSignal('counter', signal)

      const signals = getRegisteredSignals()
      expect(signals['counter']).toEqual({ id: 'counter', value: 42 })
    })

    it('should allow registering multiple signals', () => {
      registerSSRSignal('a', { get: () => 'valueA' })
      registerSSRSignal('b', { get: () => 'valueB' })

      const signals = getRegisteredSignals()
      expect(signals['a']).toEqual({ id: 'a', value: 'valueA' })
      expect(signals['b']).toEqual({ id: 'b', value: 'valueB' })
    })
  })

  describe('getRegisteredSignals', () => {
    it('should return empty object when no signals registered', () => {
      const signals = getRegisteredSignals()
      expect(signals).toEqual({})
    })
  })

  describe('generateStateSnapshot', () => {
    it('should generate snapshot with registered signals', () => {
      registerSSRSignal('counter', { get: () => 100 })
      registerSSRSignal('name', { get: () => 'test' })

      const snapshot = generateStateSnapshot()

      expect(snapshot.signals).toHaveProperty('counter')
      expect(snapshot.signals).toHaveProperty('name')
      expect(snapshot.signals['counter'].value).toBe(100)
      expect(snapshot.signals['name'].value).toBe('test')
      expect(snapshot.version).toBeTruthy()
      expect(snapshot.timestamp).toBeTruthy()
    })

    it('should generate snapshot with empty signals when none registered', () => {
      const snapshot = generateStateSnapshot()
      expect(snapshot.signals).toEqual({})
    })
  })

  describe('clearSSRSignals', () => {
    it('should clear all registered signals', () => {
      registerSSRSignal('a', { get: () => 1 })
      registerSSRSignal('b', { get: () => 2 })

      clearSSRSignals()

      const signals = getRegisteredSignals()
      expect(signals).toEqual({})
    })
  })

  describe('injectStateSnapshotIntoHTML', () => {
    it('should inject state snapshot as script tag into HTML', () => {
      const html = '<div>Hello</div>'
      const snapshot = {
        signals: { counter: { id: 'counter', value: 42 } },
        version: '1.0',
        timestamp: 1234567890
      }

      const result = injectStateSnapshotIntoHTML(html, snapshot)

      expect(result).toBe(html + '<script type="airx/ssr-state">{"signals":{"counter":{"id":"counter","value":42}},"version":"1.0","timestamp":1234567890}</script>')
    })

    it('should return original HTML unchanged when signals are empty object', () => {
      const html = '<div>Hello</div>'
      const snapshot = { signals: {}, version: '1.0', timestamp: 1234567890 }

      const result = injectStateSnapshotIntoHTML(html, snapshot)

      // Line 82: returns html unchanged when no signals
      expect(result).toBe(html)
    })

    it('should return original HTML unchanged when signals is null', () => {
      const html = '<div>Hello</div>'
      const snapshot = { signals: null } as unknown as StateSnapshot

      const result = injectStateSnapshotIntoHTML(html, snapshot)

      // Line 82: returns html unchanged when signals is null/undefined
      expect(result).toBe(html)
    })

    it('should handle multiple signals in snapshot', () => {
      const html = '<div>Test</div>'
      const snapshot = {
        signals: {
          'user.name': { id: 'user.name', value: 'Alice' },
          'theme': { id: 'theme', value: 'dark' }
        },
        version: '2.0',
        timestamp: Date.now()
      }

      const result = injectStateSnapshotIntoHTML(html, snapshot)

      expect(result).toContain('user.name')
      expect(result).toContain('Alice')
      expect(result).toContain('theme')
      expect(result).toContain('dark')
    })
  })

  describe('readStateSnapshotFromDOM', () => {
    it('should return null when container has no script tag', () => {
      const container = document.createElement('div')
      container.innerHTML = '<div>No state here</div>'

      const result = readStateSnapshotFromDOM(container)

      // Lines 94-95: returns null when no script tag found
      expect(result).toBeNull()
    })

    it('should return null when script tag has no text content', () => {
      const container = document.createElement('div')
      container.innerHTML = '<script type="airx/ssr-state"></script>'

      const result = readStateSnapshotFromDOM(container)

      // Empty script content should parse to null
      expect(result).toBeNull()
    })

    it('should return null when script contains invalid JSON', () => {
      const container = document.createElement('div')
      container.innerHTML = '<script type="airx/ssr-state">not valid json</script>'

      // Suppress console.warn for this test
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = readStateSnapshotFromDOM(container)

      // Lines 98-100: catch block returns null on parse error
      expect(result).toBeNull()
      expect(warnSpy).toHaveBeenCalledWith('[Airx SSR] Failed to parse state snapshot:', expect.any(Error))

      warnSpy.mockRestore()
    })

    it('should parse valid state snapshot from DOM', () => {
      const container = document.createElement('div')
      const snapshot = { signals: { counter: { id: 'counter', value: 42 } }, version: '1.0', timestamp: 1234567890 }
      container.innerHTML = `<script type="airx/ssr-state">${JSON.stringify(snapshot)}</script>`

      const result = readStateSnapshotFromDOM(container)

      expect(result).toEqual(snapshot)
    })

    it('should handle state snapshot with multiple signals', () => {
      const container = document.createElement('div')
      const snapshot = {
        signals: {
          'counter': { id: 'counter', value: 100 },
          'user.name': { id: 'user.name', value: 'Bob' }
        },
        version: '1.0',
        timestamp: Date.now()
      }
      container.innerHTML = `<script type="airx/ssr-state">${JSON.stringify(snapshot)}</script>`

      const result = readStateSnapshotFromDOM(container)

      expect(result?.signals['counter'].value).toBe(100)
      expect(result?.signals['user.name'].value).toBe('Bob')
    })
  })

  describe('setSSRVersion', () => {
    it('should set the version used in state snapshots', () => {
      setSSRVersion('99.0.0')

      registerSSRSignal('test', { get: () => 'value' })
      const snapshot = generateStateSnapshot()

      expect(snapshot.version).toBe('99.0.0')
    })
  })

  describe('integration: inject and read', () => {
    it('should round-trip state through HTML injection and DOM reading', () => {
      // Register signals
      registerSSRSignal('counter', { get: () => 42 })
      registerSSRSignal('name', { get: () => 'TestUser' })

      // Generate snapshot
      const snapshot = generateStateSnapshot()

      // Inject into HTML
      const html = '<div>Server Rendered</div>'
      const htmlWithState = injectStateSnapshotIntoHTML(html, snapshot)

      // Read back from DOM
      const container = document.createElement('div')
      container.innerHTML = htmlWithState
      const readSnapshot = readStateSnapshotFromDOM(container)

      expect(readSnapshot).toBeTruthy()
      expect(readSnapshot!.signals['counter'].value).toBe(42)
      expect(readSnapshot!.signals['name'].value).toBe('TestUser')
    })
  })
})