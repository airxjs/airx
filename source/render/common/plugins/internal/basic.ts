import { AirxChildren, AirxElement, Props } from '../../../../element'
import { createLogger } from '../../../../logger'
import { Instance } from '../../index'
import { Plugin } from '../index'

export class BasicLogic implements Plugin {
  private logger = createLogger('basicLogicPlugin')

  private isSameProps(preProps: Props, nextProps: Props): boolean {
    if (Object.is(nextProps, preProps)) {
      return true
    }

    if (
      typeof preProps !== 'object'
      || typeof nextProps !== 'object'
      || preProps === null
      || nextProps === null
    ) {
      this.logger.debug('props must be an object')
      return false
    }

    // 对应 key 的值不相同返回 false
    const prevKeys = Object.keys(preProps)
    for (let index = 0; index < prevKeys.length; index++) {
      const key = prevKeys[index]
      if (key !== 'children' && key !== 'key') {
        if (!Object.hasOwn(nextProps, key)) return false
        if (!Object.is(preProps[key], nextProps[key])) return false
      }

      if (key === 'children') {
        const prevChildren = preProps['children'] as AirxChildren[]
        const nextChildren = nextProps['children'] as AirxChildren[]
        // children 都是空的，则无需更新
        if (prevChildren.length === 0 && nextChildren.length === 0) return true

        // 简单比较一下 child 的引用
        for (let index = 0; index < prevChildren.length; index++) {
          const prevChild = prevChildren[index]
          const nextChild = nextChildren[index]

          if (prevChild !== nextChild) return false
          if (typeof prevChild !== typeof nextChild) return false
        }
      }

      return true
    }

    return false
  }

  isReRender(instance: Instance): true | void  {
    const nextProps = instance.element?.props
    const preProps = instance.beforeElement?.props
    if (!this.isSameProps(preProps, nextProps)) return true
  }

  updateDom(dom: Element, nextProps: Props, prevProps: Props = {}): void {
    this.logger.debug('updateDom', dom, nextProps, prevProps)
    const isKey = (key: string) => key === 'key'
    const isRef = (key: string) => key === 'ref'
    const isStyle = (key: string) => key === 'style'
    const isClass = (key: string) => key === 'class'
    const isEvent = (key: string) => key.startsWith("on")
    const isChildren = (key: string) => key === 'children'
    const isGone = (_prev: Props, next: Props) => (key: string) => !(key in next)
    const isNew = (prev: Props, next: Props) => (key: string) => prev[key] !== next[key]
    const isProperty = (key: string) => !isChildren(key) && !isEvent(key) && !isStyle(key) && !isClass(key) && !isKey(key) && !isRef(key)

    // https://developer.mozilla.org/zh-CN/docs/Web/API/Node
    if (dom.nodeName === '#text' || dom.nodeName === '#comment') {
      const textNode = (dom as unknown as Text | Comment)
      if (textNode.nodeValue !== nextProps.textContent) {
        textNode.nodeValue = String(nextProps.textContent)
      }
      return
    }

    // remove old style
    const oldStyle = prevProps?.style
    if (typeof oldStyle === 'object' && oldStyle != null) {
      if (!('style' in dom) || !dom.style) return
      Object.keys(oldStyle).forEach(key => {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        if ('style' in dom && dom.style) {
          delete (dom.style as any)[key as any]
          /* eslint-enable @typescript-eslint/no-explicit-any */
        }
      })
    }

    // add new style
    const newStyle = nextProps?.style
    if (typeof newStyle === 'object' && newStyle != null) {
      if (!('style' in dom) || !dom.style) return
      Object.keys(newStyle).forEach((key: unknown) => {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const value = (newStyle as any)?.[key as any];
        (dom.style as any)[key as any] = value == null ? '' : value
        /* eslint-enable @typescript-eslint/no-explicit-any */
      })
    }

    if (dom.className !== nextProps?.class) {
      if (!nextProps?.class) {
        dom.removeAttribute('class')
      } else if (typeof nextProps?.class === 'string') {
        dom.setAttribute('class', nextProps?.class)
      }
    }

    //Remove old or changed event listeners
    Object.keys(prevProps)
      .filter(isEvent)
      .filter(
        key =>
          !(key in nextProps) ||
          isNew(prevProps, nextProps)(key)
      )
      .forEach(name => {
        const eventType = name
          .toLowerCase()
          .substring(2)

        if (prevProps[name] == null) return
        if (typeof prevProps[name] !== 'function') {
          console.error('EventListener is not a function')
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dom.removeEventListener(eventType as any, prevProps[name] as any)
        }
      })

    // Add event listeners
    Object.keys(nextProps)
      .filter(isEvent)
      .filter(isNew(prevProps, nextProps))
      .forEach(name => {
        const eventType = name
          .toLowerCase()
          .substring(2)
        if (nextProps[name] == null) return
        if (typeof nextProps[name] !== 'function') {
          console.error('EventListener is not a function')
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dom.addEventListener(eventType as any, nextProps[name] as any)
        }
      })

    // Remove old properties
    Object.keys(prevProps)
      .filter(isProperty)
      .filter(isGone(prevProps, nextProps))
      .forEach(name => dom.setAttribute(name, ''))

    // Set new or changed properties
    Object.keys(nextProps)
      .filter(isProperty)
      .filter(isNew(prevProps, nextProps))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .forEach(name => dom.setAttribute(name, nextProps[name] as any))
  }

  isReuseInstance(instance: Instance, nextElement: AirxElement): false | void {
    if (instance && instance.element && instance.element.type !== nextElement.type) {
      return false
    }
  }
}
