import { type AirxChildren, type AirxComponentRender, createErrorRender } from './element.js'
import * as signal from '../signal/index.js'

/**
 * ErrorBoundary component props.
 * 
 * Wraps children and catches rendering errors, displaying a fallback UI instead.
 */
export interface ErrorBoundaryProps {
  children: AirxChildren
  fallback?: AirxChildren | ((error: unknown) => AirxChildren)
  onError?: (error: unknown, errorInfo: string) => void
}

/**
 * ErrorBoundary component state tracked via signals.
 */
export interface ErrorBoundaryState {
  error: unknown | null
}

/**
 * Airx ErrorBoundary component - catches child rendering errors.
 * 
 * When a child component throws during rendering, ErrorBoundary:
 * 1. Catches the error and stores it in state
 * 2. Calls the onError callback if provided
 * 3. Renders the fallback UI (or error message if no fallback)
 * 4. Provides resetError() to clear error and re-render children
 * 
 * @example
 * ```ts
 * function App() {
 *   return (
 *     <ErrorBoundary 
 *       fallback={(error) => <div>Error: {error.message}</div>}
 *       onError={(error) => console.error('Child error:', error)}
 *     >
 *       <ChildThatMightFail />
 *     </ErrorBoundary>
 *   )
 * }
 * ```
 */
export function ErrorBoundary(props: ErrorBoundaryProps): AirxComponentRender {
  // Signal-based state for reactive updates
  const errorState = signal.createState<unknown | null>(null)

  return () => {
    const error = errorState.get()

    // If there's an error, show fallback
    if (error !== null) {
      // Call onError if provided
      if (props.onError) {
        try {
          props.onError(error, 'ErrorBoundary caught error')
        } catch (callbackError: unknown) {
          console.error('ErrorBoundary onError callback threw:', callbackError)
        }
      }

      // Show fallback
      if (props.fallback) {
        if (typeof props.fallback === 'function') {
          const fallbackResult = props.fallback(error)
          return fallbackResult
        }
        return props.fallback
      }

      // Default fallback: show error message
      return createErrorRender(error)
    }

    // No error - render children with error catching
    try {
      const children = resolveChildren(props.children)
      return children
    } catch (err) {
      // Child threw an error - store it and show fallback
      errorState.set(err)
      
      if (props.onError) {
        try {
          props.onError(err, 'ErrorBoundary caught error during render')
        } catch (callbackError: unknown) {
          console.error('ErrorBoundary onError callback threw:', callbackError)
        }
      }

      if (props.fallback) {
        if (typeof props.fallback === 'function') {
          return props.fallback(err)
        }
        return props.fallback
      }

      // Default fallback
      return createErrorRender(err)
    }
  }
}

/**
 * ErrorBoundary API interface - returned from ErrorBoundary component for external access.
 */
export interface ErrorBoundaryRef {
  /**
   * Clear the error state and re-render children.
   */
  resetError: () => void
  
  /**
   * Current error state.
   */
  error: unknown | null
  
  /**
   * Force re-render of the ErrorBoundary.
   */
  forceUpdate: () => void
}

/**
 * Resolve children to AirxChildren (handles function children).
 */
function resolveChildren(children: AirxChildren): AirxChildren {
  if (typeof children === 'function') {
    return children()
  }
  return children
}

/**
 * Create an error boundary instance with ref access.
 * 
 * This allows external code to call resetError() on the boundary.
 */
export function createErrorBoundary(
  props: ErrorBoundaryProps,
  refCallback?: (ref: ErrorBoundaryRef) => void
): AirxComponentRender {
  const errorState = signal.createState<unknown | null>(null)
  const forceRenderFn = { current: null as (() => void) | null }

  const render: AirxComponentRender = () => {
    const error = errorState.get()

    if (error !== null) {
      if (props.onError) {
        props.onError(error, 'ErrorBoundary caught error')
      }
      if (props.fallback) {
        return typeof props.fallback === 'function' ? props.fallback(error) : props.fallback
      }
      return createErrorRender(error)
    }

    try {
      return resolveChildren(props.children)
    } catch (err) {
      errorState.set(err)
      if (props.onError) {
        props.onError(err, 'ErrorBoundary caught error during render')
      }
      if (props.fallback) {
        return typeof props.fallback === 'function' ? props.fallback(err) : props.fallback
      }
      return createErrorRender(err)
    }
  }

  // Create ref object
  const refObj: ErrorBoundaryRef = {
    get error() {
      return errorState.get()
    },
    resetError() {
      errorState.set(null)
    },
    forceUpdate() {
      forceRenderFn.current?.()
    }
  }

  if (refCallback) {
    refCallback(refObj)
  }

  return render
}

// Re-export createErrorRender for use in tests and fallback generation
export { createErrorRender }
