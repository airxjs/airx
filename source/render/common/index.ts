
import { createLogger } from '../../logger'
import { Ref, watch, createRef, createCollector } from '../../reactive'
import { AirxChildren, AirxComponentContext, AirxComponentMountedListener, AirxComponentRender, AirxComponentUnmountedListener, AirxElement, createElement, isValidElement } from '../../element'

interface GlobalContext {
  current: AirxComponentContext | null
}

const globalContext: GlobalContext = {
  current: null
}

function useContext(): AirxComponentContext {
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

export class InnerAirxComponentContext<DOM = Element | string> implements AirxComponentContext {
  public instance?: Instance<DOM>
  private disposers = new Set<Disposer>()
  private providedMap = new Map<unknown, Ref<unknown>>()
  private injectedMap = new Map<unknown, Ref<unknown>>()
  private mountListeners = new Set<AirxComponentMountedListener>()
  private unmountedListeners = new Set<AirxComponentUnmountedListener>()

  public triggerMounted() {
    this.mountListeners.forEach(listener => {
      let disposer: Disposer | void = undefined

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
    // 递归的调用子 child 的 Unmounted
    if (this.instance?.child != null) {
      this.instance.child.context.triggerUnmounted()
    }

    // 处理自己
    this.unmountedListeners.forEach(listener => {
      try {
        listener()
      } catch (err: unknown) {
        console.error(err, listener)
      }
    })

    // 处理兄弟节点
    if (this.instance?.sibling != null) {
      this.instance.sibling.context.triggerUnmounted()
    }

    this.dispose()
  }

  public onMounted(listener: AirxComponentMountedListener) {
    this.mountListeners.add(listener)
  }

  public onUnmounted(listener: AirxComponentUnmountedListener) {
    this.unmountedListeners.add(listener)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public provide<T = unknown>(key: any, value: any): (v: T) => void {
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
      let provider: Instance<DOM> | null = null
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
export interface Instance<DOM = Element | string> {
  domRef?: DOM

  child?: Instance<DOM> // 子节点
  parent?: Instance<DOM> // 父节点
  sibling?: Instance<DOM> // 兄弟节点
  deletions?: Set<Instance<DOM>> // 需要移除的实例

  element?: AirxElement
  beforeElement?: AirxElement
  render?: AirxComponentRender

  requiredUpdate?: boolean
  elementNamespace?: string
  context: InnerAirxComponentContext<DOM>

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  memoProps?: any // props 的引用
}


/**
   * 更新 children
   * @param parentInstance  当前正在处理的组件的实例
   * @param children  当前组件的子节点
   */
export function reconcileChildren(parentInstance: Instance, childrenElementArray: AirxElement[]) {
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

  function getElementNamespace(element: AirxElement): string {
    const ns = Object.keys(element.props)
      .filter(key => (key === 'xmlns' || key.startsWith('xmlns:')))
      .sort((a, b) => a.length - b.length)

    if (ns.length > 1) {
      console.log('airx currently does not support setting multiple xmlns')
      return ''
    }

    if (ns.some(i => i.startsWith('xmlns:'))) {
      console.log('airx does not currently support setting named namespaces，only supports default')
      return ''
    }

    // 原则上来说 html 仅支持设置默认的 namespace
    return element.props[ns[0]]
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

      // 如果父组件更新了，子组件全部都要更新
      if (instance.requiredUpdate !== true && typeof element.type === 'function') {
        instance.requiredUpdate = parentInstance.requiredUpdate || shouldUpdate(instance)
      }
    } else {
      const context = new InnerAirxComponentContext()
      const elementNamespace = getElementNamespace(element)
      const instance: Instance = { element, context, elementNamespace }
      newChildrenInstanceArray.push(instance)
      context.instance = instance
      updateMemoProps(instance)

      // 添加 ref 处理
      if ('ref' in instance.memoProps) {
        context.onMounted(() => {
          if (instance.domRef) { // 如果组件有自己的 dom
            instance.memoProps.ref.value = instance.domRef
            return () => instance.memoProps.ref.value = null
          }
        })
      }
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

    // 处理 ElementNS: 继承父级 namespace
    if (!instance.elementNamespace && instance.parent?.elementNamespace) {
      // SVG 中 foreignObject 代表外来对象，起到隔离 namespace 的作用
      if (instance.parent.element?.type !== 'foreignObject') {
        instance.elementNamespace = instance.parent.elementNamespace
      }
    }
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

type OnUpdateRequire = (instance: Instance) => void

/**
 * 处理单个 instance
 * @param instance 当前处理的实例
 * @returns 返回下一个需要处理的 instance
 */
export function performUnitOfWork(instance: Instance, onUpdateRequire?: OnUpdateRequire): Instance | null {
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
      delete instance.requiredUpdate
    }

    // 处理依赖触发的更新
    collector.complete().forEach(ref => {
      instance.context.addDisposer(watch(ref, () => {
        instance.requiredUpdate = true
        onUpdateRequire?.(instance)
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
