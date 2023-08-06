import { Ref } from './reactive'
import * as symbol from './symbol'

type AirxElementType<P> = string | AirxComponent<P>

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
  props: { [propKey: string]: unknown } & P
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

/**
 * 函数式组件接收自己的 props，并返回一个 AirxElement
 */
export type AirxComponent<P = unknown> = (props: P) => AirxComponentRender
export type AirxComponentRender = () => AirxChildren

/**
 * createElement 是用于创建 AirxElement 的工具函数
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createElement<P = any>(
  type: AirxElementType<P>,
  props: { [key: string]: unknown } & P,
  ...children: AirxChildren[]
): AirxElement<P> {
  return {
    type,
    props: {
      ...props,
      children
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

export type AirxComponentContext = AirxComponentLifecycle & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  provide: <T = any>(key: any, value: T) => (newValue: T) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inject: <T = any>(key: any) => Ref<T | null>
}
