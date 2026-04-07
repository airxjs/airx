import { AirxElement } from '../../element/index.js'
import { createLogger } from '../../logger/index.js'
import { PluginContext } from '../basic/plugins/index.js'
import {
  InnerAirxComponentContext,
  Instance,
  performUnitOfWork
} from '../basic/common.js'

/**
 * Hydrate options for client-side activation
 */
export interface HydrateOptions {
  /**
   * Signal state snapshot from SSR to restore
   */
  stateSnapshot?: StateSnapshot
  /**
   * If true, skip SSR state restoration and recalculate from scratch
   */
  forceReset?: boolean
}

/**
 * Signal state snapshot structure
 */
export interface StateSnapshot {
  signals: Record<string, { id: string; value: unknown }>
  version: string
  timestamp: number
}

/**
 * Interface for hydrated app instance
 */
export interface HydratedApp {
  /**
   * The root DOM container
   */
  container: HTMLElement
  /**
   * Cleanup function to unmount the app
   */
  unmount: () => void
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

/**
 * Hydrate an SSR-rendered app on the client side.
 * 
 * This function activates an Airx application on existing DOM content
 * that was rendered by SSR, without recreating the DOM structure.
 * 
 * @param element - The root AirxElement to hydrate
 * @param container - The DOM container with SSR-rendered content
 * @param options - Hydrate options including state snapshot
 * @returns HydratedApp instance
 */
export function hydrate(
  element: AirxElement,
  container: HTMLElement,
  options?: HydrateOptions
): HydratedApp {
  const logger = createLogger('hydrate')
  logger.debug('hydrate starting', { element, container, options })

  // Build the instance tree using performUnitOfWork
  const rootInstance: Instance<HTMLElement> = {
    domRef: container,
    context: new InnerAirxComponentContext()
  }
  rootInstance.context.instance = rootInstance

  const appInstance: Instance<HTMLElement> = {
    element,
    parent: rootInstance,
    memoProps: { ...element.props },
    context: new InnerAirxComponentContext()
  }
  appInstance.context.instance = appInstance

  rootInstance.child = appInstance

  // Build the instance tree
  let currentInstance: Instance<HTMLElement> | null = appInstance
  while (currentInstance) {
    currentInstance = performUnitOfWork(
      createPluginContextWithHydration(),
      currentInstance
    ) as Instance<HTMLElement> | null
  }

  // Connect instance tree to existing DOM
  connectInstanceTreeToDom(appInstance, container)

  // Set up reactive updates
  const context = setupReactiveUpdates(rootInstance)

  logger.debug('hydrate complete')

  return {
    container,
    unmount: () => {
      context.rootInstance.child?.context.triggerUnmounted()
    }
  }
}

/**
 * Restore signal states from a snapshot
 */
function restoreSignalStates(snapshot: StateSnapshot): void {
  const logger = createLogger('hydrate:restoreSignalStates')
  logger.debug('restoring signal states', snapshot)

  // TODO(0.8.x): Signal state restoration is not yet implemented.
  // This is a placeholder — signal states are recalculated from scratch.
  // Related: airx 0.8.x roadmap - Hydration support.
  if (process?.env?.NODE_ENV !== 'production') {
    console.warn(
      '[airx] hydrate: stateSnapshot restore is not yet implemented. ' +
      'Signal states will be recalculated from scratch. ' +
      'See airx 0.8.x roadmap for hydration progress.'
    )
  }
  // Signal state restoration would be implemented here
  // This requires access to the actual Signal instances
  // For now, this is a placeholder that will be fully implemented
  // when signal tracking is integrated with SSR
}

/**
 * Create a plugin context for hydration
 */
function createPluginContextWithHydration(): PluginContext {
  // Reuse the standard plugin context for hydration
  return new PluginContext()
}

/**
 * Connect instance tree to existing DOM nodes
 * This traverses the instance tree and matches it to existing DOM
 */
function connectInstanceTreeToDom(
  appInstance: Instance<HTMLElement>,
  container: HTMLElement
): void {
  const logger = createLogger('hydrate:connectInstanceTree')
  
  // Walk the instance tree and connect to existing DOM
  function walkAndConnect(instance: Instance<HTMLElement>, parentDom: HTMLElement) {
    if (!instance.element) return

    // For element types that create DOM nodes
    if (typeof instance.element.type === 'string') {
      // Find the corresponding DOM node in parent
      const childDom = findMatchingChildDom(parentDom, instance.element)
      if (childDom) {
        instance.domRef = childDom as HTMLElement
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(childDom as any).airxInstance = instance
      }
    }

    // Continue walking children
    let child = instance.child
    while (child) {
      if (instance.domRef) {
        walkAndConnect(child, instance.domRef)
      }
      child = child.sibling
    }
  }

  walkAndConnect(appInstance, container)
  logger.debug('instance tree connected to DOM')
}

/**
 * Find a matching child DOM node for an element
 * This uses tag name matching as a simple heuristic
 */
function findMatchingChildDom(parent: HTMLElement, element: AirxElement): HTMLElement | null {
  // Only string element types create DOM nodes
  if (typeof element.type !== 'string') return null

  const tagName = element.type.toUpperCase()

  for (const child of Array.from(parent.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement
      if (el.tagName === tagName) {
        return el
      }
    }
  }
  return null
}

interface HydrateRenderContext {
  rootInstance: Instance<HTMLElement>
  needCommitDom: boolean
  nextUnitOfWork: Instance<HTMLElement> | null
  isWorkLoopScheduled: boolean
}

/**
 * Set up reactive updates for the hydrated app
 */
function setupReactiveUpdates(
  rootInstance: Instance<HTMLElement>
): HydrateRenderContext {
  const context: HydrateRenderContext = {
    rootInstance,
    nextUnitOfWork: null,
    needCommitDom: false,
    isWorkLoopScheduled: false
  }

  function onUpdateRequire() {
    if (context.nextUnitOfWork == null && context.rootInstance.child) {
      context.nextUnitOfWork = context.rootInstance.child
    }
    scheduleWorkLoop()
  }

  function scheduleWorkLoop() {
    if (context.isWorkLoopScheduled || context.nextUnitOfWork == null) {
      return
    }

    context.isWorkLoopScheduled = true
    scheduleIdleWork(() => {
      context.isWorkLoopScheduled = false
      workLoop()
    })
  }

  function workLoop() {
    const logger = createLogger('hydrate:workLoop')
    let shouldYield = false

    while (context.nextUnitOfWork && !shouldYield) {
      logger.debug('nextUnitOfWork', context.nextUnitOfWork)
      context.nextUnitOfWork = performUnitOfWork(
        createPluginContextWithHydration(),
        context.nextUnitOfWork,
        onUpdateRequire
      ) as Instance<HTMLElement> | null

      if (context.nextUnitOfWork == null) {
        context.needCommitDom = true
      }

      shouldYield = true // For hydrate, we yield after each unit
    }

    if (context.needCommitDom && context.rootInstance.child) {
      // In hydrate mode, DOM already exists, so we just need to
      // trigger mounted lifecycle for any new instances
      context.rootInstance.child.context.triggerMounted()
      context.needCommitDom = false
    }

    scheduleWorkLoop()
  }

  // Start the reactive system
  scheduleWorkLoop()

  return context
}
