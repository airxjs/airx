import { Fragment, jsx, jsxs } from './jsx-runtime.js'

export { Fragment, jsx, jsxs }

export function jsxDEV(
  type: Parameters<typeof jsx>[0],
  props: Parameters<typeof jsx>[1],
  key?: Parameters<typeof jsx>[2],
  _isStaticChildren?: boolean,
  _source?: unknown,
  _self?: unknown
): ReturnType<typeof jsx> {
  void _isStaticChildren
  void _source
  void _self
  return jsx(type, props, key)
}
