interface RenderStringOptions {
  template: string
}

/**
 * 服务端渲染
 * @param options 
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function render(options: RenderStringOptions): string {
  throw new Error('not supported')
}
