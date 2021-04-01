function createElement(tag, isSVG) {
  const customElement = {
    type: 'ELEMENT',
    tag,
    parentNode: null,
    children: [],
    props: {},
    eventListeners: {},
    text: null
  }
  console.table({
    type: 'create element',
    targetNode: customElement
  })

  return customElement
}

function createText(text) {
  const customElement = {
    type: 'TEXT',
    parentNode: null,
    text: text
  }

  console.table({
    type: 'create text',
    targetNode: customElement
  })

  return customElement
}

function setText(node, text) {
  node.text = text
}

function appendChild(parent, child) {
  child.parent = parent
  parent.children.push(child)
  console.table({
    type: 'append element',
    targetNode: child,
    parentNode: parent
  })
}

function insertBefore(parent, child, ref) {
  console.table({
    type: 'insert element',
    targetNode: child,
    parentNode: parent,
    refNode: ref
  })
  const refIndex = parent.children.indexOf(ref)
  parent.children.splice(refIndex, 0, child)
  child.parentNode = parent
}

function removeChild(parent, child) {
  console.table({
    type: 'remove element',
    targetNode: child,
    parentNode: parent
  })
  const i = parent.children.indexOf(child)
  if (i > -1) {
    parent.children.splice(i, 1)
  } else {
    console.error('target: ', child)
    console.error('parent: ', parent)
    throw Error('target 不是 parent 的子节点')
  }
  child.parentNode = null
}

function parentNode(node) {
  return node.parentNode
}

function nextSibling(node) {
  const parent = node.parentNode
  if (!parent) {
    return null
  }
  const i = parent.children.indexOf(node)
  return parent.children[i + 1] || null
}

function querySelector(selector) {
  throw new Error('test renderer 不支持 querySelector.')
}

export default {
  createElement,
  createText,
  setText,
  appendChild,
  insertBefore,
  removeChild,
  parentNode,
  nextSibling,
  querySelector
}
