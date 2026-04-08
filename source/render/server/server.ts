import { CSSProperties } from '../../types/index.js'
import { AirxElement, createElement, AirxComponent } from '../../element/index.js'
import { createLogger } from '../../logger/index.js'
import {
  InnerAirxComponentContext,
  Instance,
  performUnitOfWork,
  AbstractElement,
  INTERNAL_COMMENT_NODE_TYPE,
  INTERNAL_TEXT_NODE_TYPE,
  getParentDom,
  getChildDoms,
} from '../basic/common.js'
import { createCommitWalker } from '../basic/commit-walker.js'
import { PluginContext } from '../basic/plugins/index.js'
import { hydrate as clientHydrate, type HydrateOptions } from '../browser/index.js'

function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, (match, p1, offset) => {
    if (offset === 0) {
      return p1.toLowerCase()
    } else {
      return '-' + p1.toLowerCase()
    }
  })
}

class ServerElement implements AbstractElement {
  static createTextNode(content: string) {
    const dom = new ServerElement('#text')
    dom.content = content
    return dom
  }

  static createComment(content: string) {
    const dom = new ServerElement('#comment')
    dom.content = content
    return dom
  }

  static createElement(tag: string) {
    return new ServerElement(tag)
  }

  constructor(public nodeName: string) {
    this.style = {}
    this.content = ''
    this.children = []
    this.className = ''
    this.attributes = new Map()
  }


  readonly firstChild?: ServerElement
  readonly nextSibling?: ServerElement
  readonly parentNode?: ServerElement

  readonly className: string
  readonly style: CSSProperties
  private content: string
  private children: ServerElement[]
  private attributes: Map<string, string>

  removeChild(dom: ServerElement) {
    /* eslint-disable @typescript-eslint/ban-ts-comment */
    const index = this.children.findIndex(v => v === dom)
    if (index != -1) this.children.splice(index, 1)
    // @ts-ignore
    this.firstChild = undefined
    // @ts-ignore
    this.nextSibling = undefined
    // @ts-ignore
    this.parentNode = undefined
    /* eslint-enable @typescript-eslint/ban-ts-comment */
  }

  appendChild(dom: ServerElement) {
    /* eslint-disable @typescript-eslint/ban-ts-comment */
    // @ts-ignore
    dom.parentNode = this

    if (this.children.length > 0) {
      // @ts-ignore
      this.children[this.children.length - 1].nextSibling = dom
    }

    // @ts-ignore
    this.firstChild = this.children[0]
    this.children.push(dom)
    /* eslint-enable @typescript-eslint/ban-ts-comment */
  }

