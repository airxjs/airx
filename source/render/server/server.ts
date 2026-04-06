import { CSSProperties } from '../../types/index.js'
import { AirxElement } from '../../element/index.js'
import { InnerAirxComponentContext, Instance, performUnitOfWork, AbstractElement } from '../basic/common.js'
import { PluginContext } from '../basic/plugins/index.js'

function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, (match, p1, offset) => {
    if (offset === 0) {
      return p1.toLowerCase()
    } else {
      return '-' + p1.toLowerCase()
    }
  })
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
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
    this.innerHTML = ''
    this.attributes = new Map()
  }


  readonly firstChild?: ServerElement
  readonly nextSibling?: ServerElement
  readonly parentNode?: ServerElement

  readonly className: string
  readonly style: CSSProperties
  innerHTML: string
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setAttribute(name: string, value: any) {
    if (value === false || value == null) return this.attributes.delete(name)
    /* eslint-disable @typescript-eslint/ban-ts-comment */
    // @ts-ignore
    if (name === 'class') return this.className = value
    // @ts-ignore
    if (name === 'style') return this.style = value
    /* eslint-enable @typescript-eslint/ban-ts-comment */
    this.attributes.set(name, value === true ? '' : value)
  }

  removeAttribute(name: string) {
    this.attributes.delete(name)
  }

  toString(): string {
    if (this.nodeName === '#text') return escapeHtml(this.content)
    if (this.nodeName === '#comment') return `<!--${this.content}-->`

    const styleString = Object.entries(this.style)
      .map(([key, value]) => `${camelToKebab(key)}:${value}`)
      .join(';')

    const attributes = [...this.attributes.entries()]
    if (styleString.length > 0) attributes.push(['style', styleString])
    if (this.className.length > 0) attributes.push(['class', this.className])
    const attributesString = attributes.map(([name, value]) => ` ${name}="${escapeAttr(String(value))}"`).join('')
    const innerContent = this.innerHTML || this.children.map(child => child.toString()).join('')
    return `<${this.nodeName}${attributesString}>${innerContent}</${this.nodeName}>`
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
    type PropsType = Record<string, unknown>

    function updateDomProperties(dom: ServerElement, nextProps: PropsType, prevProps: PropsType = {}) {
      const isKey = (key: string) => key === 'key'
      const isRef = (key: string) => key === 'ref'
      const isStyle = (key: string) => key === 'style'
      const isClass = (key: string) => key === 'class'
      const isEvent = (key: string) => key.startsWith("on")
      const isChildren = (key: string) => key === 'children'
      const isInnerHTML = (key: string) => key === 'innerHTML'
      const isGone = (_prev: PropsType, next: PropsType) => (key: string) => !(key in next)
      const isNew = (prev: PropsType, next: PropsType) => (key: string) => prev[key] !== next[key]
      const isProperty = (key: string) => !isChildren(key) && !isEvent(key) && !isStyle(key) && !isClass(key) && !isKey(key) && !isRef(key) && !isInnerHTML(key)

      // https://developer.mozilla.org/zh-CN/docs/Web/API/Node
      if (dom.nodeName === '#text' || dom.nodeName === '#comment') {
        const textNode = (dom as unknown as Text | Comment)
        if (textNode.nodeValue !== nextProps.textContent) {
          textNode.nodeValue = String(nextProps.textContent)
        }
        return
      }

      // innerHTML injects raw HTML on server side
      if ('innerHTML' in nextProps || 'innerHTML' in prevProps) {
        /* eslint-disable @typescript-eslint/ban-ts-comment */
        // @ts-ignore
        dom.innerHTML = nextProps.innerHTML == null || nextProps.innerHTML === false ? '' : String(nextProps.innerHTML)
        /* eslint-enable @typescript-eslint/ban-ts-comment */
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
        .forEach(name => {
          const value = nextProps[name]
          if (value === false || value == null) {
            dom.removeAttribute(name)
          } else if (value === true) {
            dom.setAttribute(name, '')
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            dom.setAttribute(name, value as any)
          }
        })
    }

    function getParentDom(instance: Instance<ServerElement>): ServerElement {
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
    function getChildDoms(instance: Instance<ServerElement>): ServerElement[] {
      const domList: ServerElement[] = []
      const todoList: Instance<ServerElement>[] = [instance]

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

    function commitInstanceDom(nextInstance: Instance<ServerElement>, oldNode?: ServerElement) {
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
            nextInstance.domRef = ServerElement.createTextNode(textContent as string) as any
          } else if (nextInstance.element.type === 'comment') {
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

    function commitWalkV2(initInstance: Instance<ServerElement>, initNode?: ServerElement) {
      // 创建一个栈，将根节点压入栈中

      type StackLayer = [Instance<ServerElement>, ServerElement | undefined] | (() => void)
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
