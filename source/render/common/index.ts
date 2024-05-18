
import { createLogger } from '../../logger'
import {
  AirxElement,
  AirxChildren,
  createElement,
  isValidElement,
  AirxComponentContext,
  AirxComponentMountedListener,
  AirxComponentUnmountedListener,
  AirxComponentRender,
} from '../../element'
import { PluginContext } from './plugins'
import { globalContext } from './hooks'
import { Signal } from 'signal-polyfill'

export type Disposer = () => void

export class InnerAirxComponentContext<E extends AbstractElement> implements AirxComponentContext {
  public instance!: Instance<E>
  private disposers = new Set<Disposer>()
  public providedMap = new Map<unknown, unknown>()
  public injectedMap = new Map<unknown, unknown>()
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
  public provide<T = unknown>(key: any, value: any): (v: T | ((old: T) => T)) => void {
    this.providedMap.set(key, value)
    return v => {
      if (typeof v === 'function') {
        const old = this.providedMap.get(key)
        const func = v as (old: T) => T
        this.providedMap.set(key, func(old as T))
        return
      }

      this.providedMap.set(key, v)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public inject<T = unknown>(key: any): T | undefined {
    const getProvideValueForParent = (instance: Instance<E> | undefined, key: unknown): unknown => {
      if (instance && instance.context) {
        const value = instance.context.providedMap.get(key)
        if (value != undefined) return value
        if (instance.parent) return getProvideValueForParent(instance.parent, key)
      }

      return undefined
    }

    const currentParentValue = getProvideValueForParent(this.instance.parent, key)
    this.injectedMap.set(key, currentParentValue) // 更新本地值
    return this.injectedMap.get(key) as T
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

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AbstractElement {

}

/**
 * 树结构
 * instance ←--------------
 *  |    ↑                 ↑
 * child parent           parent
 *  ↓    |                 |
 * instance  -sibling→  instance...
 */
export interface Instance<E extends AbstractElement = AbstractElement> {
  domRef?: E

  child?: Instance<E> // 子节点
  parent?: Instance<E> // 父节点
  sibling?: Instance<E> // 兄弟节点
  deletions?: Set<Instance<E>> // 需要移除的实例

  element?: AirxElement
  beforeElement?: AirxElement
  childrenRender?: AirxComponentRender
  signalWatcher?: Signal.subtle.Watcher

  needReRender?: boolean
  elementNamespace?: string
  context: InnerAirxComponentContext<E>

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  memoProps?: any // props 的引用
}


/**
   * 更新 children
   * @param parentInstance  当前正在处理的组件的实例
   * @param children  当前组件的子节点
   */
export function reconcileChildren<E extends AbstractElement>(appContext: PluginContext, parentInstance: Instance<E>, childrenElementArray: AirxElement[]) {
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
  function getChildrenInstanceMap(firstChild?: Instance<E>): Map<any, Instance<E>> {
    // 不使用递归是因为递归容易爆栈
    let nextIndex = 0
    let nextChild = firstChild
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = new Map<any, Instance<E>>()

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

  const newChildrenInstanceArray: Instance<E>[] = []
  const childrenInstanceMap = getChildrenInstanceMap(parentInstance.child)

  function getChildInstance(child: AirxElement, index: number): [Instance<E> | null, () => void] {
    if (child.props.key != null) {
      const key = child.props.key
      const instance = childrenInstanceMap.get(key) || null
      return [instance, () => childrenInstanceMap.delete(key)]
    }

    const innerKey = getInnerElementIndexKey(index)
    const instance = childrenInstanceMap.get(innerKey) || null
    return [instance, () => childrenInstanceMap.delete(innerKey)]
  }

  /** 是否复用实例 */
  function isReuseInstance(instance: Instance<E>, nextElement: AirxElement): boolean {
    for (const plugin of appContext.plugins) {
      if (typeof plugin.isReuseInstance === 'function') {
        const result = plugin.isReuseInstance(instance, nextElement)
        // 任意一个插件要求不复用就不复用
        if (result === false) return false
      }
    }
    return true
  }

  function updateMemoProps(instance: Instance<E>) {
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

  function isNeedReRender(instance: Instance<E>): boolean {
    for (const plugin of appContext.plugins) {
      if (typeof plugin.isReRender === 'function') {
        const result = plugin.isReRender(instance)
        // 任意一个插件要求重新渲染就重新渲染
        if (result === true) return true
      }
    }

    return false
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

    if (instance && isReuseInstance(instance, element)) {
      seize() // 从 childrenInstanceMap 中释放
      newChildrenInstanceArray.push(instance)
      instance.beforeElement = instance.element
      instance.element = element
      updateMemoProps(instance)

      // 如果父组件更新了，子组件全部都要更新
      if (instance.needReRender !== true && typeof element.type === 'function') {
        instance.needReRender = parentInstance.needReRender || isNeedReRender(instance)
      }
    } else {
      const context = new InnerAirxComponentContext<E>()
      const elementNamespace = getElementNamespace(element)
      const instance: Instance<E> = { element, context, elementNamespace }
      newChildrenInstanceArray.push(instance)
      context.instance = instance
      updateMemoProps(instance)

      // 添加 ref 处理
      if ('ref' in instance.memoProps) {
        context.onMounted(() => {
          const ref = instance.memoProps.ref
          // 如果组件有自己的 dom 并且 ref 为 state
          if (instance.domRef && ref instanceof Signal.State) {
            ref.set(instance.domRef)
            return () => ref.set(undefined)
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

type OnUpdateRequire<E extends AbstractElement> = (instance: Instance<E>) => void

/**
 * 处理单个 instance
 * @param instance 当前处理的实例
 * @returns 返回下一个需要处理的 instance
 */
export function performUnitOfWork<E extends AbstractElement>(pluginContext: PluginContext, instance: Instance<E>, onUpdateRequire?: OnUpdateRequire<E>): Instance<E> | null {
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
    if (instance.signalWatcher == null) {
      // Watch 是惰性的，只有当 Signal 被读取时才会触发 --！
      const signalWatcher = new Signal.subtle.Watcher(async () => {
        instance.needReRender = true
        onUpdateRequire?.(instance)

        queueMicrotask(() => {
          signalWatcher.watch()
          const paddings = signalWatcher.getPending()
          for (const padding of paddings) padding.get()
        })
      })

      instance.signalWatcher = signalWatcher
      instance.context.addDisposer(() => signalWatcher.unwatch())
    }

    if (instance.childrenRender == null) {
      const component = element.type
      const beforeContext = globalContext.current
      globalContext.current = instance.context.getSafeContext()

      const componentReturnValue = component(instance.memoProps)

      if (typeof componentReturnValue !== 'function') {
        throw new Error('Component must return a render function')
      }

      globalContext.current = beforeContext
      instance.childrenRender = componentReturnValue
      const childrenComputed = new Signal.Computed(() => componentReturnValue())
      instance.signalWatcher.watch(childrenComputed)
      const children = childrenComputed.get()

      reconcileChildren(pluginContext, instance, childrenAsElements(children))
    }

    if (instance.needReRender) {
      // 这里有个问题，如果是由于父组件导致的子组件渲染
      // 则直接使用 childrenComputed.get 将读取到缓存值
      // const children = instance.childrenRender?.()
      const children = instance.childrenRender!()
      reconcileChildren(pluginContext, instance, childrenAsElements(children))
      delete instance.needReRender
    }
  }

  // 浏览器组件/标签
  if (typeof element?.type === 'string') {
    if ('children' in element.props && Array.isArray(element.props.children)) {
      reconcileChildren(pluginContext, instance, childrenAsElements(element.props.children))
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
  function returnSibling(instance: Instance<E>): Instance<E> | null {
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
