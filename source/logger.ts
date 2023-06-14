const isDev = localStorage.getItem('airx-dev')
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
