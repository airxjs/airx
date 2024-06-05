import * as symbol from './symbol'
import { CSSProperties } from './types'

type AirxElementType<P> = string | AirxComponent<P>

export type Props = { [propKey: string]: unknown }

/**
 * AirxElement 表示一个 Airx 元素
 * type 表示元素的类型，可能是一个 html 标签，
 * 也可能是一个自定义组件
 * props 表示元素的属性
 * children 表示元素的子元素
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface AirxElement<P = any> {
  type: AirxElementType<P>
  props: Props & P
  [symbol.airxElementSymbol]: true
}

export type AirxChildren =
  | null
  | string
  | number
  | boolean
  | undefined
  | AirxElement
  | Array<AirxChildren>
  | AirxComponentRender // allow function component return type

/**
 * 函数式组件接收自己的 props，并返回一个 AirxElement
 */
export type AirxComponentRender = () => AirxChildren
export type AirxComponent<P = unknown> = ReactiveComponent<P>
export type ReactiveComponent<P = unknown> = (props: P) => AirxComponentRender

/**
 * createElement 是用于创建 AirxElement 的工具函数
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

export function isValidElement(element: unknown): element is AirxElement {
  return typeof element === 'object'
    && element !== null
    && Reflect.get(element, symbol.airxElementSymbol)
}

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
