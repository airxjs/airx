import { Plugin } from './plugin'

export class RenderContext {
  plugins: Plugin[] = []

  registerPlugin(...plugins: Plugin[]) {
    this.plugins.push(...plugins)
  }
}
