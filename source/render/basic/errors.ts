import { AirxComponentRender, AirxElement, isValidElement } from '../../element/index.js'

function getValueType(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return typeof value === 'object' && value !== null && typeof Reflect.get(value, 'then') === 'function'
}

function createPromiseHint(value: unknown): string {
  if (!isPromiseLike(value)) return ''
  return ' Async component is not supported yet. Return a sync render function instead of Promise.'
}

export function createInvalidComponentReturnError(componentName: string, value: unknown): TypeError {
  return new TypeError(
    `[airx] Component "${componentName}" should return a render function (() => AirxChildren) or an AirxElement, but got ${getValueType(value)}.${createPromiseHint(value)}`
  )
}

export function normalizeComponentReturnValue(componentName: string, value: unknown): AirxComponentRender | AirxElement {
  if (isValidElement(value)) return value
  if (typeof value === 'function') return value as AirxComponentRender
  throw createInvalidComponentReturnError(componentName, value)
}

export function createInvalidChildValueError(ownerName: string, value: unknown): TypeError {
  return new TypeError(
    `[airx] ${ownerName} returned an unsupported child value of type ${getValueType(value)}. Supported child values are AirxElement, string, number, boolean, null, undefined, and arrays of these.${createPromiseHint(value)}`
  )
}

export function assertValidChildValue(ownerName: string, value: unknown): void {
  if (isValidElement(value)) return
  if (Array.isArray(value)) return
  if (value === null || value === undefined) return
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return
  throw createInvalidChildValueError(ownerName, value)
}
