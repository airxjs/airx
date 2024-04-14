import { Plugin } from '..'
import { Instance } from '../..'

export class InjectSystem implements Plugin {
  private getProvideValueForParent(instance: Instance | undefined, key: unknown): unknown {
    if (instance && instance.context) {
      const value = instance.context.providedMap.get(key)
      if (value != undefined) return value
      if (instance.parent) {
        return this.getProvideValueForParent(instance.parent, key)
      }
    }

    return undefined
  }

  isReuseInstance(instance: Instance): false | undefined {
    const injectedKeys = [...instance.context.injectedMap.keys()]
    for (let index = 0; index < injectedKeys.length; index++) {
      const key = injectedKeys[index]
      const currentValue = instance.context.injectedMap.get(key)
      const parentValue = this.getProvideValueForParent(instance.parent, key)

      // 如果发现任何值发生变化，则重建实例
      if (parentValue !== currentValue) return false
    }
  }
}
