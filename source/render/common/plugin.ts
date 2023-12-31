import { Instance } from '.'
import { AirxElement } from '../../element'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Plugin {
  shouldReuseDom(instance: Instance, nextElement: AirxElement): boolean
  shouldReuseElement(): boolean
}
