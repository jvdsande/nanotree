/// <reference lib="DOM" />

declare namespace tree.JSX {
  import { ReadableAtom } from 'nanostores'
  import { NanoTreeNode } from 'nanotree'
  import { ClassValue } from 'clsx'

  type Element = NanoTreeNode
  type IntrinsicElements = IntrinsicElementMap

  type IntrinsicElementMap = {
    [K in keyof HTMLElementTagNameMap]:
    {
      children?: NanoTreeNode
      $events?: {
        [K in keyof HTMLElementEventMap]?:
        | ((this: T, ev: HTMLElementEventMap[K] & { currentTarget: T }) => any)
        | [
        (this: T, ev: HTMLElementEventMap[K] & { currentTarget: T }) => any,
        Omit<AddEventListenerOptions, 'once'>,
      ]
      }
      $props?: Omit<{
        [key in keyof HTMLElementTagNameMap[K]]?: HTMLElementTagNameMap[K][key] | ReadableAtom<HTMLElementTagNameMap[K][key]>
      }, 'className'> & {
        className?: ClassValue
      }
    }
  }

  type Component = {
    (properties: { $props: any, $events: any }, children?: NanoTreeNode): NanoTreeNode
  }
  type ElementType = string | Component
}

declare namespace JSX {
  type Element = tree.JSX.Element
  type IntrinsicElements = tree.JSX.IntrinsicElements
  type Component = tree.JSX.Component
  type ElementType = tree.JSX.ElementType
}
