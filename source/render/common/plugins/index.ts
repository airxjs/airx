import type { Instance } from '..'
import { AirxElement, Props } from '../../../element'

export { PluginContext } from './context'

export interface Plugin {
  /**
   * 检查是否需要重新渲染
   * 只要任意一个插件返回了 true，就一定会重新渲染，如果返回 void，则继续交给其他插件判断
   */
  isReRender?(instance: Instance): true | void

  /**
   * dom 更新方法
   */
  updateDom?(dom: Element, nextProps: Props, prevProps?: Props): void

  /**
 * 检查是否需要重新创建实例
   * 只要任意一个插件返回了 false，就一定会重新创建实例，如果返回 void，则继续交给其他插件判断
 */
  isReuseInstance?(instance: Instance, nextElement: AirxElement): false | void
}
