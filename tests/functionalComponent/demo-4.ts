import {Component1} from './components/component1'
import {Fragment, h, Portal, render} from "@/core";
import {MyComponent} from "./components/MyComponent";
import {ParentComponent} from "./components/ParentComponent";
// const statefulComponent = h(MyComponent, null,null)
// render(statefulComponent,document.getElementById('app'))

// 有状态组件 VNode
// const compVNode = h(ParentComponent)
// render(compVNode, document.getElementById('app'))

const compVNode = h(ParentComponent)
render(compVNode, document.getElementById('app'))
