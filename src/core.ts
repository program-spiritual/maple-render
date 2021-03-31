/********************************************************
 * function [normalizeVNodes]: transfer none key VNode to keyed VNode .
 * function [normalizeClass]: transfer Array class style or object style or string style to plain text .
 *
 *
 * ********************************************************/

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
  // const instance = new vnode.tag()
  // assign instance ref to vnode.children and it would be used in next update runtime
  const instance = (vnode.children = new vnode.tag())
  instance.$props = vnode.data
  instance._update = function () {
    if (instance._mounted) {
      const prevVNode = instance.$vnode
      const nextVNode = (instance.$vnode = instance.render())
      // parentNode is Node interface 's property ,
      patch(prevVNode, nextVNode, prevVNode.el.parentNode)
      instance.$el = vnode.el = instance.$vnode.el
    } else {
      instance.$vnode = instance.render()
      mount(instance.$vnode, container, isSVG)
      instance._mounted = true
      instance.$el = vnode.el = instance.$vnode.el
      instance.mounted && instance.mounted()
    }

  }
  instance._update()
}

function mountFunctionalComponent(vnode: VNode, container: HTMLElement, isSVG) {
  vnode.handle = {
    prev: null,
    next: vnode,
    container,
    update: () => {
      if (vnode.handle.prev) {
        const prevVNode = vnode.handle.prev
        const nextVNode = vnode.handle.next
        const prevTree = prevVNode.children
        const props = vnode.data
        const nextTree = (nextVNode.children = nextVNode.tag(props))
        patch(prevTree, nextTree, vnode.handle.container)
      } else {
        const props = vnode.data
        const $vnode = (vnode.children = vnode.tag(props))
        mount($vnode, container, isSVG)
        vnode.el = $vnode.el
      }
    }
  }
  vnode.handle.update()
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
  const target = isString(tag) ? document.querySelector(tag) : tag
  if (childFlags & ChildrenFlags.SINGLE_VNODE) {
    mount(children, target)
  } else if (childFlags & ChildrenFlags.MULTIPLE_VNODES) {
    for (const child of children) {
      mount(child, target)
    }
  }
  // 占位的空文本节点
  const placeholder = createTextVNode('')
  // 将该节点挂载到 container 中
  mountText(placeholder, container)
  // el 属性引用该节点
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
  if (prevVNode.flags & VNodeFlags.COMPONENT_STATEFUL_NORMAL) {
    // VNode.children is the instance of stateful component
    const instance = prevVNode.children
    instance.unmounted && instance.unmounted()
  }
  mount(nextVNode, container)
}

function patchData(el: HTMLElement, key: string, prevValue: any, nextValue: any) {
  switch (key) {
    case 'style':
      for (const k in nextValue) {
        el.style[k] = nextValue[k]
      }
      for (let k in prevValue) {
        if (!nextValue.hasOwnProperty(k)) {
          el.style[k] = ''
        }
      }
      break;
    case 'class':
      el.className = nextValue
      break
    default:
      if (key.charAt(0) === 'o' && key.charAt(1) === 'n') {
        // event
        // if it has old value
        if (prevValue) {
          el.removeEventListener(key.slice(2), prevValue)
        }
        // if it has new value
        if (nextValue) {
          el.addEventListener(key.slice(2), nextValue);
        }
      } else if (domPropsRE.test(key)) {
        // treat it as DOM props
        el[key] = nextValue
      } else {
        // treat it as attributes
        el.setAttribute(key, nextValue)
      }
      break
  }
}

