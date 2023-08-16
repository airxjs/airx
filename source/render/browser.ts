import { AirxElement } from '../element'
import { createLogger } from '../logger'
import { InnerAirxComponentContext, Instance as BaseInstance, performUnitOfWork } from './common'

type Instance = BaseInstance<HTMLElement>

interface RenderContext {
  firstRendered: boolean
  rootInstance: Instance
  needCommitDom: boolean
  nextUnitOfWork: Instance | null
}

interface RenderOptions {
  ensureRendered: boolean
}

export function innerRender(element: AirxElement, domRef: HTMLElement, options?: RenderOptions) {
  const rootInstance: Instance = {
    domRef,
    context: new InnerAirxComponentContext()
  }
  rootInstance.context.instance = rootInstance

  const context: RenderContext = {
    rootInstance,
    nextUnitOfWork: null,
    firstRendered: false,
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
  function commitDom(rootInstance: Instance, rootNode?: ChildNode) {
    const logger = createLogger('commitDom')
    logger.debug('commitDom', rootInstance)

    type PropsType = Record<string, unknown>

    function updateDomProperties(dom: HTMLElement, nextProps: PropsType, prevProps: PropsType = {}) {
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

    function getParentDom(instance: Instance): HTMLElement {
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
    function getChildDoms(instance: Instance): HTMLElement[] {
      const domList: HTMLElement[] = []
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

    function commitInstanceDom(nextInstance: Instance, oldNode?: ChildNode) {
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
            nextInstance.domRef = document.createTextNode(textContent as string) as any
          } else if (nextInstance.element.type === 'comment') {
            const textContent = nextInstance.element.props.textContent
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            nextInstance.domRef = document.createComment(textContent as string) as any
          } else {
            nextInstance.domRef = document.createElement(nextInstance.element.type)
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

    function commitWalkV2(initInstance: Instance, initNode?: ChildNode) {
      // 创建一个栈，将根节点压入栈中

      type StackLayer = [Instance, ChildNode | undefined] | (() => void)
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

  function onUpdateRequire() {
    if (context.nextUnitOfWork == null && context.rootInstance.child) {
      context.nextUnitOfWork = context.rootInstance.child
    }
  }

  /**
   * 调度
   */
  function workLoop(deadline?: IdleDeadline) {
    let shouldYield = false
    const logger = createLogger('workLoop')
    while (context.nextUnitOfWork && !shouldYield) {
      logger.debug('nextUnitOfWork', context.nextUnitOfWork)
      context.nextUnitOfWork = performUnitOfWork(context.nextUnitOfWork, onUpdateRequire) as Instance
      if (context.nextUnitOfWork == null) context.needCommitDom = true
      
      // 强制要求首次渲染完成的的情况下必须要等 firstRendered 为 true 再进入时间片剩余检查
      if (options?.ensureRendered !== true && context.firstRendered != true) {
        if (deadline) shouldYield = deadline.timeRemaining() < 1
      }
    }

    if (context.needCommitDom && context.rootInstance.child) {
      commitDom(
        context.rootInstance.child,
        context.rootInstance.domRef?.firstChild || undefined
      )
      context.firstRendered = true
      context.needCommitDom = false
    }

    requestIdleCallback(workLoop)
  }

  // 开始调度
  workLoop()
  return context.rootInstance
}


export function render(element: AirxElement, domRef: HTMLElement) {
  return innerRender(element, domRef)
}
