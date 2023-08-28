import { element } from '../methods/element'
import { NanoTreeElement, NanoTreeNode } from '../interfaces'

export function tree(
  Comp: string | ((...args: any[]) => any),
  props: any,
  ...children: any[]
): NanoTreeNode {
  if (typeof Comp === 'string') {
    const events: Record<
      string,
      (...args: any[]) => any | [(...args: any[]) => any]
    > = props.$events ?? {}
    const properties: Record<string, any> = props.$props ?? {}

    return element(Comp as keyof HTMLElementTagNameMap)
      .props(properties)
      .events(events)
      .nodes(children)
  }
  return Comp(props, children)
}

tree.Fragment = (_: never, children: NanoTreeNode[]) => children

export const elementWrapper = <
  K extends keyof HTMLElementTagNameMap,
  T extends HTMLElement = HTMLElementTagNameMap[K],
>(
  tagName: K,
): NanoTreeElement<T> => {
  return {
    prop(...args: Parameters<NanoTreeElement<T>['prop']>) {
      return element<K, T>(tagName).prop(...args)
    },
    props(...args: Parameters<NanoTreeElement<T>['props']>) {
      return element<K, T>(tagName).props(...args)
    },
    events(...args: Parameters<NanoTreeElement<T>['events']>) {
      return element<K, T>(tagName).events(...args)
    },
    event(...args: Parameters<NanoTreeElement<T>['event']>) {
      return element<K, T>(tagName).event(...args)
    },
    nodes(...args: Parameters<NanoTreeElement<T>['nodes']>) {
      return element<K, T>(tagName).nodes(...args)
    },
    node(...args: Parameters<NanoTreeElement<T>['node']>) {
      return element<K, T>(tagName).node(...args)
    },
    mount(...args: Parameters<NanoTreeElement<T>['mount']>) {
      return element<K, T>(tagName).mount(...args)
    },
  }
}