function patchChildren(prevChildFlags: number, nextChildFlags: number, prevChildren: any, nextChildren: any, container: HTMLElement) {
  switch (prevChildFlags) {
    case ChildrenFlags.SINGLE_VNODE:
      switch (nextChildFlags) {
        case ChildrenFlags.SINGLE_VNODE:
          patch(prevChildren, nextChildren, container)
          break
        case ChildrenFlags.NO_CHILDREN:
          container.removeChild(prevChildren.el)
          break
        default:
          container.removeChild(prevChildren.el)
          for (const node of nextChildren) {
            mount(node, container)
          }
          break
      }
      break
    case ChildrenFlags.NO_CHILDREN:
      switch (nextChildFlags) {
        case ChildrenFlags.SINGLE_VNODE:
          mount(nextChildren, container)
          break
        case ChildrenFlags.NO_CHILDREN:
          break;
        default:
          for (const nextChild of nextChildren) {
            mount(nextChild, container)
          }
          break
      }
      break;
    default:
      // multiple nodes
      switch (nextChildFlags) {
        case ChildrenFlags.SINGLE_VNODE:
          for (const prevChild of prevChildren) {
            container.removeChild(prevChild.el)
          }
          mount(nextChildren, container)
          break
        case ChildrenFlags.NO_CHILDREN:
          for (const prevChild of prevChildren) {
            container.removeChild(prevChild.el)
          }
          break
        default:
          // simple version
          for (const prevChild of prevChildren) {
            container.removeChild(prevChild.el)
          }
          for (const nextChild of nextChildren) {
            mount(nextChild, container)
          }
          break
      }
      break;
  }
}

function patchElement(prevVNode: VNode, nextVNode: VNode, container: HTMLElement) {
  function doPatchNext() {

    for (let nextDataKey in nextData) {
      const prevVal = prevData[nextDataKey]
      const nextVal = nextData[nextDataKey]
      patchData(el, nextDataKey, prevVal, nextVal)
    }
  }

  function doPathPrev() {
    for (const prevDataKey in prevData) {
      const prevValue = prevData[prevDataKey]
      if (prevValue && !nextData.hasOwnProperty(prevDataKey)) {
        patchData(el, prevDataKey, prevValue, null)
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
  nextData && doPatchNext()
  prevData && doPathPrev()

  patchChildren(
    prevVNode.childFlags,
    nextVNode.childFlags,
    prevVNode.children,
    nextVNode.children,
    el
  )
}

function patchComponent(prevVNode: VNode, nextVNode: VNode, container: HTMLElement) {
  if (nextVNode.tag !== prevVNode.tag) {
    replaceVNode(prevVNode, nextVNode, container)
  } else if (nextVNode.flags & VNodeFlags.COMPONENT_STATEFUL_NORMAL) {
    const instance = (nextVNode.children = prevVNode.children);
    instance.$props = nextVNode.data;
    instance._update();
  } else {
    // functional component  update coding
    const handle = (nextVNode.handle = prevVNode.handle)
    handle.prev = prevVNode
    handle.next = nextVNode
    handle.container = container
    handle.update()
  }
}

function patchText(prevVNode: VNode, nextVNode: VNode) {
  const el = (nextVNode.el = prevVNode.el)
  if (nextVNode.children !== prevVNode.children) {
    el.nodeValue = nextVNode.children
  }
}

function patchFragment(prevVNode: VNode, nextVNode: VNode, container: HTMLElement) {
  patchChildren(prevVNode.childFlags, nextVNode.childFlags, prevVNode.children, nextVNode.children, container)
  switch (nextVNode.childFlags) {
    case ChildrenFlags.NO_CHILDREN:
      nextVNode.el = prevVNode.el
      break
    case ChildrenFlags.SINGLE_VNODE:
      nextVNode.el = prevVNode.children.el
      break;
    default:
      nextVNode.el = prevVNode.children[0].el
      break
  }
}

function patchPortal(prevVNode: VNode, nextVNode: VNode) {
  patchChildren(
    prevVNode.childFlags,
    nextVNode.childFlags,
    prevVNode.children,
    nextVNode.children,
    prevVNode.tag
  )
  nextVNode.el = prevVNode.el
  // compare prev tag and next tag
  if (nextVNode.tag !== prevVNode.tag) {
    const newContainer = typeof nextVNode.tag === 'string'
      ? document.querySelector(nextVNode.tag)
      : nextVNode.tag
    switch (nextVNode.childFlags) {
      case ChildrenFlags.SINGLE_VNODE:
        newContainer.appendChild(nextVNode.children.el)
        break;
      case ChildrenFlags.NO_CHILDREN:
        // nothing to do
        break
      default:
        for (let i = 0; i < nextVNode.children.length; i++) {
          newContainer.appendChild(nextVNode.children[i].el)
        }
        break;
    }
  }
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
