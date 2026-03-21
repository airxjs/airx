import { Plugin } from '..'
import { BasicLogic } from '../internal/basic/basic'
import { InjectSystem } from '../internal/inject/inject'

export class PluginContext {
  plugins: Plugin[] = [
    new BasicLogic(),
    new InjectSystem()
  ]

  registerPlugin(...plugins: Plugin[]) {
    this.plugins.push(...plugins)
  }
}
