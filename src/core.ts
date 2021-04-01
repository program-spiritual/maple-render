/********************************************************
 * function [normalizeVNodes]: transfer none key VNode to keyed VNode .
 * function [normalizeClass]: transfer Array class style or object style or string style to plain text .
 *
 *
 * ********************************************************/

import {VNodeFlags} from './enum/VNodeFlags'
import {ChildrenFlags} from './enum/ChildrenFlags'
import {VNode} from './interface/VNode'
import {isObject, isArray, isString, lis} from './util'
import {domPropsRE} from './rule'
import {createTextVNode} from "./h";


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

// -----------------------------------------------------------------------------------------------------------------
// line:16; description:2021/4/1; helper function
// -----------------------------------------------------------------------------------------------------------------
export function normalizeClass(classValue: any) {
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
export function replaceVNode(prevVNode: VNode, nextVNode: VNode, container: HTMLElement) {
  container.removeChild(prevVNode.el)
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
export function mountElement(
  vnode: VNode,
  container: HTMLElement,
  isSVG: boolean | number,
  refNode?
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
  refNode ? container.insertBefore(el, refNode) : container.appendChild(el)
}

export function mountStatefulComponent(vnode: VNode, container: HTMLElement, isSVG) {
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

export function mountFunctionalComponent(vnode: VNode, container: HTMLElement, isSVG) {
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
export function mountComponent(vnode: VNode, container: HTMLElement, isSVG) {
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
export function mountText(vnode: VNode, container: HTMLElement) {
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
export function mountFragment(vnode: VNode, container: HTMLElement, isSVG) {
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
export function mountPortal(vnode: VNode, container: HTMLElement, isSVG) {
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
 *
 * @param vnode {VNode}
 * @param container {HTMLElement}
 * @param isSVG {boolean}
 * @param refNode
 */
export function mount(vnode: VNode, container: HTMLElement, isSVG?, refNode?) {
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
export function patchData(el: HTMLElement, key: string, prevValue: any, nextValue: any) {
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

export function patchChildren(prevChildFlags: number, nextChildFlags: number, prevChildren: any, nextChildren: any, container: HTMLElement) {
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
          // for (const prevChild of prevChildren) {
          //   container.removeChild(prevChild.el)
          // }
          // for (const nextChild of nextChildren) {
          //   mount(nextChild, container)
          // }
          // patch
          // for (let i = 0; i < prevChildren.lengh; i++) {
          //   patch(prevChildren[i], nextChildren[i], container)
          // }
          // better patch
          // const prevLen = prevChildren.length
          // const nextLen = nextChildren.length
          // const commonLength = prevLen > nextLen ? nextLen : prevLen
          // for (let i = 0; i < commonLength; i++) {
          //   patch(prevChildren[i], nextChildren[i], container)
          // }
          // if (prevLen > nextLen) {
          //   // remove old node
          //   for (let i = commonLength; i < prevLen; i++) {
          //     container.removeChild(prevChildren[i].el)
          //   }
          // } else if (nextLen > prevLen) {
          //   for (let i = commonLength; i < nextLen; i++) {
          //     mount(nextChildren[i], container)
          //   }
          // }
          //--------------------------------------------------
          // description:2021/4/1 react version
          //--------------------------------------------------


          // let lastIndex = 0
          // for (let i = 0; i < nextChildren.length; i++) {
          //   const nextVNode = nextChildren[i]
          //   let j = 0,find=false
          //   for (j; j < prevChildren.length; j++) {
          //     const prevVNode = prevChildren[j]
          //     if (nextVNode.key === prevVNode.key) {
          //       find=true
          //       patch(prevVNode, nextVNode, container)
          //       if (j < lastIndex) {
          //         // it need to move
          //         debugger
          //         const refNode = nextChildren[i - 1].el.nextSibling
          //         container.insertBefore(prevVNode.el, refNode)
          //         break
          //       } else {
          //         // 更新 lastIndex
          //         lastIndex = j
          //       }
          //     }
          //   }
          //   if (!find) {
          //     // mount new node
          //     const refNode = i-1<0?prevChildren[0].el:nextChildren[i - 1].el.nextSibling
          //     mount(nextVNode, container, false,refNode)
          //   }
          // }
          //
          // for (let i = 0; i < prevChildren.length; i++) {
          //   const prevVNode = prevChildren[i]
          //   const has = nextChildren.find(
          //     nextVNode => nextVNode.key === prevVNode.key
          //   )
          //   if (!has) {
          //     container.removeChild(prevVNode.el)
          //   }
          // }
          //--------------------------------------------------
          // description:2021/4/1 double-end compare  vue2.0
          //--------------------------------------------------
          // let oldStartIdx = 0
          // let oldEndIdx = prevChildren.length - 1
          // let newStartIdx = 0
          // let newEndIdx = nextChildren.length - 1
          // let oldStartVNode = prevChildren[oldStartIdx]
          // let oldEndVNode = prevChildren[oldEndIdx]
          // let newStartVNode = nextChildren[newStartIdx]
          // let newEndVNode = nextChildren[newEndIdx]
          // while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
          //   if (!oldStartVNode) {
          //     oldStartVNode = prevChildren[++oldStartIdx]
          //   } else if (!oldEndVNode) {
          //     oldEndVNode = prevChildren[--oldEndIdx]
          //   } else if (oldStartVNode.key === newStartVNode.key) {
          //     patch(oldStartVNode, newStartVNode, container)
          //     oldStartVNode = prevChildren[++oldStartIdx]
          //     newStartVNode = nextChildren[++newStartIdx]
          //   } else if (oldEndVNode.key === newEndVNode.key) {
          //     patch(oldEndVNode, newEndVNode, container)
          //     oldEndVNode = prevChildren[--oldEndIdx]
          //     newEndVNode = nextChildren[--newEndIdx]
          //   } else if (oldStartVNode.key === newEndVNode.key) {
          //     patch(oldStartVNode, newEndVNode, container)
          //     container.insertBefore(oldStartVNode.el, oldEndVNode.el.nextSibling)
          //     oldStartVNode = prevChildren[++oldStartIdx]
          //     newEndVNode = nextChildren[--newEndIdx]
          //   } else if (oldEndVNode.key === newStartVNode.key) {
          //     patch(oldEndVNode, newStartVNode, container)
          //     container.insertBefore(oldEndVNode.el, oldStartVNode.el)
          //     oldEndVNode = prevChildren[--oldEndIdx]
          //     newStartVNode = nextChildren[++newStartIdx]
          //   } else {
          //     const idxInOld = prevChildren.findIndex(
          //       node => node.key === newStartVNode.key
          //     )
          //     if (idxInOld >= 0) {
          //       const vnodeToMove = prevChildren[idxInOld]
          //       patch(vnodeToMove, newStartVNode, container)
          //       container.insertBefore(vnodeToMove.el, oldStartVNode.el)
          //       prevChildren[idxInOld] = undefined
          //     }else{
          //       // can not found , it should be one new node
          //       mount(newStartVNode, container, false, oldStartVNode.el)
          //     }
          //   }
          // }
          //
          // if (oldEndIdx < oldStartIdx) {
          //   // forgot to handle delay node
          //   for (let i = newStartIdx; i <= newEndIdx; i++) {
          //     mount(nextChildren[i], container, false, oldStartVNode.el)
          //   }
          // }else if (newEndIdx < newStartIdx) {
          //   for (let i = oldStartIdx; i <= oldEndIdx; i++) {
          //     container.removeChild(prevChildren[i].el)
          //   }
          // }
          //--------------------------------------------------
          // description:2021/4/1 vu3 3.0
          //--------------------------------------------------
          // 更新相同的前缀节点
          // j 为指向新旧 children 中第一个节点的索引
          let j = 0
          let prevVNode = prevChildren[j]
          let nextVNode = nextChildren[j]
          // while 循环向后遍历，直到遇到拥有不同 key 值的节点为止

          // 指向旧 children 最后一个节点的索引
          let prevEnd = prevChildren.length - 1
          // 指向新 children 最后一个节点的索引
          let nextEnd = nextChildren.length - 1

          prevVNode = prevChildren[prevEnd]
          nextVNode = nextChildren[nextEnd]
          outer: {
          while (prevVNode.key === nextVNode.key) {
            // 调用 patch 函数更新
            patch(prevVNode, nextVNode, container)
            j++
            if (j > prevEnd || j > nextEnd) {
              break outer
            }
            prevVNode = prevChildren[j]
            nextVNode = nextChildren[j]
          }


          // while 循环向前遍历，直到遇到拥有不同 key 值的节点为止
          while (prevVNode.key === nextVNode.key) {
            // 调用 patch 函数更新
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
          // 满足条件，则说明从 j -> nextEnd 之间的节点应作为新节点插入
          if (j > prevEnd && j <= nextEnd) {
            // 所有新节点应该插入到位于 nextPos 位置的节点的前面
            const nextPos = nextEnd + 1
            const refNode =
              nextPos < nextChildren.length ? nextChildren[nextPos].el : null
            // 采用 while 循环，调用 mount 函数挂载节点
            while (j <= nextEnd) {
              mount(nextChildren[j++], container, false, refNode)
            }
          }else if (j > nextEnd) {
            // j -> prevEnd 之间的节点应该被移除
            while (j <= prevEnd) {
              container.removeChild(prevChildren[j++].el)
            }
          }else{
            const nextLeft = nextEnd - j + 1  // 新 children 中剩余未处理节点的数量
            const source = []
            for (let i = 0; i < nextLeft; i++) {
              source.push(-1)
            }
            const prevStart = j
            const nextStart = j
            let moved = false
            let pos = 0
            // 构建索引表
            const keyIndex = {}
            for(let i = nextStart; i <= nextEnd; i++) {
              keyIndex[nextChildren[i].key] = i
            }
            let patched = 0
            // 遍历旧 children 的剩余未处理节点
            for(let i = prevStart; i <= prevEnd; i++) {
              prevVNode = prevChildren[i]

              if (patched < nextLeft) {
                // 通过索引表快速找到新 children 中具有相同 key 的节点的位置
                const k = keyIndex[prevVNode.key]
                if (typeof k !== 'undefined') {
                  nextVNode = nextChildren[k]
                  // patch 更新
                  patch(prevVNode, nextVNode, container)
                  patched++
                  // 更新 source 数组
                  source[k - nextStart] = i
                  // 判断是否需要移动
                  if (k < pos) {
                    moved = true
                  } else {
                    pos = k
                  }
                } else {
                  // 没找到，说明旧节点在新 children 中已经不存在了，应该移除
                  container.removeChild(prevVNode.el)
                }
              } else {
                // 多余的节点，应该移除
                container.removeChild(prevVNode.el)
              }

            }
            if (moved) {
              const seq = lis(source)
              // j 指向最长递增子序列的最后一个值
              let j = seq.length - 1
              // 从后向前遍历新 children 中的剩余未处理节点
              for (let i = nextLeft - 1; i >= 0; i--) {
                if (source[i] === -1) {
                  // 作为全新的节点挂载

                  // 该节点在新 children 中的真实位置索引
                  const pos = i + nextStart
                  const nextVNode = nextChildren[pos]
                  // 该节点下一个节点的位置索引
                  const nextPos = pos + 1
                  // 挂载
                  mount(
                    nextVNode,
                    container,
                    false,
                    nextPos < nextChildren.length
                      ? nextChildren[nextPos].el
                      : null
                  )
                } else if (i !== seq[j]) {
                  // 说明该节点需要移动

                  // 该节点在新 children 中的真实位置索引
                  const pos = i + nextStart
                  const nextVNode = nextChildren[pos]
                  // 该节点下一个节点的位置索引
                  const nextPos = pos + 1
                  // 移动
                  container.insertBefore(
                    nextVNode.el,
                    nextPos < nextChildren.length
                      ? nextChildren[nextPos].el
                      : null
                  )
                } else {
                  // 当 i === seq[j] 时，说明该位置的节点不需要移动
                  // 并让 j 指向下一个位置
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

export function patchElement(prevVNode: VNode, nextVNode: VNode, container: HTMLElement) {
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

export function patchComponent(prevVNode: VNode, nextVNode: VNode, container: HTMLElement) {
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

export function patchText(prevVNode: VNode, nextVNode: VNode) {
  const el = (nextVNode.el = prevVNode.el)
  if (nextVNode.children !== prevVNode.children) {
    el.nodeValue = nextVNode.children
  }
}

export function patchFragment(prevVNode: VNode, nextVNode: VNode, container: HTMLElement) {
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

export function patchPortal(prevVNode: VNode, nextVNode: VNode) {
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
export function patch(prevVNode: VNode, nextVNode: VNode, container: HTMLElement) {
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


