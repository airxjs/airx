import { createCollector, createRef, Ref, watch } from './reactive'
import {
  AirxElement,
  AirxChildren,
  createElement,
  isValidElement,
  AirxComponentRender,
  AirxComponentContext,
  AirxComponentMountedListener,
  AirxComponentUnmountedListener
} from './element'
import { createLogger } from './logger'

interface GlobalContext {
  current: AirxComponentContext | null
}

const globalContext: GlobalContext = {
  current: null
}

export function useContext(): AirxComponentContext {
  if (globalContext.current == null) {
    throw new Error('Unable to find a valid component context')
  }

  return globalContext.current
}

export const onMounted: AirxComponentContext['onMounted'] = (listener) => {
  return useContext().onMounted(listener)
}

export const onUnmounted: AirxComponentContext['onUnmounted'] = (listener) => {
  return useContext().onUnmounted(listener)
}

export const inject: AirxComponentContext['inject'] = (key) => {
  return useContext().inject(key)
}

export const provide: AirxComponentContext['provide'] = (key, value) => {
  return useContext().provide(key, value)
}

export type Disposer = () => void

class InnerAirxComponentContext implements AirxComponentContext {
  public instance?: Instance
  private disposers = new Set<Disposer>()
  private providedMap = new Map<unknown, Ref<unknown>>()
  private injectedMap = new Map<unknown, Ref<unknown>>()
  private mountListeners = new Set<AirxComponentMountedListener>()
  private unmountedListeners = new Set<AirxComponentUnmountedListener>()

  public triggerMounted() {
    this.mountListeners.forEach(listener => {
      let disposer: Disposer | null = null

      try {
        disposer = listener()
      } catch (err: unknown) {
        console.error(err, listener)
      }

      if (typeof disposer === 'function') {
        this.addDisposer(disposer)
      }
    })
    // 生命周期只会调用一次
    this.mountListeners.clear()
  }

  public triggerUnmounted() {
    this.unmountedListeners.forEach(listener => {
      try {
        listener()
      } catch (err: unknown) {
        console.error(err, listener)
      }
    })
    // 生命周期只会调用一次
    this.mountListeners.clear()
  }

  public onMounted(listener: AirxComponentMountedListener) {
    this.mountListeners.add(listener)
  }

