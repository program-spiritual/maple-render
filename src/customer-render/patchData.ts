export function patchData(el, key, prevValue, nextValue) {
  console.table({
    type: 'patch',
    targetNode: el,
    prevValue,
    nextValue
  })

  // 将属性添加到元素的 props 对象下
  el.props[key] = nextValue
  // 我们将属性名字中前两个字符是 'o' 和 'n' 的属性认为是事件绑定
  if (key[0] === 'o' && key[1] === 'n') {
    // 如果是事件，则将事件添加到元素的 eventListeners 对象下
    const event = key.slice(2).toLowerCase();
    (el.eventListeners || (el.eventListeners = {}))[event] = nextValue
  }
}
