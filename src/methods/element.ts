import { ReadableAtom } from 'nanostores'
import cx from 'clsx'
import { NanoTreeElement, NanoTreeNode, NonFunction, OrClassName } from '../interfaces'
import { cleanUpNode, treatNode } from '../helpers/node'

export function element<
  K extends keyof HTMLElementTagNameMap,
  T extends HTMLElement = HTMLElementTagNameMap[K],
>(tagName: K): NanoTreeElement<T> {
  const config = {
    children: [] as NanoTreeNode[],
    properties: {} as {
      [K in NonFunction<T>]?: OrClassName<
        K,
        | (K extends keyof T ? T[K] : string | number | boolean)
        | ReadableAtom<K extends keyof T ? T[K] : string | number | boolean>
      >
    },
    events: {} as {
      [K in keyof HTMLElementEventMap]?:
      | ((this: T, ev: HTMLElementEventMap[K] & { currentTarget: T }) => any)
      | [
      (this: T, ev: HTMLElementEventMap[K] & { currentTarget: T }) => any,
      Omit<AddEventListenerOptions, 'once'>,
    ]
    },
  }

  return {
    prop<K extends NonFunction<T>>(
      key: K,
      value: OrClassName<
        K,
        | (K extends keyof T ? T[K] : string | number | boolean)
        | ReadableAtom<K extends keyof T ? T[K] : string | number | boolean>
      >,
    ) {
      config.properties[key] = value
      return this
    },
    props(
      properties: {
        [K in NonFunction<T>]?: OrClassName<
          K,
          | (K extends keyof T ? T[K] : string | number | boolean)
          | ReadableAtom<K extends keyof T ? T[K] : string>
        >
      },
      strategy: 'merge' | 'replace' = 'merge',
    ) {
      if (strategy === 'replace') {
        config.properties = properties
      } else {
        config.properties = Object.assign(config.properties, properties)
      }
      return this
    },
    events(events: {
      [K in keyof HTMLElementEventMap]?:
      | ((this: T, ev: HTMLElementEventMap[K] & { currentTarget: T }) => any)
      | [
      (this: T, ev: HTMLElementEventMap[K] & { currentTarget: T }) => any,
      Omit<AddEventListenerOptions, 'once'>,
    ]
    }) {
      config.events = events
      return this
    },
    event<K extends keyof HTMLElementEventMap>(
      event: K,
      listener:
        | ((this: T, ev: HTMLElementEventMap[K] & { currentTarget: T }) => any)
        | [
        (this: T, ev: HTMLElementEventMap[K] & { currentTarget: T }) => any,
        Omit<AddEventListenerOptions, 'once'>,
      ],
    ) {
      config.events[event] = listener as any
      return this
    },
    nodes(
      children: NanoTreeNode[],
      strategy: 'append' | 'prepend' | 'replace' = 'append',
    ) {
      if (strategy === 'append') {
        config.children.push(...children)
      } else if (strategy === 'prepend') {
        config.children.unshift(...children)
      } else {
        config.children = children
      }
      return this
    },
    node(
      child: NanoTreeNode,
      strategy: 'append' | 'prepend' | 'replace' = 'append',
    ) {
      return this.nodes([child], strategy)
    },
    mount() {
      const element = document.createElement(tagName) as unknown as T
      const applyProperty = <K extends keyof T>(key: K, value: T[K]) => {
        if (key === 'className' && Array.isArray(value)) {
          element[key] = cx(value) as T[K]
        } else if (element[key] !== value) {
          element[key] = value
        }
      }
      const setProperty = <K extends keyof T>(
        key: K,
        value: T[K],
        subscribe: boolean,
      ) => {
        if (
          value &&
          typeof value === 'object' &&
          'get' in value &&
          'subscribe' in value &&
          typeof value.subscribe === 'function' &&
          typeof value.get === 'function'
        ) {
          if (subscribe) {
            value.subscribe((val: T[K]) => {
              applyProperty(key, val)
            })
          } else {
            applyProperty(key, value.get() as T[K])
          }
        } else {
          applyProperty(key, value)
        }
      }
      Object.entries(config.properties).forEach(([key, value]) => {
        setProperty(key as keyof T, value as T[keyof T], true)
      })
      Object.entries(config.events).forEach(([event, listener]) => {
        if (!Array.isArray(listener)) {
          element.addEventListener(event, listener as any)
        } else {
          element.addEventListener(event, ...(listener as [any, any]))
        }
      })
      const control = () => {
        Object.entries(config.properties).forEach(([key, value]) => {
          setProperty(key as keyof T, value as T[keyof T], false)
        })
      }
      const mutationObserver = new MutationObserver(control)
      element.addEventListener('change', control, {passive: true})
      element.addEventListener('input', control, {passive: true})
      mutationObserver.observe(element, {attributes: true})
      const dispatchEvent = element.dispatchEvent
      element.dispatchEvent = function (
        ...args: Parameters<T['dispatchEvent']>
      ) {
        control()
        return dispatchEvent(...(args as [any]))
      }.bind(element)

      const cleanUps = new Map<any, () => void>()

      config.children?.length &&
      element.replaceChildren(
        ...config.children.flat().flatMap(treatNode(cleanUps)),
      )

      const unmount = () => {
        cleanUpNode(cleanUps)(element)
        mutationObserver.disconnect()
        element.dispatchEvent = dispatchEvent
        element.removeEventListener('change', control)
        element.removeEventListener('input', control)
      }

      return {element, unmount}
    },
  }
}
