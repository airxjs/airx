import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { 
  createElement, 
  isValidElement, 
  Fragment, 
  component,
  createErrorRender,
  AirxElement
} from './element.js'
import * as symbol from '../symbol/index.js'

describe('Element Module', () => {
  describe('createElement', () => {
    it('should create an element with string type', () => {
      const element = createElement('div', { id: 'test' })
      
      expect(element).toHaveProperty('type', 'div')
      expect(element).toHaveProperty('props')
      expect(element.props).toHaveProperty('id', 'test')
      expect(element[symbol.airxElementSymbol]).toBe(true)
    })

    it('should create an element with component type', () => {
      const TestComponent = (props: { name: string }) => () => createElement('span', {}, props.name)
      const element = createElement(TestComponent, { name: 'test' })
      
      expect(element.type).toBe(TestComponent)
      expect(element.props).toHaveProperty('name', 'test')
      expect(element[symbol.airxElementSymbol]).toBe(true)
    })

    it('should handle children from arguments', () => {
      const child1 = createElement('span', {}, 'child1')
      const child2 = createElement('span', {}, 'child2')
      const element = createElement('div', {}, child1, child2)
      
      expect(element.props.children).toEqual([child1, child2])
    })

    it('should handle children from props', () => {
      const child = createElement('span', {}, 'child')
      const element = createElement('div', { children: child })
      
      expect(element.props.children).toEqual([child])
    })

    it('should prioritize children arguments over props.children', () => {
      const propsChild = createElement('span', {}, 'props child')
      const argChild = createElement('span', {}, 'arg child')
      const element = createElement('div', { children: propsChild }, argChild)
      
      expect(element.props.children).toEqual([argChild])
    })

    it('should merge props correctly', () => {
      const element = createElement('div', { id: 'test', className: 'container' })
      
      expect(element.props).toEqual({
        id: 'test',
        className: 'container',
        children: []
      })
    })
  })

  describe('isValidElement', () => {
    it('should return true for valid elements', () => {
      const element = createElement('div', {})
      expect(isValidElement(element)).toBe(true)
    })

    it('should return false for null', () => {
      expect(isValidElement(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isValidElement(undefined)).toBe(false)
    })

    it('should return false for primitive values', () => {
      expect(isValidElement('string')).toBe(false)
      expect(isValidElement(123)).toBe(false)
      expect(isValidElement(true)).toBe(false)
    })

    it('should return false for plain objects', () => {
      expect(isValidElement({})).toBe(false)
      expect(isValidElement({ type: 'div' })).toBe(false)
    })

    it('should return false for objects without airx symbol', () => {
      const fakeElement = {
        type: 'div',
        props: {},
        [Symbol('fake')]: true
      }
      expect(isValidElement(fakeElement)).toBe(false)
    })
  })

  describe('Fragment', () => {
    it('should return a function that returns children', () => {
      const child = createElement('div', {})
      const fragment = Fragment({ children: child })
      
      expect(typeof fragment).toBe('function')
      expect(fragment()).toBe(child)
    })

    it('should handle single child', () => {
      const child = createElement('div', {}, 'child')
      const fragment = Fragment({ children: child })
      
      expect(fragment()).toBe(child)
    })
  })

  describe('component', () => {
    it('should return the component function as-is', () => {
      const TestComponent = (props: { name: string }) => () => createElement('div', {}, props.name)
      const wrappedComponent = component(TestComponent)
      
      expect(wrappedComponent).toBe(TestComponent)
    })

    it('should work with typed components', () => {
      interface Props {
        title: string
        count: number
      }
      
      const TypedComponent = component<Props>((props) => () => 
        createElement('div', {}, `${props.title}: ${props.count}`)
      )
      
      expect(typeof TypedComponent).toBe('function')
    })
  })

  describe('createErrorRender', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleErrorSpy.mockRestore()
    })

    it('should create an error render function', () => {
      const error = new Error('Test error')
      const errorRender = createErrorRender(error)
      
      expect(typeof errorRender).toBe('function')
      expect(consoleErrorSpy).toHaveBeenCalledWith(error)
    })

    it('should return a div element with error message', () => {
      const error = new Error('Test error')
      const errorRender = createErrorRender(error)
      const element = errorRender() as AirxElement
      
      expect(isValidElement(element)).toBe(true)
      expect(element.type).toBe('div')
      expect(element.props.style).toMatchObject({
        padding: '8px',
        fontSize: '20px',
        color: 'rgb(255,255,255)',
        backgroundColor: 'rgb(255, 0, 0)'
      })
    })

    it('should handle click events', () => {
      const error = new Error('Test error')
      const errorRender = createErrorRender(error)
      const element = errorRender() as AirxElement
      
      // Simulate click
      const onClick = element.props.onClick
      expect(typeof onClick).toBe('function')
      
      // Reset console spy to check if click handler logs error
      consoleErrorSpy.mockReset()
      if (typeof onClick === 'function') {
        onClick()
      }
      expect(consoleErrorSpy).toHaveBeenCalledWith(error)
    })

    it('should handle null error', () => {
      const errorRender = createErrorRender(null)
      const element = errorRender() as AirxElement
      
      // Check if the error message is for unknown error
      const children = element.props.children
      expect(children).toEqual(['Unknown rendering error'])
    })

    it('should handle undefined error', () => {
      const errorRender = createErrorRender(undefined)
      const element = errorRender() as AirxElement
      
      const children = element.props.children
      expect(children).toEqual(['Unknown rendering error'])
    })

    it('should handle non-Error objects', () => {
      const errorObj = { message: 'Custom error' }
      const errorRender = createErrorRender(errorObj)
      const element = errorRender() as AirxElement
      
      const children = element.props.children
      expect(children).toEqual([JSON.stringify(errorObj)])
    })

    it('should handle string errors', () => {
      const error = 'String error'
      const errorRender = createErrorRender(error)
      const element = errorRender() as AirxElement
      
      const children = element.props.children
      expect(children).toEqual([JSON.stringify(error)])
    })
  })

  describe('symbol integration', () => {
    it('should use the correct airx element symbol', () => {
      const element = createElement('div', {})
      expect(element[symbol.airxElementSymbol]).toBe(true)
    })
  })
})
