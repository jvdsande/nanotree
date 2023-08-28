import { NanoTreeNode } from '../interfaces'
import { treatNode, cleanUpNode } from '../helpers/node'

const mountPoints = new Map<any, () => void>()

export function mount(
  el: NanoTreeNode,
  target: HTMLElement | undefined | null = undefined,
) {
  const cleanUps = new Map<any, () => void>()
  const children = [treatNode(cleanUps)(el)].flat()

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
