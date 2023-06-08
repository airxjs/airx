const logger = false

export function createLogger(name: string) {
  function getPrintPrefix() {
    const date = new Date().toLocaleString()
    return `[${date}][${name}]`
  }

  function log(...args: any[]) {
    if (!logger) return
    console.log(getPrintPrefix(), ...args)
  }

  return { log }
}
