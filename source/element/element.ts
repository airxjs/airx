import * as symbol from '../symbol/index.js'
import { CSSProperties } from '../types/index.js'

type AirxElementType<P> = string | AirxComponent<P>

export type Props = { [propKey: string]: unknown }

/**
 * Airx 虚拟节点结构。
 *
 * - type: 标签名或组件函数
 * - props: 组件参数或标签属性
 * - props.children: 子节点列表
 *
 * @example
 * import { createElement, type AirxElement } from 'airx'
 *
 * const node: AirxElement = createElement('div', { id: 'app' }, 'hello')
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface AirxElement<P = any> {
  type: AirxElementType<P>
  props: Props & P
  [symbol.airxElementSymbol]: true
}

/**
 * 组件可返回的子节点类型。
 */
export type AirxChildren =
  | null
  | string
  | number
  | boolean
  | undefined
  | AirxElement
  | Array<AirxChildren>
  | AirxComponentRender

/**
 * 组件渲染函数类型。
 *
 * 组件函数返回值本身是一个 "render 函数"，该函数最终返回子节点。
 */
export type AirxComponentRender = () => AirxChildren
export type AirxComponent<P = unknown> = ReactiveComponent<P>
export type ReactiveComponent<P = unknown> = (props: P) => AirxComponentRender

/**
 * 创建 Airx 虚拟节点。
 *
 * 可用于手写节点，也会被 JSX 转换后调用。
 *
 * @param type 标签名或组件函数。
 * @param props 属性对象。
 * @param children 可变子节点参数。
 * @returns 标准化后的 AirxElement。
 *
 * @example
 * import { createElement } from 'airx'
 *
 * const view = createElement('div', { class: 'box' }, 'hello')
 *
 * @example
 * import { createElement } from 'airx'
 *
 * function Title(props: { text: string }) {
 *   return () => createElement('h1', null as never, props.text)
 * }
 *
 * const node = createElement(Title, { text: 'Airx' })
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createElement<P = any>(
  type: AirxElementType<P>,
  props: { [key: string]: unknown } & P,
  ...children: AirxChildren[]
): AirxElement<P> {
  const localChildren: AirxChildren[] = []

  if (children.length > 0) {
    localChildren.push(...children)
  } else if (props && props.children) {
    localChildren.push(props.children as AirxChildren)
  }

  return {
    type,
    props: {
      ...props,
      children: localChildren
    },
    [symbol.airxElementSymbol]: true
  }
}

/**
 * 判断一个值是否是合法的 AirxElement。
 */
export function isValidElement(element: unknown): element is AirxElement {
  return typeof element === 'object'
    && element !== null
    && Reflect.get(element, symbol.airxElementSymbol) === true
}

/**
 * JSX Fragment 对应的运行时实现。
 *
 * @example
 * function Card() {
 *   return () => (
 *     <>
 *       <h3>Title</h3>
 *       <p>Content</p>
 *     </>
 *   )
 * }
 */
export function Fragment(props: { children: AirxElement }) {
  return () => props.children
}

export type AirxComponentUnmountedListener = () => void
export type AirxComponentMountedListener = () => (() => void) | void

export interface AirxComponentLifecycle {
  onMounted: (listener: AirxComponentMountedListener) => void
  onUnmounted: (listener: AirxComponentUnmountedListener) => void
}

type ProvideUpdater<T = unknown> = (newValue: T | ((old: T) => T)) => void

export type AirxComponentContext = AirxComponentLifecycle & {
  provide: <T = unknown>(key: unknown, value: T) => ProvideUpdater<T>
  inject: <T = unknown>(key: unknown) => T | undefined
}

/**
 * 为组件提供类型友好的包装。
 *
 * 主要用于在不使用 JSX 的场景下显式声明组件签名。
 *
 * @example
 * import { component, createElement } from 'airx'
 *
 * const Hello = component<{ name: string }>((props) => {
 *   return () => createElement('h1', null as never, `Hello ${props.name}`)
 * })
 */
export function component<P = unknown>(comp: AirxComponent<P>): AirxComponent<P> {
  return comp
}

export function createErrorRender(error: unknown): AirxComponentRender {
  console.error(error)

  const handleClick = () => {
    // 点击输出错误是为了避免
    // 页面上多个组件同时出错时
    // 无法定位错误与之对应的组件
    console.error(error)
  }

  const formattingError = (): string => {
    if (error == null) return 'Unknown rendering error'
    if (error instanceof Error) return error.message
    return JSON.stringify(error)
  }

  const errorBlockStyle: CSSProperties = {
    padding: '8px',
    fontSize: '20px',
    color: 'rgb(255,255,255)',
    backgroundColor: 'rgb(255, 0, 0)',
  }

  return () => createElement('div', { style: errorBlockStyle, onClick: handleClick }, formattingError())
}
