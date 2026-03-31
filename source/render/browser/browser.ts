import { AirxElement } from '../../element/index.js'
import { createLogger } from '../../logger/index.js'
import { PluginContext } from '../basic/plugins/index.js'
import {
  AbstractElement,
  InnerAirxComponentContext,
  INTERNAL_COMMENT_NODE_TYPE,
  INTERNAL_TEXT_NODE_TYPE,
  Instance,
  performUnitOfWork,
  getParentDom,
  getChildDoms,
} from '../basic/common.js'

class BrowserElement extends Element implements AbstractElement {}

interface RenderContext {
  rootInstance: Instance<BrowserElement>
  needCommitDom: boolean
  nextUnitOfWork: Instance<BrowserElement> | null
  isWorkLoopScheduled: boolean
}

function createIdleDeadline(): IdleDeadline {
  return {
    didTimeout: false,
    timeRemaining: () => Number.MAX_SAFE_INTEGER
  }
}

function scheduleIdleWork(callback: (deadline: IdleDeadline) => void) {
  if (typeof globalThis.requestIdleCallback === 'function') {
    globalThis.requestIdleCallback(callback)
    return
  }

  globalThis.setTimeout(() => callback(createIdleDeadline()), 0)
}

export function render(pluginContext: PluginContext, element: AirxElement, domRef: BrowserElement) {
  const rootInstance: Instance<BrowserElement> = {
    domRef,
    context: new InnerAirxComponentContext()
  }
  rootInstance.context.instance = rootInstance

  const context: RenderContext = {
    rootInstance,
    nextUnitOfWork: null,
    needCommitDom: false,
    isWorkLoopScheduled: false
  }

  const appInstance: Instance<BrowserElement> = {
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
  function commitDom(rootInstance: Instance<BrowserElement>, rootNode?: ChildNode) {
    const logger = createLogger('commitDom')
    logger.debug('commitDom', rootInstance)

    type PropsType = Record<string, unknown>

    function updateDomProperties(dom: BrowserElement, nextProps: PropsType, prevProps: PropsType = {}) {
      for (const plugin of pluginContext.plugins) {
        if (plugin.updateDom) plugin.updateDom(dom, nextProps, prevProps)
      }
    }

    function commitInstanceDom(nextInstance: Instance<BrowserElement>, oldNode?: ChildNode) {
      const getDebugElementName = (instance?: Instance<BrowserElement>): string => {
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
            nextInstance.domRef = document.createTextNode(textContent as string) as any
          } else if (nextInstance.element.type === INTERNAL_COMMENT_NODE_TYPE) {
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
          if (
            parentDom.nodeType === Node.TEXT_NODE
            || parentDom.nodeType === Node.COMMENT_NODE
          ) {
            const parentInstance = (parentDom as { airxInstance?: Instance<BrowserElement> }).airxInstance
            throw new Error(
              `[airx] Invalid DOM hierarchy: cannot append ${getDebugElementName(nextInstance)} to ${getDebugElementName(parentInstance)}. `
              + 'A text/comment node cannot contain child nodes.'
            )
          }

          parentDom.appendChild(nextInstance.domRef)
        }
      }
    }

    function commitWalkV2(initInstance: Instance<BrowserElement>, initNode?: ChildNode) {
      // 创建一个栈，将根节点压入栈中

      type StackLayer = [Instance<BrowserElement>, ChildNode | undefined] | (() => void)
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

  function scheduleWorkLoop() {
    if (context.isWorkLoopScheduled || context.nextUnitOfWork == null) {
      return
    }

    context.isWorkLoopScheduled = true
    scheduleIdleWork(deadline => {
      context.isWorkLoopScheduled = false
      workLoop(deadline)
    })
  }

  function onUpdateRequire() {
    if (context.nextUnitOfWork == null && context.rootInstance.child) {
      context.nextUnitOfWork = context.rootInstance.child
    }

    scheduleWorkLoop()
  }

  /**
   * 调度
   */
  function workLoop(deadline: IdleDeadline = createIdleDeadline()) {
    let shouldYield = false
    const logger = createLogger('workLoop')
    while (context.nextUnitOfWork && !shouldYield) {
      logger.debug('nextUnitOfWork', context.nextUnitOfWork)
      context.nextUnitOfWork = performUnitOfWork(pluginContext, context.nextUnitOfWork, onUpdateRequire) as Instance<BrowserElement>
      if (context.nextUnitOfWork == null) context.needCommitDom = true
      if (deadline) shouldYield = deadline.timeRemaining() < 1
    }

    if (context.needCommitDom && context.rootInstance.child) {
      commitDom(context.rootInstance.child,
        context.rootInstance.domRef?.firstChild || undefined
      )
      context.needCommitDom = false
    }

    scheduleWorkLoop()
  }

  // 开始调度
  workLoop()
  return context.rootInstance
}
