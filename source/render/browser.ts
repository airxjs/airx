import { AirxElement } from '../element'
import { createLogger } from '../logger'
import { PluginContext } from './common/plugins'
import { InnerAirxComponentContext, Instance, performUnitOfWork } from './common'

interface RenderContext {
  rootInstance: Instance
  needCommitDom: boolean
  nextUnitOfWork: Instance | null
}

export function render(pluginContext: PluginContext, element: AirxElement, domRef: Element) {
  const rootInstance: Instance = {
    domRef,
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
  function commitDom(rootInstance: Instance, rootNode?: ChildNode) {
    const logger = createLogger('commitDom')
    logger.debug('commitDom', rootInstance)

    type PropsType = Record<string, unknown>

    function updateDomProperties(dom: Element, nextProps: PropsType, prevProps: PropsType = {}) {
      for (const plugin of pluginContext.plugins) {
        if (plugin.updateDom) plugin.updateDom(dom, nextProps, prevProps)
      }
    }

    function getParentDom(instance: Instance): Element {
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
    function getChildDoms(instance: Instance): Element[] {
      const domList: Element[] = []
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
            nextInstance.domRef = nextInstance.elementNamespace
              ? document.createElementNS(nextInstance.elementNamespace, nextInstance.element.type)
              : document.createElement(nextInstance.element.type)
          }

          if (nextInstance.domRef) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (nextInstance.domRef as any).airxInstance = nextInstance
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
      context.nextUnitOfWork = performUnitOfWork(pluginContext, context.nextUnitOfWork, onUpdateRequire) as Instance
      if (context.nextUnitOfWork == null) context.needCommitDom = true
      if (deadline) shouldYield = deadline.timeRemaining() < 1
    }

    if (context.needCommitDom && context.rootInstance.child) {
      commitDom(context.rootInstance.child,
        context.rootInstance.domRef?.firstChild || undefined
      )
      context.needCommitDom = false
    }

    requestIdleCallback(workLoop)
  }

  // 开始调度
  workLoop()
  return context.rootInstance
}
