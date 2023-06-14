const isDev = process.env.NODE_ENV === 'development'
export function createLogger(name: string) {
  function getPrintPrefix() {
    const date = new Date().toLocaleString()
    return `[${date}][${name}]`
  }

  function debug(...args: unknown[]) {
    if (!isDev) return
    console.log(getPrintPrefix(), ...args)
  }

  return { debug }
}
