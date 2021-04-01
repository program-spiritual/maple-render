import {VNodeFlags} from "@/enum/VNodeFlags";
import {ChildrenFlags} from "@/enum/ChildrenFlags";

export const Fragment = Symbol.for('Fragment')
export const Portal = Symbol.for('Portal')

export function h(tag:any, data = null, children = null) {
  let flags = null
  if (typeof tag === 'string') {
    flags = tag === 'svg' ? VNodeFlags.ELEMENT_SVG : VNodeFlags.ELEMENT_HTML
  } else if (tag === Fragment) {
    flags = VNodeFlags.FRAGMENT
  } else if (tag === Portal) {
    flags = VNodeFlags.PORTAL
    tag = data && data.target
  } else {
    if (tag !== null && typeof tag === 'object') {
      flags = tag.functional
        ? VNodeFlags.COMPONENT_FUNCTIONAL // functional
        : VNodeFlags.COMPONENT_STATEFUL_NORMAL // stateful
    } else if (typeof tag === 'function') {
      flags =
        tag.prototype && tag.prototype.render
          ? VNodeFlags.COMPONENT_STATEFUL_NORMAL
          : VNodeFlags.COMPONENT_FUNCTIONAL
    }
  }

  let childFlags = null
  if (!Array.isArray(children)) {
    if (children == null) {
      childFlags = ChildrenFlags.NO_CHILDREN
    } else if (children._isVNode) {
      childFlags = ChildrenFlags.SINGLE_VNODE
    } else {
      childFlags = ChildrenFlags.SINGLE_VNODE
      children = createTextVNode(children + '')
    }
  } else {
    const {length} = children
    switch (length) {
      case 0:
        childFlags = ChildrenFlags.NO_CHILDREN
        break
      case 1:
        childFlags = ChildrenFlags.SINGLE_VNODE
        children = children[0]
        break
      default:
        childFlags = ChildrenFlags.KEYED_VNODES
        children = normalizeVNodes(children)
        break
    }
  }

  return {
    _isVNode: true,
    tag,
    data,
    key: data && data.key ? data.key : null,
    children,
    flags,
    childFlags,
    el: null,
  }
}


export function createTextVNode(text: string) {
  return {
    _isVNode: true,
    flags: VNodeFlags.TEXT,
    tag: null,
    data: null,
    children: text,
    childFlags: ChildrenFlags.NO_CHILDREN,
    el: null,
  }
}

export function normalizeVNodes(children: Array<any>) {
  const newChildren = []
  // 遍历 children
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    if (child.key == null) {
      child.key = '|' + i
    }
    newChildren.push(child)
  }
  return newChildren
}
