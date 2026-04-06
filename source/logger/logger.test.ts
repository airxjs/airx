import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as loggerModule from './logger.js'
const { createLogger } = loggerModule

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
    (loggerModule as any).setLogLevel('none');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).process = originalProcess
  })

  describe('createLogger', () => {
    it('should create a logger with debug, info, and warn methods', () => {
      const logger = createLogger('test')
      expect(logger).toHaveProperty('debug')
      expect(logger).toHaveProperty('info')
      expect(logger).toHaveProperty('warn')
      expect(typeof logger.debug).toBe('function')
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.warn).toBe('function')
    })

    it('should not log when level is none (default)', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).process = { env: { NODE_ENV: 'production' } }
      const logger = createLogger('test')
      logger.debug('should not log')
      logger.info('should not log')
      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('should not log when NODE_ENV is not development (env fallback)', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).process = {
        env: { NODE_ENV: 'production', AIRX_DEBUG: 'true' }
      }
      const logger = createLogger('test')
      logger.debug('test message')
      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('should not log when AIRX_DEBUG is not true (env fallback)', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).process = {
        env: { NODE_ENV: 'development', AIRX_DEBUG: 'false' }
      }
      const logger = createLogger('test')
      logger.debug('test message')
      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('should log debug when env vars enable it', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).process = {
        env: { NODE_ENV: 'development', AIRX_DEBUG: 'true' }
      }
      const logger = createLogger('test')
      logger.debug('test message', 'arg1', 'arg2')
      expect(consoleSpy).toHaveBeenCalledTimes(1)
      const callArgs = consoleSpy.mock.calls[0]
      expect(callArgs[0]).toMatch(/^\[.*\]\[test\]$/)
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
        env: { NODE_ENV: 'development', AIRX_DEBUG: 'true' }
      }
      const logger = createLogger('MyLogger')
      logger.debug('test message')
      expect(consoleSpy).toHaveBeenCalledTimes(1)
      expect(consoleSpy.mock.calls[0][0]).toMatch(/^\[.*\]\[MyLogger\]$/)
    })

    it('should support multiple arguments', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).process = {
        env: { NODE_ENV: 'development', AIRX_DEBUG: 'true' }
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

    it('should log info via console.info when level >= info', () => {
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(loggerModule as any).setLogLevel('info')
      const logger = createLogger('test')
      logger.info('info message')
      expect(infoSpy).toHaveBeenCalledTimes(1)
      expect(infoSpy.mock.calls[0][0]).toMatch(/^\[.*\]\[test\]$/)
      expect(infoSpy.mock.calls[0][1]).toBe('info message')
      infoSpy.mockRestore()
    })

    it('should log warn via console.warn when level >= warn', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(loggerModule as any).setLogLevel('warn')
      const logger = createLogger('test')
      logger.warn('warn message')
      expect(warnSpy).toHaveBeenCalledTimes(1)
      expect(warnSpy.mock.calls[0][0]).toMatch(/^\[.*\]\[test\]$/)
      expect(warnSpy.mock.calls[0][1]).toBe('warn message')
      warnSpy.mockRestore()
    })

    it('should not output debug/info when level is warn', () => {
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(loggerModule as any).setLogLevel('warn')
      const logger = createLogger('test')
      logger.debug('debug message')
      logger.info('info message')
      expect(consoleSpy).not.toHaveBeenCalled()
      expect(infoSpy).not.toHaveBeenCalled()
      infoSpy.mockRestore()
    })

    it('should output all levels when setLogLevel is debug', () => {
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(globalThis as any).process = { env: { NODE_ENV: 'production' } }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(loggerModule as any).setLogLevel('debug')
      const logger = createLogger('test')
      logger.warn('w')
      logger.info('i')
      logger.debug('d')
      expect(warnSpy).toHaveBeenCalledTimes(1)
      expect(infoSpy).toHaveBeenCalledTimes(1)
      expect(consoleSpy).toHaveBeenCalledTimes(1)
      infoSpy.mockRestore()
      warnSpy.mockRestore()
    })

    it('should not log after setLogLevel(none)', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).process = { env: { NODE_ENV: 'production' } }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (loggerModule as any).setLogLevel('debug')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (loggerModule as any).setLogLevel('none')
      const logger = createLogger('test')
      logger.debug('should not appear')
      expect(consoleSpy).not.toHaveBeenCalled()
    })
  })
})