  public onUnmounted(listener: AirxComponentUnmountedListener) {
    this.unmountedListeners.add(listener)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public provide<T = unknown>(key: any, value: any): (v: T) => void {
    console.log('provide')
    if (!this.providedMap.has(key)) {
      this.providedMap.set(key, createRef(value))
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const ref = this.providedMap.get(key)!
    ref.value = value
    return newValue => ref.value = newValue
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public inject<T = unknown>(key: any): Ref<T | null> {
    console.log('inject')

    if (!this.injectedMap.has(key)) {
      this.injectedMap.set(key, createRef(null))
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const resultRef = this.injectedMap.get(key)!

    /**
     * 从当前组件开始向上查找
     * @returns 返回找到的值的 Ref 和提供该值的实例
     */
    const getResultOfContext = () => {
      let provider: Instance | null = null
      let result: Ref<unknown> | null = null
      let nextParentInstance = this.instance
      while (nextParentInstance != null) {
        provider = nextParentInstance
        result = nextParentInstance.context.providedMap.get(key) || null
        if (result != null) break
        nextParentInstance = nextParentInstance.parent
      }

      return { result, provider }
    }

    const { result, provider } = getResultOfContext()

    if (result != null && provider != null) {
      // 每当值发生变化，同步到当前的 Ref 上
      this.addDisposer(watch(result, () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resultRef.value = result.value as any
      }))
    }

    resultRef.value = result?.value
    return resultRef as Ref<T | null>
  }

  addDisposer(...disposers: Disposer[]) {
    disposers.forEach(disposer => {
      this.disposers.add(disposer)
    })
  }

  dispose() {
    this.disposers.forEach(
      (disposer: Disposer) => {
        try {
          disposer()
        } catch (err: unknown) {
          // eslint-disable-next-line no-console
          console.error(err, disposer)
        }
      }
    )

    this.disposers.clear()
    this.injectedMap.clear()
    this.providedMap.clear()
    this.mountListeners.clear()
    this.unmountedListeners.clear()
  }

  /**
   * 当 context 传递给外部消费时，隐藏内部实现，仅暴露接口定义的内容
   * @returns 和 AirxComponentContext 接口完全一致的对象
   */
  public getSafeContext(): AirxComponentContext {
    return {
      inject: k => this.inject(k),
      provide: (k, v) => this.provide(k, v),
      onMounted: listener => this.onMounted(listener),
      onUnmounted: listener => this.onUnmounted(listener)
    }
  }
}

/**
 * 树结构
 * instance ←--------------
 *  |    ↑                 ↑
 * child parent           parent
 *  ↓    |                 |
 * instance  -sibling→  instance...
 */
interface Instance {
  domRef?: HTMLElement

  child?: Instance // 子节点
  parent?: Instance // 父节点
  sibling?: Instance // 兄弟节点
  deletions?: Set<Instance> // 需要移除的实例

  element?: AirxElement
  beforeElement?: AirxElement
  render?: AirxComponentRender

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  memoProps?: any // props 的引用
  requiredUpdate?: boolean
  context: InnerAirxComponentContext
}

interface RenderContext {
  rootInstance: Instance
  needCommitDom: boolean
  nextUnitOfWork: Instance | null
}

export function render(element: AirxElement, domRef: HTMLElement) {
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
   * 更新 children
   * @param parentInstance  当前正在处理的组件的实例
   * @param children  当前组件的子节点
   */
  function reconcileChildren(parentInstance: Instance, childrenElementArray: AirxElement[]) {
    const logger = createLogger('reconcileChildren')
    logger.debug('reconcileChildren', parentInstance, childrenElementArray)
    // parentInstance ←-------- 
    //   |    ↑                ↑
    // child parent          parent
    //   ↓    |                |
    // instance  -sibling→  instance -→ ....

    /**
     * 内部通过 index 生成 element 的 key
     * 通过前缀来避免和用户手动设置的 key 发生冲突
     * @param index 
     * @returns 生成的 key
     */
    function getInnerElementIndexKey(index: number): string {
      return `airx-element-inner-key:${index}`
    }

    /**
     * 将 children 实例链转成 Map 便于此处消费
     * @param firstChild children 实例的第一个元素
     * @returns 从 firstChild 开始之后的所有 sibling 实例组成的 Map
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function getChildrenInstanceMap(firstChild?: Instance): Map<any, Instance> {
      // 不使用递归是因为递归容易爆栈
      let nextIndex = 0
      let nextChild = firstChild
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = new Map<any, Instance>()

      while (nextChild) {
        /* 如果有 key，则将 key 作为 map key，否则将 index 作为 key */
        if (nextChild.element?.props.key != null) {
          map.set(nextChild.element?.props.key, nextChild)
        } else {
          map.set(getInnerElementIndexKey(nextIndex), nextChild)
        }

        nextChild = nextChild.sibling
        nextIndex += 1
      }

      return map
    }

    const newChildrenInstanceArray: Instance[] = []
    const childrenInstanceMap = getChildrenInstanceMap(parentInstance.child)

    function getChildInstance(child: AirxElement, index: number): [Instance | null, () => void] {
      if (child.props.key != null) {
        const key = child.props.key
        const instance = childrenInstanceMap.get(key) || null
        return [instance, () => childrenInstanceMap.delete(key)]
      }

      const innerKey = getInnerElementIndexKey(index)
      const instance = childrenInstanceMap.get(innerKey) || null
      return [instance, () => childrenInstanceMap.delete(innerKey)]
    }

    /**
     * 浅比较 props 是否相等
     * @param prev  之前的 props
     * @param next  下一个 props
     */
    function isSameElementType(instance: Instance, nextElement: AirxElement): boolean {
      if (instance == null) return false
      if (instance.element == null) return false
      if (instance.element.type !== nextElement.type) return false
      return true
    }

    function updateMemoProps(instance: Instance) {
      if (instance.element == null) return
      if (instance.memoProps == null) instance.memoProps = {}
      // 简单来说就是以下几件事情
      // 始终保持 props 的引用不变
      // 1. 创建一个新对象来保存 beforeElement props 的状态
      // 2. 将新的 element 上的 props 引用设置为之前的 props
      // 3. 将新的 element 上的 props 更新到之前的 props 上去

      if (instance.memoProps != null) {
        for (const key in instance.memoProps) {
          delete instance.memoProps[key]
        }
      }

      // 将新的 props 更新上去
      for (const key in instance.element.props) {
        const value = instance.element.props[key]
        instance.memoProps[key] = value
      }
    }

    function shouldUpdate(instance: Instance): boolean {
      const nextProps = instance.element?.props
      const preProps = instance.beforeElement?.props

      if (Object.is(nextProps, preProps)) {
        console.log('ref is same', nextProps, preProps)
        return false
      }

      if (
        typeof preProps !== 'object'
        || typeof nextProps !== 'object'
        || preProps === null
        || nextProps === null
      ) {
        logger.debug('props must be an object')
        return true
      }

      // 对应 key 的值不相同返回 false
      const prevKeys = Object.keys(preProps)
      for (let index = 0; index < prevKeys.length; index++) {
        const key = prevKeys[index]
        if (key !== 'children' && key !== 'key') {
          if (!Object.hasOwn(nextProps, key)) return true
          if (!Object.is(preProps[key], nextProps[key])) return true
        }

        if (key === 'children') {
          const prevChildren = preProps['children'] as AirxChildren[]
          const nextChildren = nextProps['children'] as AirxChildren[]
          // children 都是空的，则无需更新
          if (prevChildren.length === 0 && nextChildren.length === 0) return false

          // 简单比较一下 child 的引用
          for (let index = 0; index < prevChildren.length; index++) {
            const prevChild = prevChildren[index]
            const nextChild = nextChildren[index]

            if (prevChild !== nextChild) return true
            if (typeof prevChild !== typeof nextChild) return true
          }
        }

        return false
      }

      return true
    }

    // 依次遍历 child 并和 instance 对比
    for (let index = 0; index < childrenElementArray.length; index++) {
      const element = childrenElementArray[index]
      const [instance, seize] = getChildInstance(element, index)
      const isSameType = instance && isSameElementType(instance, element)

      if (isSameType) {
        seize() // 从 childrenInstanceMap 中释放
        newChildrenInstanceArray.push(instance)
        instance.beforeElement = instance.element
        instance.element = element
        updateMemoProps(instance)

        // 未标注更新的检查一下是否需要更新
        if (instance.requiredUpdate !== true && typeof element.type === 'function') {
          // FIXME: 没必要让 child 都 requiredUpdate，最好时可以只通过 shouldUpdate 来判断是否需要更新
          instance.requiredUpdate = parentInstance.requiredUpdate || shouldUpdate(instance)
          console.log(instance.beforeElement?.props, element.props, instance.requiredUpdate)
        }
      } else {
        const context = new InnerAirxComponentContext()
        const instance: Instance = { element, context }
        newChildrenInstanceArray.push(instance)
        context.instance = instance
        updateMemoProps(instance)
      }
    }

    // 新的 node
    for (let index = 0; index < newChildrenInstanceArray.length; index++) {
      const instance = newChildrenInstanceArray[index]

      // 确保链的干净
      instance.parent = parentInstance
      if (index === 0) parentInstance.child = instance
      if (index > 0) newChildrenInstanceArray[index - 1].sibling = instance
      if (index === newChildrenInstanceArray.length - 1) delete instance.sibling
    }

    // 剩余的是需要移除的
    if (childrenInstanceMap.size > 0) {
      if (parentInstance.deletions == null) {
        parentInstance.deletions = new Set()
      }

      childrenInstanceMap.forEach(instance => {
        parentInstance.deletions?.add(instance)
      })
    }

    logger.debug('parentInstance', parentInstance)
  }

  /**
   * 处理单个 instance
   * @param instance 当前处理的实例
   * @returns 返回下一个需要处理的 instance
   */
  function performUnitOfWork(instance: Instance): Instance | null {
    const element = instance.element

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function childrenAsElements(children: AirxChildren): AirxElement<any>[] {
      const childrenAsArray = Array.isArray(children) ? children : [children]
      function isComment(element: AirxChildren): boolean {
        if (element === '') return true
        if (element == null) return true
        if (element === false) return true
        return false
      }

      return childrenAsArray.flat(3).map(element => {
        if (isValidElement(element)) return element
        const elementType = isComment(element) ? 'comment' : 'text'
        const textContent = element === '' ? 'empty-string' : String(element)
        return createElement(elementType, { textContent })
      })
    }

    // airx 组件
    if (typeof element?.type === 'function') {
      const collector = createCollector()

      if (instance.render == null) {
        const component = element.type
        const beforeContext = globalContext.current
        globalContext.current = instance.context.getSafeContext()
        instance.render = collector.collect(() => component(instance.memoProps))
        globalContext.current = beforeContext

        const children = collector.collect(() => instance.render?.())
        reconcileChildren(instance, childrenAsElements(children))
      }

      if (instance.requiredUpdate) {
        const children = collector.collect(() => instance.render?.())
        reconcileChildren(instance, childrenAsElements(children))
        console.log('requiredUpdate', instance.child)
        delete instance.requiredUpdate
      }

      // 处理依赖触发的更新
      collector.complete().forEach(ref => {
        instance.context.addDisposer(watch(ref, () => {
          instance.requiredUpdate = true
          if (context.nextUnitOfWork == null && context.rootInstance.child) {
            context.nextUnitOfWork = context.rootInstance.child
          }
        }))
      })
    }

    // 浏览器组件/标签
    if (typeof element?.type === 'string') {
      if ('children' in element.props && Array.isArray(element.props.children)) {
        reconcileChildren(instance, childrenAsElements(element.props.children))
      }
    }

    // 优先处理 child
    if (instance.child) {
      return instance.child
    }

    /**
     * 递归向上查找可用的兄弟 instance
     * @param instance 
     * @returns 返回下一个需要处理的兄弟 instance
     */
    function returnSibling(instance: Instance): Instance | null {
      if (instance.sibling) {
        return instance.sibling
      }
      if (instance.parent) {
        return returnSibling(instance.parent)
      }

      return null
    }

    return returnSibling(instance)
  }

  /**
   * 提交 Dom 变化
   */
  function commitDom(rootInstance: Instance, rootNode?: ChildNode) {
    const logger = createLogger('commitDom')
    logger.debug('commitDom', rootInstance)

    type PropsType = Record<string, unknown>

    function updateDomProperties(dom: HTMLElement, nextProps: PropsType, prevProps: PropsType = {}) {
      const isKey = (key: string) => key === 'key'
      const isStyle = (key: string) => key === 'style'
      const isClass = (key: string) => key === 'class'
      const isEvent = (key: string) => key.startsWith("on")
      const isChildren = (key: string) => key === 'children'
      const isGone = (_prev: PropsType, next: PropsType) => (key: string) => !(key in next)
      const isNew = (prev: PropsType, next: PropsType) => (key: string) => prev[key] !== next[key]
      const isProperty = (key: string) => !isChildren(key) && !isEvent(key) && !isStyle(key) && !isClass(key) && !isKey(key)

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

    function getChildDom(instance: Instance): HTMLElement | null {
      if (instance.child?.domRef != null) {
        return instance.child.domRef
      }
      if (instance.child) {
        return getChildDom(instance.child)
      }

      return null
    }

    function commitInstanceDom(nextInstance: Instance, oldNode?: ChildNode) {
      // 移除标删元素
      if (nextInstance.deletions) {
        for (const deletion of nextInstance.deletions) {
          const dom = deletion.domRef || getChildDom(deletion)
          if (dom && dom.parentNode) dom.parentNode.removeChild(dom)
          deletion.context.triggerUnmounted()
          deletion.context.dispose()
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

  /**
   * 调度
   */
  function workLoop(deadline?: IdleDeadline) {
    let shouldYield = false
    const logger = createLogger('workLoop')
    while (context.nextUnitOfWork && !shouldYield) {
      logger.debug('nextUnitOfWork', context.nextUnitOfWork)
      context.nextUnitOfWork = performUnitOfWork(context.nextUnitOfWork)
      if (context.nextUnitOfWork == null) context.needCommitDom = true
      if (deadline) shouldYield = deadline.timeRemaining() < 1
    }

    if (context.needCommitDom && context.rootInstance.child) {
      commitDom(
        context.rootInstance.child,
        context.rootInstance.domRef?.firstChild || undefined
      )
      context.needCommitDom = false
    }

    requestIdleCallback(workLoop)
  }

  // 开始调度
  requestIdleCallback(workLoop)
  return context.rootInstance
}
