declare const process: { env?: { NODE_ENV?: string, AIRX_DEBUG?: string } } | undefined

function shouldPrintLogs() {
  return typeof process != 'undefined'
    && process?.env?.NODE_ENV === 'development'
    && process?.env?.AIRX_DEBUG === 'true'
}

export function createLogger(name: string) {
  function getPrintPrefix() {
    const date = new Date().toLocaleString()
    return `[${date}][${name}]`
  }

  function debug(...args: unknown[]) {
    if (shouldPrintLogs()) console.log(getPrintPrefix(), ...args)
  }

  return { debug }
}
