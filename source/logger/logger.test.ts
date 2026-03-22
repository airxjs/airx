import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLogger } from './logger.js'

describe('Logger Module', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>
  let originalProcess: unknown

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
    originalProcess = (globalThis as any).process
  })

  afterEach(() => {
    consoleSpy.mockRestore();
       // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).process = originalProcess
  })

  describe('createLogger', () => {
    it('should create a logger with the given name', () => {
      const logger = createLogger('test')
      expect(logger).toHaveProperty('debug')
      expect(typeof logger.debug).toBe('function')
    })

    it('should not log when NODE_ENV is not development', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).process = {
        env: {
          NODE_ENV: 'production',
          AIRX_DEBUG: 'true'
        }
      }

      const logger = createLogger('test')
      logger.debug('test message')

      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('should not log when AIRX_DEBUG is not true', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).process = {
        env: {
          NODE_ENV: 'development',
          AIRX_DEBUG: 'false'
        }
      }

      const logger = createLogger('test')
      logger.debug('test message')

      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('should log when both NODE_ENV is development and AIRX_DEBUG is true', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).process = {
        env: {
          NODE_ENV: 'development',
          AIRX_DEBUG: 'true'
        }
      }

      const logger = createLogger('test')
      logger.debug('test message', 'arg1', 'arg2')

      expect(consoleSpy).toHaveBeenCalledTimes(1)
      const callArgs = consoleSpy.mock.calls[0]
      expect(callArgs[0]).toMatch(/^\[.*\]\[test\]$/) // timestamp and logger name
      expect(callArgs[1]).toBe('test message')
      expect(callArgs[2]).toBe('arg1')
      expect(callArgs[3]).toBe('arg2')
    })

    it('should not log when process is undefined', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).process = undefined

      const logger = createLogger('test')
      logger.debug('test message')

      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('should include timestamp and logger name in log prefix', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).process = {
        env: {
          NODE_ENV: 'development',
          AIRX_DEBUG: 'true'
        }
      }

      const logger = createLogger('MyLogger')
      logger.debug('test message')

      expect(consoleSpy).toHaveBeenCalledTimes(1)
      const prefix = consoleSpy.mock.calls[0][0]
      expect(prefix).toMatch(/^\[.*\]\[MyLogger\]$/)
    })

    it('should support multiple arguments', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).process = {
        env: {
          NODE_ENV: 'development',
          AIRX_DEBUG: 'true'
        }
      }

      const logger = createLogger('test')
      const obj = { key: 'value' }
      const arr = [1, 2, 3]

      logger.debug('message', obj, arr, 42, true)

      expect(consoleSpy).toHaveBeenCalledTimes(1)
      const callArgs = consoleSpy.mock.calls[0]
      expect(callArgs[1]).toBe('message')
      expect(callArgs[2]).toBe(obj)
      expect(callArgs[3]).toBe(arr)
      expect(callArgs[4]).toBe(42)
      expect(callArgs[5]).toBe(true)
    })
  })
})
