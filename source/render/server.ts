import { CSSProperties } from '..'
import { AirxElement } from '../element'
import { createLogger } from '../logger'
import { InnerAirxComponentContext, Instance as BaseInstance, performUnitOfWork } from './common'

function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, (match, p1, offset) => {
    if (offset === 0) {
      return p1.toLowerCase()
    } else {
      return '-' + p1.toLowerCase()
    }
  })
}

class SsrHTMLElement {
  static createTextNode(content: string) {
    const dom = new SsrHTMLElement('#text')
    dom.content = content
    return dom
  }

  static createComment(content: string) {
    const dom = new SsrHTMLElement('#comment')
    dom.content = content
    return dom
  }

  static createElement(tag: string) {
    return new SsrHTMLElement(tag)
  }

  constructor(public nodeName: string) {
    this.style = {}
    this.content = ''
    this.children = []
    this.className = ''
    this.attributes = new Map()
  }


  readonly firstChild?: SsrHTMLElement
  readonly nextSibling?: SsrHTMLElement
  readonly parentNode?: SsrHTMLElement

  readonly className: string
  readonly style: CSSProperties
  private content: string
  private children: SsrHTMLElement[]
  private attributes: Map<string, string>

  removeChild(dom: SsrHTMLElement) {
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

  appendChild(dom: SsrHTMLElement) {
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

    const className = this.className.length > 0 ? `class="${this.className}"` : ''
    const styleString = Object.entries(this.style).map(([key, value]) => `${camelToKebab(key)}:${value}`).join(';')
    const style = styleString.length > 0 ? `style="${styleString}"` : ''
    const attributes = Array.from(this.attributes.entries()).map(([name, value]) => `${name}="${value}"`).join(' ')
    return `<${this.nodeName} ${className} ${style} ${attributes}>${this.children.map(child => child.toString()).join('')}</${this.nodeName}>`
  }
}

type Instance = BaseInstance<SsrHTMLElement>

interface RenderContext {
  rootInstance: Instance
  needCommitDom: boolean
  nextUnitOfWork: Instance | null
}

export function render(element: AirxElement, domRef?: SsrHTMLElement) {
  const rootInstance: Instance = {
    domRef: SsrHTMLElement.createElement('div') || domRef,
    context: new InnerAirxComponentContext()
  }
  rootInstance.context.instance = rootInstance

  const context: RenderContext = {
    rootInstance,
    nextUnitOfWork: null,
    needCommitDom: false
  }

  const appInstance: Instance = {
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
  function commitDom(rootInstance: Instance, rootNode?: SsrHTMLElement) {
    const logger = createLogger('commitDom')
    logger.debug('commitDom', rootInstance)

    type PropsType = Record<string, unknown>

    function updateDomProperties(dom: SsrHTMLElement, nextProps: PropsType, prevProps: PropsType = {}) {
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

      // //Remove old or changed event listeners
      // Object.keys(prevProps)
      //   .filter(isEvent)
      //   .filter(
      //     key =>
      //       !(key in nextProps) ||
      //       isNew(prevProps, nextProps)(key)
      //   )
      //   .forEach(name => {
      //     const eventType = name
      //       .toLowerCase()
      //       .substring(2)

      //     if (prevProps[name] == null) return
      //     if (typeof prevProps[name] !== 'function') {
      //       console.error('EventListener is not a function')
      //     } else {
      //       // eslint-disable-next-line @typescript-eslint/no-explicit-any
      //       dom.removeEventListener(eventType as any, prevProps[name] as any)
      //     }
      //   })

      // // Add event listeners
      // Object.keys(nextProps)
      //   .filter(isEvent)
      //   .filter(isNew(prevProps, nextProps))
      //   .forEach(name => {
      //     const eventType = name
      //       .toLowerCase()
      //       .substring(2)
      //     if (nextProps[name] == null) return
      //     if (typeof nextProps[name] !== 'function') {
      //       console.error('EventListener is not a function')
      //     } else {
      //       // eslint-disable-next-line @typescript-eslint/no-explicit-any
      //       dom.addEventListener(eventType as any, nextProps[name] as any)
      //     }
      //   })

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

    function getParentDom(instance: Instance): SsrHTMLElement {
      if (instance.parent?.domRef != null) {
        return instance.parent.domRef
      }
      if (instance.parent) {
        return getParentDom(instance.parent)
      }

      throw new Error('Cant find dom')
    }

    /**
     * 查找 instance 下所有的一级 dom
     * @param instance 
     * @returns 
     */
    function getChildDoms(instance: Instance): SsrHTMLElement[] {
      const domList: SsrHTMLElement[] = []
      const todoList: Instance[] = [instance]

      while (todoList.length > 0) {
        const current = todoList.pop()

        // 找到真实 dom 直接提交
        if (current?.domRef != null) {
          domList.push(current.domRef)
        }

        // 有子节点但是无真实 dom，向下继续查找
        if (current?.domRef == null) {
          if (current?.child != null) {
            todoList.push(current.child)
          }
        }

        // 可能有兄弟节点，则需要继续查找
        if (current?.sibling != null) {
          todoList.push(current.sibling)
        }
      }

      return domList
    }

    function commitInstanceDom(nextInstance: Instance, oldNode?: SsrHTMLElement) {
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
          if (nextInstance.element.type === 'text') {
            const textContent = nextInstance.element.props.textContent
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            nextInstance.domRef = SsrHTMLElement.createTextNode(textContent as string) as any
          } else if (nextInstance.element.type === 'comment') {
            const textContent = nextInstance.element.props.textContent
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            nextInstance.domRef = SsrHTMLElement.createComment(textContent as string) as any
          } else {
            nextInstance.domRef = SsrHTMLElement.createElement(nextInstance.element.type)
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
      // TODO: 针对仅移动时优化
      if (nextInstance.domRef != null) {
        if (oldNode !== nextInstance.domRef) {
          if (nextInstance.domRef.parentNode) {
            nextInstance.domRef.parentNode.removeChild(nextInstance.domRef)
          }

          const parentDom = getParentDom(nextInstance)
          parentDom.appendChild(nextInstance.domRef)
        }
      }
    }

    function commitWalkV2(initInstance: Instance, initNode?: SsrHTMLElement) {
      // 创建一个栈，将根节点压入栈中

      type StackLayer = [Instance, SsrHTMLElement | undefined] | (() => void)
      const stack: StackLayer[] = [[initInstance, initNode]]

      while (stack.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const stackLayer = stack.pop()!
        if (typeof stackLayer === 'function') {
          stackLayer()
          continue
        }

        const [instance, node] = stackLayer
        commitInstanceDom(instance, node)

        // stack 是先入后出
        // 实际上是先渲染 child
        // 这里然后再渲染 sibling

        // 执行生命周期的 Mount
        stack.push(() => instance.context.triggerMounted())

        // 更新下一个兄弟节点
        if (instance.sibling != null) {
          const siblingNode = instance.domRef
            ? instance.domRef.nextSibling
            : node?.nextSibling

          stack.push([instance.sibling, siblingNode || undefined])
        }

        // 更新下一个子节点
        if (instance.child != null) {
          const childNode = instance.domRef
            ? instance.domRef.firstChild
            : node

          stack.push([instance.child, childNode || undefined])
        }
      }
    }

    commitWalkV2(rootInstance, rootNode)
  }

  while (context.nextUnitOfWork) {
    context.nextUnitOfWork = performUnitOfWork(
      context.nextUnitOfWork as unknown as BaseInstance
    ) as unknown as Instance
  }

  commitDom(
    context.rootInstance.child,
    context.rootInstance.domRef?.firstChild || undefined
  )

  return context.rootInstance.domRef?.toString()
}
