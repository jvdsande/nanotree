import { NanoTreeNode } from '../interfaces'

export function cleanUpNode(cleanUps: Map<any, () => void>) {
  return (node: HTMLElement | Text | Comment | ChildNode) => {
    cleanUps.get(node)?.()
    if (node.hasChildNodes()) {
      node.childNodes.forEach(cleanUpNode(cleanUps))
    }
  }
}

export function treatNode(cleanUps: Map<any, () => void>) {
  return (
    child: NanoTreeNode,
  ): HTMLElement | Text | Comment | (HTMLElement | Text | Comment)[] => {
    if (Array.isArray(child)) {
      return child.flatMap(treatNode(cleanUps))
    }
    if (typeof child === 'object' && child && 'render' in child) {
      const children = child.render()
      const childrenArray = Array.isArray(children)
        ? children.flatMap(treatNode(cleanUps))
        : [treatNode(cleanUps)(children)].flat()
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
      const getElement = () => [treatNode(cleanUps)(child.get())].flat()
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
