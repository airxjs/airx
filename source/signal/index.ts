// https://github.com/proposal-signals/signal-polyfill/issues/10
import type { Signal as Polyfill } from 'signal-polyfill'

export declare type Watcher = Polyfill.subtle.Watcher

export * from './signal'
