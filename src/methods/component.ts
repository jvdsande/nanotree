import { NanoTreeNode, Chainable } from '../interfaces'

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