  insertBefore(dom: ServerElement, refNode: ServerElement | null) {
    /* eslint-disable @typescript-eslint/ban-ts-comment */
    if (refNode === null) {
      return this.appendChild(dom)
    }
    const refIndex = this.children.findIndex(v => v === refNode)
    if (refIndex === -1) {
      return this.appendChild(dom)
    }
    // @ts-ignore
    dom.parentNode = this
    // Update nextSibling of previous sibling
    if (refIndex > 0) {
      // @ts-ignore
      this.children[refIndex - 1].nextSibling = dom
    } else {
      // @ts-ignore
      this.firstChild = dom
    }
    // Set nextSibling of new node to refNode
    // @ts-ignore
    dom.nextSibling = refNode
    this.children.splice(refIndex, 0, dom)
    /* eslint-enable @typescript-eslint/ban-ts-comment */
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setAttribute(name: string, value: any) {
    if (value === '') return this.attributes.delete(name)
    /* eslint-disable @typescript-eslint/ban-ts-comment */
    // @ts-ignore
    if (name === 'class') return this.className = value
    // @ts-ignore
    if (name === 'style') return this.style = value
    /* eslint-enable @typescript-eslint/ban-ts-comment */
    this.attributes.set(name, value)
  }

  removeAttribute(name: string) {
    this.attributes.delete(name)
  }

  toString(): string {
    if (this.nodeName === '#text') return this.content
    if (this.nodeName === '#comment') return this.content

    const styleString = Object.entries(this.style)
      .map(([key, value]) => `${camelToKebab(key)}:${value}`)
      .join(';')

    const attributes = [...this.attributes.entries()]
    if (styleString.length > 0) attributes.push(['style', styleString])
    if (this.className.length > 0) attributes.push(['class', this.className])
    const attributesString = attributes.map(([name, value]) => ` ${name}="${value}"`).join('')
    return `<${this.nodeName}${attributesString}>${this.children.map(child => child.toString()).join('')}</${this.nodeName}>`
  }
}

interface RenderContext {
  rootInstance: Instance<ServerElement>
  needCommitDom: boolean
  nextUnitOfWork: Instance<ServerElement> | null
}

type ServerCompleteHandler = (data: string) => void

export function render(pluginContext: PluginContext, element: AirxElement, onComplete: ServerCompleteHandler) {
  const rootInstance: Instance<ServerElement> = {
    domRef: ServerElement.createElement('div'),
    context: new InnerAirxComponentContext()
  }
  rootInstance.context.instance = rootInstance

  const context: RenderContext = {
    rootInstance,
    nextUnitOfWork: null,
    needCommitDom: false
  }

  const appInstance: Instance<ServerElement> = {
    element,
    parent: context.rootInstance,
    memoProps: { ...element.props },
    context: new InnerAirxComponentContext()
  }

  appInstance.context.instance = appInstance

  context.rootInstance.child = appInstance
  context.nextUnitOfWork = appInstance

  /**
   * 提交 Dom 变化
   */
  function commitDom(rootInstance: Instance<ServerElement>, rootNode?: ServerElement) {
    const logger = createLogger('commitDom')
    logger.debug('commitDom', rootInstance)

    type PropsType = Record<string, unknown>

    function updateDomProperties(dom: ServerElement, nextProps: PropsType, prevProps: PropsType = {}) {
      const isKey = (key: string) => key === 'key'
      const isRef = (key: string) => key === 'ref'
      const isStyle = (key: string) => key === 'style'
      const isClass = (key: string) => key === 'class'
      const isEvent = (key: string) => key.startsWith("on")
      const isChildren = (key: string) => key === 'children'
      const isGone = (_prev: PropsType, next: PropsType) => (key: string) => !(key in next)
      const isNew = (prev: PropsType, next: PropsType) => (key: string) => prev[key] !== next[key]
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
        Object.keys(oldStyle).forEach(key => {
          /* eslint-disable @typescript-eslint/no-explicit-any */
          delete dom.style[key as any]
          /* eslint-enable @typescript-eslint/no-explicit-any */
        })
      }

      // add new style
      const newStyle = nextProps?.style
      if (typeof newStyle === 'object' && newStyle != null) {
        Object.keys(newStyle).forEach((key: unknown) => {
          /* eslint-disable @typescript-eslint/no-explicit-any */
          const value = (newStyle as any)?.[key as any]
          dom.style[key as any] = value == null ? '' : value
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

      // Remove old properties
      Object.keys(prevProps)
        .filter(isProperty)
        .filter(isGone(prevProps, nextProps))
        .forEach(name => dom.removeAttribute(name))

      // Set new or changed properties
      Object.keys(nextProps)
        .filter(isProperty)
        .filter(isNew(prevProps, nextProps))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .forEach(name => dom.setAttribute(name, nextProps[name] as any))
    }

    function commitInstanceDom(nextInstance: Instance<ServerElement>, oldNode?: ServerElement) {
      const getDebugElementName = (instance?: Instance<ServerElement>): string => {
        if (typeof instance?.element?.type === 'string') {
          return `<${instance.element.type}>`
        }

        if (typeof instance?.element?.type === 'function') {
          const componentName = instance.element.type.name || 'AnonymousComponent'
          return `Component(${componentName})`
        }

        return '<unknown>'
      }

      // 移除标删元素
      if (nextInstance.deletions) {
        for (const deletion of nextInstance.deletions) {
          const domList = getChildDoms(deletion)
          for (let index = 0; index < domList.length; index++) {
            const dom = domList[index]
            if (dom && dom.parentNode) dom.parentNode.removeChild(dom)
          }
          deletion.context.triggerUnmounted()
        }

        nextInstance.deletions.clear()
      }

      // 创建 dom
      if (nextInstance.domRef == null) {
        if (nextInstance.element == null) throw new Error('???')
        if (typeof nextInstance.element.type === 'string') {
          if (nextInstance.element.type === INTERNAL_TEXT_NODE_TYPE) {
            const textContent = nextInstance.element.props.textContent
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            nextInstance.domRef = ServerElement.createTextNode(textContent as string) as any
          } else if (nextInstance.element.type === INTERNAL_COMMENT_NODE_TYPE) {
            const textContent = nextInstance.element.props.textContent
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            nextInstance.domRef = ServerElement.createComment(textContent as string) as any
          } else {
            nextInstance.domRef = ServerElement.createElement(nextInstance.element.type)
          }
        }
      }

      // 更新属性
      if (nextInstance.domRef != null && nextInstance.element != null) {
        updateDomProperties(
          nextInstance.domRef,
          nextInstance.element.props,
          nextInstance.beforeElement?.props
        )
      }

      // 插入 parent
      if (nextInstance.domRef != null) {
        if (oldNode !== nextInstance.domRef) {
          const parentDom = getParentDom(nextInstance)
          if (parentDom.nodeName === '#text' || parentDom.nodeName === '#comment') {
            throw new Error(
              `[airx] Invalid DOM hierarchy: cannot append ${getDebugElementName(nextInstance)} to ${getDebugElementName(nextInstance.parent)}. `
              + 'A text/comment node cannot contain child nodes.'
            )
          }

          // 优化：同父节点内移动使用 insertBefore，避免 remove + append
          if (nextInstance.domRef.parentNode === parentDom) {
            parentDom.insertBefore(nextInstance.domRef, oldNode ?? null)
          } else {
            if (nextInstance.domRef.parentNode) {
              nextInstance.domRef.parentNode.removeChild(nextInstance.domRef)
            }
            parentDom.appendChild(nextInstance.domRef)
          }
        }
      }
    }

    const commitWalk = createCommitWalker<ServerElement, ServerElement>({
      commitInstanceDom,
      getNextSibling: (instance, node) => instance.domRef?.nextSibling ?? node?.nextSibling,
      getFirstChild: (instance, node) => instance.domRef?.firstChild ?? node,
    })

    commitWalk(rootInstance, rootNode)
  }

  while (context.nextUnitOfWork) {
    context.nextUnitOfWork = performUnitOfWork<ServerElement>(
      pluginContext,
      context.nextUnitOfWork
    )
  }

  commitDom(
    context.rootInstance.child,
    context.rootInstance.domRef?.firstChild || undefined
  )

  onComplete(context.rootInstance.domRef?.toString() || '')
}

/**
 * SSR 应用实例
 */
export interface SSRApp {
  /**
   * 将应用渲染为 HTML 字符串
   */
  renderToString(): Promise<string>
  /**
   * 客户端激活 SSR 输出的 HTML
   * @param container 服务端渲染时使用的容器元素
   * @param options Hydrate 选项
   */
  hydrate(container: HTMLElement, options?: HydrateOptions): void
}

/**
 * 创建 SSR 应用实例
 * @param element 根组件或根元素
 */
export function createSSRApp(element: AirxElement | AirxComponent): SSRApp {
  const appContext = new PluginContext()

  const ensureAsElement = (element: AirxElement | AirxComponent): AirxElement => {
    if (typeof element === 'function') {
      return createElement(element, {})
    }
    return element
  }

  const rootElement = ensureAsElement(element)

  return {
    renderToString(): Promise<string> {
      return new Promise<string>((resolve) => {
        render(appContext, rootElement, resolve)
      })
    },

    hydrate(container: HTMLElement, options?: HydrateOptions): void {
      const logger = createLogger('SSRApp:hydrate')
      logger.debug('hydrating SSR app', { container, options })
      
      // Use the client-side hydrate function
      clientHydrate(rootElement, container, options)
    }
  }
}

/**
 * 将 SSR 应用渲染为 HTML 字符串
 * @param app SSR 应用实例
 */
export function renderToString(app: SSRApp): Promise<string> {
  return app.renderToString()
}

/**
 * 客户端激活 SSR 输出的 HTML
 * @param _html 服务端渲染的 HTML 字符串（暂未使用，DOM already in container）
 * @param container 容器元素
 * @param app SSR 应用实例
 * @param options Hydrate 选项
 */
export function hydrate(_html: string, container: HTMLElement, app: SSRApp, options?: HydrateOptions): void {
  const logger = createLogger('hydrate')
  logger.debug('top-level hydrate called')
  app.hydrate(container, options)
}

// Re-export HydrateOptions type for public API
export type { HydrateOptions } from '../browser/index.js'

