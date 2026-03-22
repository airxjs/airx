import { Plugin } from '../index.js'
import { BasicLogic } from '../internal/basic/basic.js'
import { InjectSystem } from '../internal/inject/inject.js'

export class PluginContext {
  plugins: Plugin[] = [
    new BasicLogic(),
    new InjectSystem()
  ]

  registerPlugin(...plugins: Plugin[]) {
    this.plugins.push(...plugins)
  }
}
