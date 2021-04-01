// -----------------------------------------------------------------------------------------------------------------
// line:2; description:2021/4/1; enum
// -----------------------------------------------------------------------------------------------------------------
import {VNodeFlags} from './enum/VNodeFlags'
import {ChildrenFlags} from './enum/ChildrenFlags'
// -----------------------------------------------------------------------------------------------------------------
// line:5; description:2021/4/1; interface
// -----------------------------------------------------------------------------------------------------------------
import {VNode} from './interface/VNode'
import {CustomerRenderOptions} from "./interface/CustomerRenderOptions";
// -----------------------------------------------------------------------------------------------------------------
// line:10; description:2021/4/1; util function
// -----------------------------------------------------------------------------------------------------------------

import {isObject, isArray, isString, lis} from './util'
import {domPropsRE} from './rule'
import {createTextVNode} from "./h";

export default function createRender(options:CustomerRenderOptions) {
  /********************************************************
   * function render: the core method which render VNode to DOM
   *
   *
   * ********************************************************/

  const {
    nodeOps: {
      createElement: platformCreateElement,
      createText: platformCreateText,
      setText: platformSetText, // 等价于 Web 平台的 el.nodeValue
      appendChild: platformAppendChild,
      insertBefore: platformInsertBefore,
      removeChild: platformRemoveChild,
      parentNode: platformParentNode,
      nextSibling: platformNextSibling,
      querySelector: platformQuerySelector
    },
    patchData: platformPatchData
  } = options

  /**
   * render function
   * @param vnode {VNode}
   * @param container {HTMLElement}
   */
   function render(
    vnode: VNode,
    container: any,
  ) {
    const prevVNode = container.vnode
    if (prevVNode == null) {
      if (vnode) {
        mount(vnode, container)
        container.vnode = vnode
      }
    } else {
      if (vnode) {
        patch(prevVNode, vnode, container)
        container.vnode = vnode
      } else {
        platformRemoveChild(container,prevVNode.el)
        container.vnode = null
      }
    }
  }

// -----------------------------------------------------------------------------------------------------------------
// line:16; description:2021/4/1; helper function
// -----------------------------------------------------------------------------------------------------------------
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
   function replaceVNode(prevVNode: VNode, nextVNode: VNode, container: HTMLElement) {
    // container.removeChild(prevVNode.el)
     platformRemoveChild(container,prevVNode.el)
    if (prevVNode.flags & VNodeFlags.COMPONENT_STATEFUL_NORMAL) {
      // VNode.children is the instance of stateful component
      const instance = prevVNode.children
      instance.unmounted && instance.unmounted()
    }
    mount(nextVNode, container)
  }


// -----------------------------------------------------------------------------------------------------------------
// line:52; description:2021/4/1; mount function
// -----------------------------------------------------------------------------------------------------------------
  /**
   * mount normal elements
   * @param vnode {VNode}
   * @param container {HTMLElement}
   * @param isSVG {boolean}
   * @param refNode
   */
   function mountElement(
    vnode: VNode,
    container: HTMLElement,
    isSVG: boolean | number,
    refNode?
  ) {
    isSVG = isSVG || vnode.flags & VNodeFlags.ELEMENT_SVG
    const el = platformCreateElement(vnode.tag, isSVG)
    const data = vnode.data
    vnode.el = el
    if (data) {
      for (let key in data) {
        platformPatchData(el, key, null, data[key])
      }
    }
    const childFlags = vnode.childFlags
    const children = vnode.children

    if (childFlags !== ChildrenFlags.NO_CHILDREN) {
      if (childFlags & ChildrenFlags.SINGLE_VNODE) {
        mount(children, el, isSVG)
      } else if (childFlags & ChildrenFlags.MULTIPLE_VNODES) {
        for (let i = 0; i < children.length; i++) {
          mount(children[i], el, isSVG)
        }
      }
    }
    refNode ? platformInsertBefore(container,el, refNode) : platformAppendChild(container,el)
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
        patch(prevVNode, nextVNode,platformParentNode(prevVNode.el))
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
    const el = platformCreateText(vnode.children)
    vnode.el = el
    // container.appendChild(el)
    platformAppendChild(container,el)
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
    const target = isString(tag) ? platformQuerySelector(tag) : tag
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
   *
   * @param vnode {VNode}
   * @param container {HTMLElement}
   * @param isSVG {boolean}
   * @param refNode
   */
   function mount(vnode: VNode, container: HTMLElement, isSVG?, refNode?) {
    const {flags} = vnode
    if (flags & VNodeFlags.ELEMENT) {
      // mount normal label
      mountElement(vnode, container, isSVG, refNode)
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

// -----------------------------------------------------------------------------------------------------------------
// line:292; description:2021/4/1; patch function
// -----------------------------------------------------------------------------------------------------------------
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
            // container.removeChild(prevChildren.el)
            platformRemoveChild(container,prevChildren.el)
            break
          default:
            // container.removeChild(prevChildren.el)
            platformRemoveChild(container,prevChildren.el)
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
              // container.removeChild(prevChild.el)
              platformRemoveChild(container,prevChild.el)
            }
            mount(nextChildren, container)
            break
          case ChildrenFlags.NO_CHILDREN:
            for (const prevChild of prevChildren) {
              // container.removeChild(prevChild.el)
              platformRemoveChild(container,prevChild.el)
            }
            break
          default:

            let j = 0
            let prevVNode = prevChildren[j]
            let nextVNode = nextChildren[j]
            let prevEnd = prevChildren.length - 1
            let nextEnd = nextChildren.length - 1

            prevVNode = prevChildren[prevEnd]
            nextVNode = nextChildren[nextEnd]
            outer: {
              while (prevVNode.key === nextVNode.key) {
                patch(prevVNode, nextVNode, container)
                j++
                if (j > prevEnd || j > nextEnd) {
                  break outer
                }
                prevVNode = prevChildren[j]
                nextVNode = nextChildren[j]
              }


              while (prevVNode.key === nextVNode.key) {
                patch(prevVNode, nextVNode, container)
                prevEnd--
                nextEnd--
                if (j > prevEnd || j > nextEnd) {
                  break outer
                }
                prevVNode = prevChildren[prevEnd]
                nextVNode = nextChildren[nextEnd]
              }
            }
            if (j > prevEnd && j <= nextEnd) {
              const nextPos = nextEnd + 1
              const refNode =
                nextPos < nextChildren.length ? nextChildren[nextPos].el : null
              while (j <= nextEnd) {
                mount(nextChildren[j++], container, false, refNode)
              }
            }else if (j > nextEnd) {
              while (j <= prevEnd) {
                // container.removeChild(prevChildren[j++].el)
                platformRemoveChild(container,prevChildren[j++].el)
              }
            }else{
              const nextLeft = nextEnd - j + 1
              const source = []
              for (let i = 0; i < nextLeft; i++) {
                source.push(-1)
              }
              const prevStart = j
              const nextStart = j
              let moved = false
              let pos = 0
              const keyIndex = {}
              for(let i = nextStart; i <= nextEnd; i++) {
                keyIndex[nextChildren[i].key] = i
              }
              let patched = 0
              for(let i = prevStart; i <= prevEnd; i++) {
                prevVNode = prevChildren[i]

                if (patched < nextLeft) {
                  const k = keyIndex[prevVNode.key]
                  if (typeof k !== 'undefined') {
                    nextVNode = nextChildren[k]// patch 更新
                    patch(prevVNode, nextVNode, container)
                    patched++
                    source[k - nextStart] = i
                    if (k < pos) {
                      moved = true
                    } else {
                      pos = k
                    }
                  } else {
                    // container.removeChild(prevVNode.el)
                    platformRemoveChild(container,prevVNode.el)
                  }
                } else {
                  // container.removeChild(prevVNode.el)
                  platformRemoveChild(container,prevVNode.el)
                }

              }
              if (moved) {
                const seq = lis(source)
                let j = seq.length - 1
                for (let i = nextLeft - 1; i >= 0; i--) {
                  if (source[i] === -1) {
                    const pos = i + nextStart
                    const nextVNode = nextChildren[pos]
                    const nextPos = pos + 1
                    mount(
                      nextVNode,
                      container,
                      false,
                      nextPos < nextChildren.length
                        ? nextChildren[nextPos].el
                        : null
                    )
                  } else if (i !== seq[j]) {
                    const pos = i + nextStart
                    const nextVNode = nextChildren[pos]
                    const nextPos = pos + 1
                    // container.insertBefore(
                    //   nextVNode.el,
                    //   nextPos < nextChildren.length
                    //     ? nextChildren[nextPos].el
                    //     : null
                    // )
                    platformInsertBefore(
                      container,
                      nextVNode.el,
                        nextPos < nextChildren.length
                          ? nextChildren[nextPos].el
                          : null
                      )
                  } else {
                    j--
                  }
                }
              }

            }

            break;
        }
        break;
    }
  }

   function patchElement(prevVNode: VNode, nextVNode: VNode, container: HTMLElement) {
    function doPatchNext() {

      for (let nextDataKey in nextData) {
        const prevVal = prevData[nextDataKey]
        const nextVal = nextData[nextDataKey]
        // patchData(el, nextDataKey, prevVal, nextVal)
        platformPatchData(el, nextDataKey, prevVal, nextVal)

      }
    }

    function doPathPrev() {
      for (const prevDataKey in prevData) {
        const prevValue = prevData[prevDataKey]
        if (prevValue && !nextData.hasOwnProperty(prevDataKey)) {
          // patchData(el, prevDataKey, prevValue, null)
          platformPatchData(el, prevDataKey, prevValue, null)
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
      // el.nodeValue = nextVNode.children
      platformSetText(el,nextVNode.children)
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
        ? platformQuerySelector(nextVNode.tag)
        : nextVNode.tag
      switch (nextVNode.childFlags) {
        case ChildrenFlags.SINGLE_VNODE:
          // newContainer.appendChild(nextVNode.children.el)
          platformAppendChild(newContainer,nextVNode.children.el)
          break;
        case ChildrenFlags.NO_CHILDREN:
          // nothing to do
          break
        default:
          for (let i = 0; i < nextVNode.children.length; i++) {
            // newContainer.appendChild(nextVNode.children[i].el)
            platformAppendChild(newContainer,nextVNode.children[i].el)

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

return {render}

}
