/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Shared commit helpers for browser and server renderers.
 * Extracted in Iteration B Phase 2 (TASK-0059) to reduce duplication.
 */
import type { Instance } from './common.js'
import { getChildDoms, getParentDom } from './common.js'

/**
 * Get a human-readable element name for debugging/error messages.
 */
export function getDebugElementName(instance?: Instance<any>): string {
  if (typeof instance?.element?.type === 'string') {
    return `<${instance.element.type}>`
  }

  if (typeof instance?.element?.type === 'function') {
    const componentName = instance.element.type.name || 'AnonymousComponent'
    return `Component(${componentName})`
  }

  return '<unknown>'
}

/**
 * Remove all DOM nodes marked for deletion and trigger unmount lifecycle.
 */
export function removeDeletions(instance: Instance<any>): void {
  if (!instance.deletions) return

  for (const deletion of instance.deletions) {
    const domList = getChildDoms(deletion) as any[]
    for (let index = 0; index < domList.length; index++) {
      const dom = domList[index]
      if (dom && dom.parentNode) dom.parentNode.removeChild(dom)
    }
    deletion.context.triggerUnmounted()
  }

  instance.deletions.clear()
}

/**
 * Insert a DOM node into its parent, reusing existing node position when possible.
 */
export function insertDomIntoParent(
  instance: Instance<any>,
  domRef: any,
  oldNode: any
): void {
  if (oldNode === domRef) return

  const parentDom = getParentDom(instance)

  if (parentDom.nodeType === Node.TEXT_NODE || parentDom.nodeType === Node.COMMENT_NODE) {
    throw new Error(
      `[airx] Invalid DOM hierarchy: cannot append ${getDebugElementName(instance)} to parent. `
      + 'A text/comment node cannot contain child nodes.'
    )
  }

  if (domRef.parentNode === parentDom) {
    // Element is already in the correct parent - use insertBefore to reposition
    parentDom.insertBefore(domRef, oldNode ?? null)
  } else {
    // Element needs to be moved from somewhere else (or is detached)
    if (domRef.parentNode) {
      domRef.parentNode.removeChild(domRef)
    }
    parentDom.appendChild(domRef)
  }
}

// ─── Props classification utilities ───────────────────────────────────────────

export type PropPredicate = (key: string) => boolean

/**
 * Factory for creating property classification predicates used in updateDomProperties.
 *
 * 属性分类规则:
 * - `key`: 不参与 DOM 操作
 * - `ref`: ref 回调不参与 DOM 操作
 * - `style`: 单独处理（增量更新 style 对象属性）
 * - `class`: 通过 `setAttribute('class', ...)` 处理
 * - `on*`: 事件处理器，通过 `addEventListener`/`removeEventListener` 处理
 * - `children`: 不渲染到 DOM
 * - `isProperty`: 其他普通属性，通过 `setAttribute`/`removeAttribute` 处理
 * - `isGone(prev, next)`: 返回在新 props 中不存在、需要移除的属性
 * - `isNew(prev, next)`: 返回新旧 props 中值发生变化、需要更新的属性
 */
export function createPropClassifier() {
  const isKey = (key: string) => key === 'key'
  const isRef = (key: string) => key === 'ref'
  const isStyle = (key: string) => key === 'style'
  const isClass = (key: string) => key === 'class'
  const isEvent = (key: string) => key.startsWith('on')
  const isChildren = (key: string) => key === 'children'
  const isProperty = (key: string) =>
    !isChildren(key) && !isEvent(key) && !isStyle(key) && !isClass(key) && !isKey(key) && !isRef(key)
  const isGone = (_prev: Record<string, unknown>, next: Record<string, unknown>) =>
    (key: string) => !(key in next)
  const isNew = (prev: Record<string, unknown>, next: Record<string, unknown>) =>
    (key: string) => prev[key] !== next[key]

  return { isKey, isRef, isStyle, isClass, isEvent, isChildren, isProperty, isGone, isNew }
}
