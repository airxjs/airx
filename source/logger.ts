declare const process: { env?: { NODE_ENV?: string } } | undefined
const isDev = typeof process != 'undefined' && process?.env?.NODE_ENV === 'development'

export function createLogger(name: string) {
  function getPrintPrefix() {
    const date = new Date().toLocaleString()
    return `[${date}][${name}]`
  }

  function debug(...args: unknown[]) {
    if (isDev) console.log(getPrintPrefix(), ...args)
  }

  return { debug }
}
