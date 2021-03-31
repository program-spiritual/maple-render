import {VNodeFlags} from './enum/VNodeFlags'
import {ChildrenFlags} from './enum/ChildrenFlags'
import {VNode} from './interface/VNode'
import {isObject, isArray, isString} from './util'
import {domPropsRE} from './rule'

export const Fragment = Symbol.for('Fragment')
export const Portal = Symbol.for('Portal')

function normalizeVNodes(children: any) {
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

function normalizeClass(classValue: any) {
  function concatString() {
    for (let i = 0; i < classValue.length; i++) {
      res += normalizeClass(classValue[i]) + ' '
    }
  }

  function concatObjectValue() {
    for (const name in classValue) {
      if (classValue[name]) {
        res += name + ' '
      }
    }
  }

  let res = ''
  isString(classValue) && (res = classValue)
  isArray(classValue) && concatString()
  isObject(classValue) && concatObjectValue()

  return res.trim()
}

function createTextVNode(text: string) {
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

export function h(tag, data = null, children = null) {
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
    children,
    flags,
    childFlags,
    el: null,
  }
}

/**
 * mount normal elements
 * @param vnode {VNode}
 * @param container {HTMLElement}
 * @param isSVG {boolean}
 */
function mountElement(
  vnode: VNode,
  container: HTMLElement,
  isSVG: boolean | number,
) {
  isSVG = isSVG || vnode.flags & VNodeFlags.ELEMENT_SVG

  // -----------------------------------------------------------------------------------------------------------------
  // line:112; description:2021/3/29; bind style options
  // -----------------------------------------------------------------------------------------------------------------
  function bindStyle() {
    // If VNodeData exists, traverse it
    for (let key in data) {
      // key maybe class、style、on etc.
      switch (key) {
        case 'style':
          // if key' value is style，it  is inline style, apply style rules to el one by one
          for (let k in data.style) {
            if (data.style[k]) {
              el.style[k] = data.style[k]
            }
          }
          break
        case 'class':
          if (isSVG) {
            el.setAttribute('class', normalizeClass(data[key]))
          } else {
            el.className = normalizeClass(data[key])
          }
          break
        default:
          if (key.charAt(0) === 'o' && key.charAt(1) === 'n') {
            // add event
            el.addEventListener(key.slice(2), data[key])
          } else if (domPropsRE.test(key)) {
            // treat it as DOM property
            el[key] = data[key]
          } else {
            // treat it as attributes
            el.setAttribute(key, data[key])
          }
      }
    }
  }

  // -----------------------------------------------------------------------------------------------------------------
  // line:129; description:2021/3/29; bind children options
  // -----------------------------------------------------------------------------------------------------------------
  function bindChildren() {
    // -----------------------------------------------------------------------------------------------------------------
    // line:188; description:2021/3/30; No need to recursive mount if there are no child nodes
    // -----------------------------------------------------------------------------------------------------------------
    if (childFlags === ChildrenFlags.NO_CHILDREN) {
      return
    }
    if (childFlags & ChildrenFlags.SINGLE_VNODE) {
      mount(children, el, isSVG)
    } else if (childFlags & ChildrenFlags.MULTIPLE_VNODES) {
      for (const child of children) {
        mount(child, el, isSVG)
      }
    }
  }

  const el = isSVG
    ? document.createElementNS('http://www.w3.org/2000/svg', vnode.tag)
    : document.createElement(vnode.tag)
  const data = vnode.data
  data && bindStyle()
  // child flags children
  const childFlags = vnode.childFlags
  const children = vnode.children
  // bind children
  bindChildren()
  vnode.el = el
  container.appendChild(el)
}

function mountStatefulComponent(vnode: VNode, container: HTMLElement, isSVG) {
  const instance = new vnode.tag()
  instance.$vnode = instance.render()
  mount(instance.$vnode, container, isSVG)
  instance.$el = vnode.el = instance.$vnode.el
}

function mountFunctionalComponent(vnode: VNode, container: HTMLElement, isSVG) {
  const $vnode = vnode.tag()
  mount($vnode, container, isSVG)
  vnode.el = $vnode.el
}

/**
 * mount components
 * @param vnode {VNode}
 * @param container {HTMLElement}
 * @param isSVG
 */
function mountComponent(vnode: VNode, container: HTMLElement, isSVG) {
  const {flags} = vnode
  if (flags & VNodeFlags.COMPONENT_STATEFUL) {
    mountStatefulComponent(vnode, container, isSVG)
  } else {
    mountFunctionalComponent(vnode, container, isSVG)
  }
}

/**
 * mount text
 * @param vnode {VNode}
 * @param container {HTMLElement}
 */
function mountText(vnode: VNode, container: HTMLElement) {
  const el = document.createTextNode(vnode.children)
  vnode.el = el
  container.appendChild(el)
}

/**
 * mount Fragment
 * @param vnode {VNode}
 * @param container {HTMLElement}
 * @param isSVG
 */
function mountFragment(vnode: VNode, container: HTMLElement, isSVG) {
  const {children, childFlags} = vnode
  switch (childFlags) {
    case ChildrenFlags.NO_CHILDREN:
      const placeholder = createTextVNode('')
      mountText(placeholder, container)
      vnode.el = placeholder.el
      break
    case ChildrenFlags.SINGLE_VNODE:
      mount(children, container, isSVG)
      vnode.el = children.el
      break
    default:
      for (const node of children) {
        mount(node, container, isSVG)
      }
      vnode.el = children[0].el
  }
}

/**
 * mount Portal
 * @param vnode {VNode}
 * @param container {HTMLElement}
 * @param isSVG
 */
function mountPortal(vnode: VNode, container: HTMLElement, isSVG) {
  const {tag, children, childFlags} = vnode
  const target = typeof tag === 'string' ? document.querySelector(tag) : tag
  if (childFlags & ChildrenFlags.SINGLE_VNODE) {
    // -----------------------------------------------------------------------------------------------------------------
    // line:273; description:2021/3/30; single node
    // -----------------------------------------------------------------------------------------------------------------
    mount(vnode, target)
  } else if (childFlags & ChildrenFlags.MULTIPLE_VNODES) {
    // -----------------------------------------------------------------------------------------------------------------
    // line:278; description:2021/3/30; multiple nodes
    // -----------------------------------------------------------------------------------------------------------------
    for (const child of children) {
      mount(child, target)
    }
  }
  const placeholder = createTextVNode('')
  mountText(placeholder, container)
  vnode.el = placeholder.el
}

/**
 * render function
 * @param vnode {VNode}
 * @param container {HTMLElement}
 * @param isSVG {boolean}
 */
function mount(vnode: VNode, container: HTMLElement, isSVG?) {
  const {flags} = vnode
  if (flags & VNodeFlags.ELEMENT) {
    // mount normal label
    mountElement(vnode, container, isSVG)
  } else if (flags & VNodeFlags.COMPONENT) {
    // mount component
    mountComponent(vnode, container, isSVG)
  } else if (flags & VNodeFlags.TEXT) {
    // mount pure text
    mountText(vnode, container)
  } else if (flags & VNodeFlags.FRAGMENT) {
    // mount Fragment
    mountFragment(vnode, container, isSVG)
  } else if (flags & VNodeFlags.PORTAL) {
    // mount Portal
    mountPortal(vnode, container, isSVG)
  }
}

function replaceVNode(prevVNode: VNode, nextVNode: VNode, container: HTMLElement) {
  container.removeChild(prevVNode.el)
  mount(nextVNode, container)
}

function patchElement(prevVNode: VNode, nextVNode: VNode, container: HTMLElement) {
  function doPatch() {

    for (let nextDataKey in nextData) {
      const prevVal = prevData[nextDataKey]
      const nextVal = nextData[nextDataKey]
      switch (nextDataKey) {
        case 'style':
          for (const k in nextVal) {
            el.style[k] = nextVal[k]
          }
          for (let k in prevVal) {
            if (!nextVal.hasOwnProperty(k)) {
              el.style[k] = ''
            }
          }
          break;
        default:
          break;
      }
    }
  }

  // -----------------------------------------------------------------------------------------------------------------
  // line:327; description:2021/3/31; We think different labels render different content
  // -----------------------------------------------------------------------------------------------------------------
  if (prevVNode.tag !== nextVNode.tag) {
    replaceVNode(prevVNode, nextVNode, container)
    return
  }
  const el = (nextVNode.el = prevVNode.el)
  const prevData = prevVNode.data
  const nextData = nextVNode.data
  nextData && doPatch()
}

function patchComponent(prevVNode: VNode, nextVNode: VNode, container: HTMLElement) {

}

function patchText(prevVNode: VNode, nextVNode: VNode) {

}

function patchFragment(prevVNode: VNode, nextVNode: VNode, container: HTMLElement) {

}

function patchPortal(prevVNode: VNode, nextVNode: VNode) {

}

/**
 * patch
 * @param prevVNode {VNode}
 * @param nextVNode {VNode}
 * @param container {HTMLElement}-
 */
function patch(prevVNode: VNode, nextVNode: VNode, container: HTMLElement) {
  const nextFlags = nextVNode.flags
  const prevFlags = prevVNode.flags
  if (prevFlags !== nextFlags) {
    replaceVNode(prevVNode, nextVNode, container)
  } else if (nextFlags & VNodeFlags.ELEMENT) {
    patchElement(prevVNode, nextVNode, container)
  } else if (nextFlags & VNodeFlags.COMPONENT) {
    patchComponent(prevVNode, nextVNode, container)
  } else if (nextFlags & VNodeFlags.TEXT) {
    patchText(prevVNode, nextVNode)
  } else if (nextFlags & VNodeFlags.FRAGMENT) {
    patchFragment(prevVNode, nextVNode, container)
  } else if (nextFlags & VNodeFlags.PORTAL) {
    patchPortal(prevVNode, nextVNode)
  }
}

/**
 * render function
 * @param vnode {VNode}
 * @param container {HTMLElement}
 */
export function render(
  vnode: VNode,
  container: HTMLElement & { vnode?: VNode },
) {
  const prevVNode = container.vnode
  if (prevVNode == null) {
    if (vnode) {
      // -----------------------------------------------------------------------------------------------------------------
      // line:324; description:2021/3/30;
      // There is no old VNode, only a new VNode.
      // Use the `mount` function to mount a brand new VNode
      // -----------------------------------------------------------------------------------------------------------------
      mount(vnode, container)
      // -----------------------------------------------------------------------------------------------------------------
      // line:330; description:2021/3/30;
      // Add the new VNode to the container.vnode property, so that the old VNode will exist in the next rendering
      // -----------------------------------------------------------------------------------------------------------------
      container.vnode = vnode
    }
  } else {
    if (vnode) {
      // -----------------------------------------------------------------------------------------------------------------
      // line:332; description:2021/3/30;
      // There are old VNodes, and there are new VNodes.
      // Then call the `patch` function to patch
      // -----------------------------------------------------------------------------------------------------------------
      patch(prevVNode, vnode, container)
      // update container.vnode
      container.vnode = vnode
    } else {
      // -----------------------------------------------------------------------------------------------------------------
      // line:338; description:2021/3/30;       // There is an old VNode but no new VNode,\
      // which means that the DOM should be removed. You can use the removeChild function in the browser.
      // -----------------------------------------------------------------------------------------------------------------
      container.removeChild(prevVNode.el)
      container.vnode = null
    }
  }
}
