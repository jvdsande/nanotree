# NanoTree

NanoTree is a lightweight, type-safe, and reactive web UI library built with TypeScript.

The library uses [Nanostores](https://npmjs.com/package/nanostores) for state management and 
provides utilities for DOM manipulation, components creation, and event handling.

## Installation

```bash
npm install @nanotree/core nanostores
```

```bash
yarn add @nanotree/core nanostores
```

## Basic usage

At its core, Nanotree offer a wrapper around `document.createElement` which adds the ability to
bind a `nanostores` atom to either an element property, or one of its nodes.

Creating a reactive element is done through the `element` helper exported by `@nanotree/core`:

```ts
const myDiv = element('div')
```

You can then customize your element through chainable modifier methods, allowing you to assign
properties, bind event handlers, or manipulate children:

```ts
myDiv
  // Set a given prop
  .prop('id', 'root')
  // Set one or more props in one go
  .props({ className: 'section' })
  // Append a children
  .node(element('span').node('Text content'))
  // Append multiple children
  .nodes([
    'More content',
    element('strong').node('Strong content'),
    element('button')
      // Bind one event listener
      .event('click', someClickListener)
      // Bind multiple events in one go
      .events({
        mouseenter: someHoverStartListener,
        mouseleave: someHoverEndListener
      })
  ])
```

## Binding atoms

You can use `nanostores` atoms as the value for any property you set, or for a text node:

```ts
import { atom } from 'nanostores'
import { element } from '@nanotree/core'

const $value = atom('')
const boundValue = element('section')
  .nodes([
    element('input')
      .prop('value', $value)
      .event('input', (e) => $value.set(e.currentTarget.value)),
    element('p')
      .node($value)
  ])

// The rendered p content will be synced with the input value
```

## Creating reusable components

NanoTree is really permissive in terms of what can be passed as child nodes:

- Any JS primitive type is valid (`string`, `number` and `boolean`), and will get stringified,
- Any NanoTree Element is valid,
- Any `ReadableAtom` wrapping a JS primitive or a NanoTree Element,
- Any array containing valid children,
- `render`/`cleanup` pairs (explained later), wrapped or not in a `ReadableAtom`.

Thanks to this, any function can be used as reusable component as long as it returns valid children.
Since the reactivity is handled through `nanostores` atoms, the main body of a component function is
not called multiple times, only once on mount. You have complete control on when the function is invoked,
and you can take advantage of its closure to handle internal state:

```ts
import { atom } from 'nanostores'
import { element } from '@nanotree/core'

const SimpleCounter = (step: number = 1, defaultValue: number = 0) => {
  const $value = atom(defaultValue)
  const increase = () => $value.set($value.get() + step)
  const decrease = () => $value.set($value.get() - step)
  
  return element('div')
    .nodes([
      element('button').event('click', decrease).node('Decrease'),
      element('span').node($value),
      element('button').event('click', increase).node('Increase')
    ])
}

const myApp = element('main')
  .nodes([
    element('p').node('First Counter:'),
    SimpleCounter(),
    element('p').node('2-by-2 Counter:'),
    SimpleCounter(2, 10)
  ])
```

## Creating side effects with a clean-up step

Sometimes, our components might want to register side effects that should run while the component is mounted,
and stop when unmounted.

To do so, instead of directly returning children, you can return a `render`/`cleanup` pair. The `render` function
will be run when the component mounts, and should return the nodes to render; and the `cleanup` function will be called
on component unmount, and can take care of cleaning up any side effects.

```ts
import { atom } from 'nanostores'
import { element } from '@nanotree/core'

const SimpleCounter = (step: number = 1, defaultValue: number = 0) => {
  const $value = atom(defaultValue)
  const increase = () => $value.set($value.get() + step)
  const decrease = () => $value.set($value.get() - step)
  
  let unsubscribe
  
  return {
    render() {
      unsubscribe = $value.listen((value) => console.log('New counter value:', value))

      return element('div')
        .nodes([
          element('button').event('click', decrease).node('Decrease'),
          element('span').node($value),
          element('button').event('click', increase).node('Increase')
        ])
    },
    cleanup() {
      unsubscribe()
    }
  }
}
```

## Helpers

NanoTree exports some useful helpers to reduce boilerplate.

### HTMLElement shortcuts

You can import the `tree` object from `@nanotree/core`, and use it to access shortcuts for creating HTML elements:

```ts
import { atom } from 'nanostores'
import { tree } from '@nanotree/core'

const $value = atom('')
const boundValue = tree.section
  .nodes([
    tree.input
      .prop('value', $value)
      .event('input', (e) => $value.set(e.currentTarget.value)),
    tree.p
      .node($value)
  ])
```

### Component factory

You can import the `component` method from `@nanotree/core`, and use it to wrap your components to get some
helpful helpers. The `component` factory hides away the complexity of maintaining your own `render`/`cleanup` pairs:

```ts
import { atom } from 'nanostores'
import { tree, component } from '@nanotree/core'

const SimpleCounter = component<{
  step?: number
  defaultValue?: number
}>(({ props: { step = 1, defaultValue = 0 }, effect }) => {
  const $value = atom(defaultValue)
  const increase = () => $value.set($value.get() + step)
  const decrease = () => $value.set($value.get() - step)
  
  effect(() => {
    const unsubscribe = $value.listen((value) => console.log('New counter value:', value))
    return () => unsubscribe()
  })
  
  return tree.div
    .nodes([
      tree.button.event('click', decrease).node('Decrease'),
      tree.span.node($value),
      tree.button.event('click', increase).node('Increase')
    ])
})
```

#### Passing props to a component from the factory

The `component` factory returns a standard function interface, which receives options as a first argument,
and children nodes as second argument.

However, the returned function also contains chainable methods to make passing props, children, or events easier:

```ts
const myApp = tree.main.node(
  SimpleCounter.props({ step: 2, defaultValue: 10 })
)
```

The chainable methods are the same as for elements: `props` to set props, `node`/`nodes` to handle children,
and `event`/`events` to bind events.

`prop` is not available as, contrarily to HTML elements, we can't know in advance if all props are optional, and therefore
it might not make sense to pass partial props. To the same effect, the `props` function requires all required props to
be set, it does not take a partial representation.

#### Emitting and subscribing to events

When calling a component it's possible to pass it a map of event name to event listeners.
An additional helper function is accessible in the component function first argument: `emit`.

This can be used to emit an event that can be listened to by the parent:

```ts
import { component } from '@nanotree/core'

const myEmittingComponent = component<{}, { click: CustomEvent<{ detail: any }> }>(({emit}) => {
  return tree.button.event('click', () => emit(new CustomEvent('click', { detail: 'The button was clicked' })))
})

const myReceivingComponent = component(() => {
  return myEmittingComponent.events({ click: (event) => console.log(event.detail) })
})
```

## JSX support

If you prefer using JSX rather than raw JS for building your UIs, NanoTree got you covered too!

The `tree` export from `@nanotree/core` double-duties as our JSX factory (and JSX namespace if you're using TypeScript).

You can either set your `jsxFactory` config entry to `tree` in your build tool, or use it on a per-file basis by appending
the jsx-transform comments:

```js
// @jsx tree
// @jsxFrag tree.Fragment
```

### Passing props, children, and binding events

NanoTree uses JSX slightly differently from React and such. This is on purpose: it's a way to both simplify our
internal logic, and clearly mark that the React ecosystem cannot be consumed in a NanoTree app. Indeed, the reactive
approach used by NanoTree through atoms makes it impossible to create a compatibility layer to React.

As such, we opted not to support props on JSX tags directly. Instead, props need to be passed down as a JS object,
through the special `$props` JSX prop. The same way, events are still passed as a map of event name to listener, 
through the special `$events` JSX prop. Children are passed as JSX children as usual:

```tsx
import { tree } from '@nanotree/core'
import { SimpleCounter } from './simple-counter'

export const App = () => {
  return (
    <main>
      <SimpleCounter $props={{ step: 2, defaultValue: 10 }} />
    </main>
  )
}
```

Because of this, components usable through JSX must be created through the `component` factory. Direct function calls
are still supported, but not as JSX tag:

```tsx
import { tree } from '@nanotree/core'
import { SimpleCounter } from './simple-counter'

const Title = (message: string) => <h1>This is a direct function, not a component: {message}</h1> 

export const App = () => {
  return (
    <main>
      {/* This will fail: */}
      <Title $props="Hello world" />
      {/* This will work: */}
      {Title('Hello world')}
      <SimpleCounter $props={{ step: 2, defaultValue: 10 }} />
    </main>
  )
}
```

### Configuring JSX with Typescript

In order for Typescript to understand that JSX is not the standard React JSX, but consumes NanoTree instead, you need to
update some fields in your TS Config:

```json5
{
  "compilerOptions": {
    "jsx": "react", // Use the old JSX transform
    "jsxFactory": "tree", // Use `tree` as the JSX factory
    "jsxFragmentFactory": "tree.Fragment", // Use `tree.Fragment` to handle JSX fragments
    "reactNamespace": "tree" // Use `tree` as JSX namespace
  }
}
```
