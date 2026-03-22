import { describe, it, expect } from 'vitest'
import { createApp } from '../../app/index.js'
import { createElement } from '../../element/index.js'

describe('render/browser regression reproduction', () => {
  it('supports svg text element with nested textPath', () => {
    const container = document.createElement('div')

    const element = createElement(
      'svg',
      { viewBox: '0 0 144 144' },
      createElement(
        'defs',
        {},
        createElement('path', {
          id: 'circle-path',
          d: 'M72 72 m-54 0 a 54 54 0 1 1 108 0 a 54 54 0 1 1 -108 0',
          fill: 'none'
        })
      ),
      createElement(
        'text',
        {},
        createElement('textPath', { href: '#circle-path' }, 'SCROLL DOWN • SCROLL DOWN •')
      )
    )

    expect(() => {
      createApp(element).mount(container)
    }).not.toThrow()

    const text = container.querySelector('svg > text')
    const textPath = container.querySelector('svg > text > textPath')
    expect(text).not.toBeNull()
    expect(textPath?.textContent).toBe('SCROLL DOWN • SCROLL DOWN •')
  })
})
