import cx from 'clsx'
import type {ReadableAtom} from 'nanostores'

export type OrClassName<
  Key extends string | number | symbol,
  Value,
> = Key extends 'className' ? Parameters<typeof cx>[0] : Value
export type NonFunction<T extends {}> =
  | {
  [k in keyof T]: NonNullable<T[k]> extends (...args: any[]) => any
    ? never
    : k
}[keyof T]
  | `${string}-${string}`

export interface NanoTreeElement<T extends HTMLElement> {
  prop<K extends NonFunction<T>>(
    key: K,
    value: OrClassName<
      K,
      | (K extends keyof T ? T[K] : string | number | boolean)
      | ReadableAtom<K extends keyof T ? T[K] : string | number | boolean>
    >,
  ): this,
  props(
    properties: {
      [K in NonFunction<T>]?: OrClassName<
        K,
        | (K extends keyof T ? T[K] : string | number | boolean)
        | ReadableAtom<K extends keyof T ? T[K] : string>
      >
    },
    strategy?: 'merge' | 'replace',
  ): this
  events(events: {
    [K in keyof HTMLElementEventMap]?:
    | ((this: T, ev: HTMLElementEventMap[K] & { currentTarget: T }) => any)
    | [
    (this: T, ev: HTMLElementEventMap[K] & { currentTarget: T }) => any,
    Omit<AddEventListenerOptions, 'once'>,
  ]
  }): this
  event<K extends keyof HTMLElementEventMap>(
    event: K,
    listener:
      | ((this: T, ev: HTMLElementEventMap[K] & { currentTarget: T }) => any)
      | [
      (this: T, ev: HTMLElementEventMap[K] & { currentTarget: T }) => any,
      Omit<AddEventListenerOptions, 'once'>,
    ],
  ): this,
  nodes(
    children: NanoTreeNode[],
    strategy?: 'append' | 'prepend' | 'replace',
  ): this,
  node(
    child: NanoTreeNode,
    strategy?: 'append' | 'prepend' | 'replace',
  ): this,
  mount(): { element: T, unmount: () => void }
}
export type NanoTreeNode =
  | null
  | undefined
  | number
  | string
  | boolean
  | { render(): NanoTreeNode[]; cleanup: () => void }
  | NanoTreeElement<HTMLElement>
  | ReadableAtom<NanoTreeNode>
  | Array<NanoTreeNode>

export type Chainable<
  Props extends Record<string, unknown> = never,
  Events extends Record<string, CustomEvent> = never,
> = {
  render(): NanoTreeNode[],
  cleanup(): void,
  props(properties: Props): Chainable<Props, Events>,
  events(events: { [k in keyof Events]?: (event: Events[k]) => void }): Chainable<Props, Events>,
  event<E extends keyof Events>(event: E, value: (event: Events[E]) => void): Chainable<Props, Events>,
  nodes(nodes: NanoTreeNode[], strategy: 'append' | 'prepend' | 'replace'): Chainable<Props, Events>,
  node(node: NanoTreeNode, strategy: 'append' | 'prepend' | 'replace'): Chainable<Props, Events>
}
