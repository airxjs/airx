import {
  createElement,
  Fragment as AirxFragment,
  type AirxChildren,
  type AirxComponent,
  type AirxComponentRender,
  type AirxElement,
  type Props
} from './element/index.js'
import type { NativeElements } from './types/index.js'

type Key = string | number | symbol
type JSXComponent = AirxComponent<unknown>
type JSXElementType = keyof NativeElements | JSXComponent

function normalizeChildren(children: unknown): AirxChildren[] {
  if (children === undefined) {
    return []
  }

  if (Array.isArray(children)) {
    return children as AirxChildren[]
  }

  return [children as AirxChildren]
}

function createJsxElement(type: JSXElementType, props: Props | null | undefined, key?: Key): AirxElement {
  const original = props ?? {}
  const mergedProps: Props = key !== undefined && original.key === undefined
    ? { ...original, key }
    : { ...original }

  const children = normalizeChildren(mergedProps.children)
  return createElement(type, mergedProps, ...children)
}

export const Fragment = AirxFragment

export function jsx(type: JSXElementType, props: Props | null, key?: Key): AirxElement {
  return createJsxElement(type, props, key)
}

export const jsxs = jsx

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace JSX {
  export type ElementClass = never

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface Element extends AirxComponentRender {}

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface ElementChildrenAttribute {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    children: {}
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface IntrinsicElements extends NativeElements {}

  export interface IntrinsicAttributes {
    key?: Key
  }
}
