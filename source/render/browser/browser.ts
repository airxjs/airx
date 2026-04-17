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
} from '../basic/common.js'
import { createCommitWalker } from '../basic/commit-walker.js'
import { removeDeletions, insertDomIntoParent } from '../basic/commit-helpers.js'

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
      // 移除标删元素
      removeDeletions(nextInstance)

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
      if (nextInstance.domRef != null) {
        insertDomIntoParent(nextInstance, nextInstance.domRef, oldNode)
      }
    }

    const commitWalk = createCommitWalker<BrowserElement, ChildNode>({
      commitInstanceDom,
      getNextSibling: (instance, node) => instance.domRef?.nextSibling ?? node?.nextSibling,
      getFirstChild: (instance, node) => instance.domRef?.firstChild ?? node,
    })

    commitWalk(rootInstance, rootNode)
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

    // Only schedule follow-up work if there actually is more work
    if (context.nextUnitOfWork != null) {
      scheduleWorkLoop()
    }
  }

  // 开始调度
  workLoop()
  return context.rootInstance
}
