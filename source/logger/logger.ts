declare const process: { env?: { NODE_ENV?: string, AIRX_DEBUG?: string } } | undefined

export type LogLevel = 'none' | 'warn' | 'info' | 'debug'

const levelOrder: Record<LogLevel, number> = { none: 0, warn: 1, info: 2, debug: 3 }

let runtimeLevel: LogLevel = 'none'

export function setLogLevel(level: LogLevel): void {
  runtimeLevel = level
}

function getEffectiveLevel(): LogLevel {
  if (runtimeLevel !== 'none') return runtimeLevel
  if (typeof process != 'undefined'
    && process?.env?.NODE_ENV === 'development'
    && process?.env?.AIRX_DEBUG === 'true') {
    return 'debug'
  }
  return 'none'
}

function shouldPrint(level: LogLevel) {
  return levelOrder[getEffectiveLevel()] >= levelOrder[level]
}

export function createLogger(name: string) {
  function getPrintPrefix() {
    const date = new Date().toLocaleString()
    return `[${date}][${name}]`
  }

  function debug(...args: unknown[]) {
    if (shouldPrint('debug')) console.log(getPrintPrefix(), ...args)
  }

  function info(...args: unknown[]) {
    if (shouldPrint('info')) console.info(getPrintPrefix(), ...args)
  }

  function warn(...args: unknown[]) {
    if (shouldPrint('warn')) console.warn(getPrintPrefix(), ...args)
  }

  return { debug, info, warn }
}
