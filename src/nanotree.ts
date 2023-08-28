import cx from 'clsx'
import type {ReadableAtom} from 'nanostores'

type OrClassName<
  Key extends string | number | symbol,
  Value,
> = Key extends 'className' ? Parameters<typeof cx>[0] : Value
type NonFunction<T extends {}> =
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

function cleanUpNode(cleanUps: Map<any, () => void>) {
  return (node: HTMLElement | Text | Comment | ChildNode) => {
    cleanUps.get(node)?.()
    if (node.hasChildNodes()) {
      node.childNodes.forEach(cleanUpNode(cleanUps))
    }
  }
}

function treatChild(cleanUps: Map<any, () => void>) {
  return (
    child: NanoTreeNode,
  ): HTMLElement | Text | Comment | (HTMLElement | Text | Comment)[] => {
    if (Array.isArray(child)) {
      return child.flatMap(treatChild(cleanUps))
    }
    if (typeof child === 'object' && child && 'render' in child) {
      const children = child.render()
      const childrenArray = Array.isArray(children)
        ? children.flatMap(treatChild(cleanUps))
        : [treatChild(cleanUps)(children)].flat()
      const component = document.createTextNode('')
      childrenArray.unshift(component)
      cleanUps.set(component, () => {
        cleanUps.delete(component)
        child.cleanup()
      })
      return childrenArray
    }
    if (typeof child === 'object' && child && 'mount' in child) {
      const childElement = child.mount()
      cleanUps.set(childElement.element, () => {
        cleanUps.delete(childElement.element)
        childElement.unmount()
      })
      return childElement.element
    }
    if (typeof child === 'object' && child && 'get' in child) {
      const getElement = () => [treatChild(cleanUps)(child.get())].flat()
      const childArray = getElement()
      const start = document.createTextNode('')
      const end = document.createTextNode('')
      childArray.unshift(start)
      childArray.push(end)

      const unsubscribe = child.listen(() => {
        const next = getElement()
        let child = start.nextSibling
        while (child && child !== end) {
          const sibling = child.nextSibling
          cleanUpNode(cleanUps)(child)
          child.remove()
          child = sibling
        }
        start.after(...next)
      })

      cleanUps.set(start, () => {
        cleanUps.delete(start)
        unsubscribe()
      })

      return childArray
    }
    if (typeof child === 'function') {
      console.error(
        'Functions are not valid as child nodes, found',
        child,
        '\nDid you mean to call it instead?',
      )
      return document.createComment('NanoDOM: Invalid child')
    }
    return document.createTextNode(`${child ?? ''}`)
  }
}

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
        ...config.children.flat().flatMap(treatChild(cleanUps)),
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

const mountPoints = new Map<any, () => void>()

export function mount(
  el: NanoTreeNode,
  target: HTMLElement | undefined | null = undefined,
) {
  const cleanUps = new Map<any, () => void>()
  const children = [treatChild(cleanUps)(el)].flat()

  if (target) {
    mountPoints.get(target)?.()
    target.replaceChildren(...children)
    mountPoints.set(target, () => {
      children.forEach(cleanUpNode(cleanUps))
    })
  }

  return {
    nodes: children,
    unmount: () => {
      children.forEach(cleanUpNode(cleanUps))
      target?.replaceChildren()
    },
  }
}

export function unmount(target: HTMLElement | null) {
  if (target) {
    mountPoints.get(target)?.()
    target?.replaceChildren()
  }
}

function chainedComponent<
  Props extends Record<string, unknown> = never,
  Events extends Record<string, CustomEvent> = never,
