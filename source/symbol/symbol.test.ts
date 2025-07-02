import { describe, it, expect } from 'vitest'
import { airxElementSymbol, airxReactiveDependenciesSymbol } from './symbol'

describe('Symbol Module', () => {
  describe('airxElementSymbol', () => {
    it('should be a symbol', () => {
      expect(typeof airxElementSymbol).toBe('symbol')
    })

    it('should have correct description', () => {
      expect(airxElementSymbol.toString()).toBe('Symbol(airx-element)')
    })

    it('should be unique', () => {
      const anotherSymbol = Symbol('airx-element')
      expect(airxElementSymbol).not.toBe(anotherSymbol)
    })
  })

  describe('airxReactiveDependenciesSymbol', () => {
    it('should be a symbol', () => {
      expect(typeof airxReactiveDependenciesSymbol).toBe('symbol')
    })

    it('should have correct description', () => {
      expect(airxReactiveDependenciesSymbol.toString()).toBe('Symbol(airx-dependencies)')
    })

    it('should be unique', () => {
      const anotherSymbol = Symbol('airx-dependencies')
      expect(airxReactiveDependenciesSymbol).not.toBe(anotherSymbol)
    })
  })

  describe('symbols uniqueness', () => {
    it('should be different from each other', () => {
      expect(airxElementSymbol).not.toBe(airxReactiveDependenciesSymbol)
    })
  })
})
