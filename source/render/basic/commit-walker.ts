import type { AbstractElement, Instance } from './common.js'

interface CommitWalkerOptions<E extends AbstractElement, D> {
  commitInstanceDom: (instance: Instance<E>, oldNode?: D) => void
  getNextSibling: (instance: Instance<E>, node?: D) => D | null | undefined
  getFirstChild: (instance: Instance<E>, node?: D) => D | null | undefined
}

export function createCommitWalker<E extends AbstractElement, D>(
  options: CommitWalkerOptions<E, D>
): (rootInstance: Instance<E>, rootDom?: D) => void {
  const { commitInstanceDom, getNextSibling, getFirstChild } = options

  return function commitWalk(rootInstance: Instance<E>, rootDom?: D) {
    type StackLayer = [Instance<E>, D | undefined] | (() => void)
    const stack: StackLayer[] = [[rootInstance, rootDom]]

    while (stack.length > 0) {
      const stackLayer = stack.pop()!
      if (typeof stackLayer === 'function') {
        stackLayer()
        continue
      }

      const [instance, node] = stackLayer
      commitInstanceDom(instance, node)

      // 执行生命周期的 Mount
      stack.push(() => instance.context.triggerMounted())

      // 更新下一个兄弟节点
      if (instance.sibling != null) {
        const siblingNode = getNextSibling(instance, node)
        stack.push([instance.sibling, siblingNode as D | undefined])
      }

      // 更新下一个子节点
      if (instance.child != null) {
        const childNode = getFirstChild(instance, node)
        stack.push([instance.child, childNode as D | undefined])
      }
    }
  }
}