>(
  comp: (helpers: {
    props: Props
    children: NanoTreeNode[]
    emit: (value: CustomEvent) => void
    effect: (effect: () => void | (() => void)) => void
  }) => NanoTreeNode,
  options: {
    properties?: Partial<Props>,
    events?: { [k in keyof Events]?: (event: Events[k]) => void },
    children?: NanoTreeNode[]
  }
) {
  const cleanUps: (() => void)[] = []
  return {
    render: () => {
      const result = comp({
        props: (options.properties ?? {}) as Props,
        children: options.children ?? [],
        emit: (event) => {
          options.events?.[event.type]?.(event as any)
        },
        effect: (effect) => {
          const cleanUp = effect()
          if (cleanUp) {
            cleanUps.push(cleanUp)
          }
        },
      })
      return [result].flat()
    },
    cleanup: () => cleanUps.forEach((cleanUp) => cleanUp()),

    props(properties: Props) {
      options.properties = properties
      return this
    },
    events(events: { [k in keyof Events]?: (event: Events[k]) => void }) {
      options.events = events
      return this
    },
    event<E extends keyof Events>(event: E, value: (event: Events[E]) => void) {
      options.events = options.events ?? {}
      options.events[event] = value
      return this
    },
    nodes(nodes: NanoTreeNode[], strategy: 'append' | 'prepend' | 'replace') {
      options.children = options.children ?? []
      if (strategy === 'append') {
        options.children!.push(...nodes)
      } else if (strategy === 'prepend') {
        options.children!.unshift(...nodes)
      } else {
        options.children = nodes
      }
      return this
    },
    node(node: NanoTreeNode, strategy: 'append' | 'prepend' | 'replace') {
      return this.nodes([node], strategy)
    },
  }
}

type Chainable<
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

export function component<
  Props extends Record<string, unknown> = never,
  Events extends Record<string, CustomEvent> = never,
>(
  comp: (helpers: {
    props: Props
    children: NanoTreeNode[]
    emit: (value: CustomEvent) => void
    effect: (effect: () => void | (() => void)) => void
  }) => NanoTreeNode,
): ([Props | Events] extends [never] ? ((
  properties?: { $props?: never; $events?: never },
  children?: NanoTreeNode[],
) => { render(): NanoTreeNode[], cleanup(): void }) : ((
  properties: ([Props] extends [never]
    ? { $props?: never }
    : { $props: Props }) &
    ([Events] extends [never]
      ? { $events?: never }
      : {
        $events: { [k in keyof Events]: (event: Events[k]) => void }
      }),
  children?: NanoTreeNode[],
) => { render(): NanoTreeNode[], cleanup(): void })) & {
  props: (props: Props) => Chainable<Props, Events>,
  events: (events: Events) => Chainable<Props, Events>,
  event: <K extends keyof Events>(event: K, listener: (event: Events[K]) => void) => Chainable<Props, Events>,
  nodes: (nodes: NanoTreeNode[]) => Chainable<Props, Events>,
  node: (node: NanoTreeNode) => Chainable<Props, Events>,
} {
  const fn = (
    properties: ([Props] extends [never]
      ? { $props?: never }
      : { $props: Props }) &
      ([Events] extends [never]
        ? { $events?: never }
        : {
          $events: { [k in keyof Events]: (event: Events[k]) => void }
        }) = {} as any,
    children: NanoTreeNode[] = [],
  ) => {
    const cleanUps: (() => void)[] = []
    return {
      render: () => {
        const result = comp({
          props: properties.$props as Props,
          children,
          emit: (event) => {
            properties.$events?.[event.type]?.(event as any)
          },
          effect: (effect) => {
            const cleanUp = effect()
            if (cleanUp) {
              cleanUps.push(cleanUp)
            }
          },
        })
        return [result].flat()
      },
      cleanup: () => cleanUps.forEach((cleanUp) => cleanUp()),
    }
  }

  fn.props = (properties: Props) => {
    return chainedComponent<Props, Events>(comp, {properties})
  }
  fn.events = (events: { [k in keyof Events]?: (event: Events[k]) => void }) => {
    return chainedComponent<Props, Events>(comp, {events})
  }
  fn.event = <E extends keyof Events>(event: E, value: (event: Events[E]) => void) => {
    return chainedComponent<Props, Events>(comp, {events: {[event]: value} as any})
  }
  fn.nodes = (nodes: NanoTreeNode[]) => {
    return chainedComponent<Props, Events>(comp, {children: nodes})
  }
  fn.node = (node: NanoTreeNode) => {
    return chainedComponent<Props, Events>(comp, {children: [node]})
  }

  return fn as any
}
