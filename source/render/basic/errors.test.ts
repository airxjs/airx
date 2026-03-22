import { describe, it, expect } from 'vitest'
import { createElement } from '../../element/index.js'
import {
  assertValidChildValue,
  createInvalidChildValueError,
  normalizeComponentReturnValue,
} from './errors.js'

describe('render/basic/errors', () => {
  describe('normalizeComponentReturnValue', () => {
    it('should accept AirxElement', () => {
      const element = createElement('div', {})
      const result = normalizeComponentReturnValue('Demo', element)
      expect(result).toBe(element)
    })

    it('should accept render function', () => {
      const render = () => createElement('div', {})
      const result = normalizeComponentReturnValue('Demo', render)
      expect(result).toBe(render)
    })

    it('should throw friendly message for Promise return value', async () => {
      const promise = Promise.resolve('x')
      expect(() => normalizeComponentReturnValue('AsyncComp', promise)).toThrowError(
        /Async component is not supported yet/
      )
      await promise
    })
  })

  describe('assertValidChildValue', () => {
    it('should accept supported child values', () => {
      expect(() => assertValidChildValue('Component "A"', null)).not.toThrow()
      expect(() => assertValidChildValue('Component "A"', undefined)).not.toThrow()
      expect(() => assertValidChildValue('Component "A"', 'text')).not.toThrow()
      expect(() => assertValidChildValue('Component "A"', 1)).not.toThrow()
      expect(() => assertValidChildValue('Component "A"', true)).not.toThrow()
      expect(() => assertValidChildValue('Component "A"', [createElement('div', {})])).not.toThrow()
      expect(() => assertValidChildValue('Component "A"', createElement('span', {}))).not.toThrow()
    })

    it('should throw for function child', () => {
      expect(() => assertValidChildValue('Component "A"', () => 'bad')).toThrowError(
        /unsupported child value of type function/
      )
    })

    it('should throw for object child', () => {
      expect(() => assertValidChildValue('Component "A"', { bad: true })).toThrowError(
        /unsupported child value of type object/
      )
    })

    it('should include async hint for Promise-like child', async () => {
      const promise = Promise.resolve(1)
      const error = createInvalidChildValueError('Component "A"', promise)
      expect(error.message).toMatch(/Async component is not supported yet/)
      await promise
    })
  })
})
