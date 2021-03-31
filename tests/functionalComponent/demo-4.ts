import {Component1} from './component1'
import {h, render} from "@/core";

// 旧的 VNode
const prevVNode = h('div', {
  style: {
    width: '100px',
    height: '100px',
    backgroundColor: 'red'
  }
})

// 新的 VNode
const nextVNode = h('div', {
  style: {
    width: '100px',
    height: '100px',
    border: '1px solid #dedede'
  }
})
render(prevVNode, document.getElementById('app'))
render(nextVNode, document.getElementById('app'))
