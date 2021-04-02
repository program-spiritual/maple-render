## Maple Render

[![](./template/maplerender.svg)](https://github.com/xiaomiwujiecao/maple-render)


### target:

> Handwritten implementation of VNode


### todo:

 - [x] Patch function
 - [x] Diff algorithm
 - [x] User defined render
 - [x] Build Version
### how

Inspired by this project:


> http://hcysun.me/vue-design/zh


### tutorial 

using in vue or any popular framework:

### import method

```js
import { h, render } from 'maplerender'
```

### create VNode
```js
 function handler() {
  alert('click me')
}
const elVNode = h(
  'div',
  {
    style: { height: '100px', width: '200px', background: 'red' },
    // click event
    onclick: handler,
  },
  h('div', {
    style: {
      height: '50px',
      width: '50px',
      background: 'green',
    },
    class: [
      'class-a',
      {
        'class-b': true,
        'class-c': false,
      },
    ],
  }),
)
```

### render VNode to DOM

```js
render(elVNode, document.getElementById('demo5'))
```

## render Functional Component

```js
export function MyFunctionalComponent() {
  return h(
    'div',
    {
      style: {
        background: 'green',
      },
    },
    [
      h('span', null, '我是组件的标题1......'),
      h('span', null, '我是组件的标题2......'),
    ],
  )
}
const functionalComponent = h(MyFunctionalComponent)
render(functionalComponent, document.getElementById('functional-component'))
```

## render Stateful Component


```ts
export default class MYSuperComponent {
  render() {
    throw 'lack of render function!'
  }
}
export class MyComponent extends MYSuperComponent {
  render() {
    return h(
      'div',
      {
        style: {
          background: 'green',
        },
      },
      [
        h('span', null, '我是组件的标题1......'),
        h('span', null, '我是组件的标题2......'),
      ],
    )
  }
}
const elCLassComponentVNode = h(MyComponent)
render(
  elCLassComponentVNode,
  document.getElementById('customer-class-component'),
)
```

## function: `h`   params:

|param|desc|
|------------|------------|
|tag|create element such as 'div', 'svg', Component Object |
|data|bind data to  current component , such as {style:{...},class:[....]}|
|children|the child VNodes|

## function: `render`  params:

|param|desc|
|------------|------------|
|vnode|VNode Component Object|
|container| in web platform , it means DOM Object|


##  data struct

the VNode data struct show below:

```ts
{
    _isVNode: boolean;
    tag: any;
    data: any;
    key: any;
    children: any;
    flags: any;
    childFlags: any;
    el: any;
}
```

you can check it on `chrome devtools` or any other popular browser

## interface

### VNode

```ts
export interface VNode {
  handle?: IFunctionalComponentHandle;
  data: any;
  _isVNode: boolean;
  tag: any;
  key?: string;
  children: any;
  flags: number;
  childFlags: number;
  el: any;
}
```

### IFunctionalComponentHandle

```ts
export  interface IFunctionalComponentHandle {
  prev: VNode;
  next: VNode;
  container: HTMLElement;
  update: Function
}
```

### Customer Render Options

```ts
export interface CustomerRenderOptions {
    nodeOps: NodeOps;
    patchData: (el: any, key: any, prevValue: any, nextValue: any) => void;
}
interface NodeOps {
    appendChild: (parent: any, child: any) => void;
    createText: (text: string) => any;
    removeChild: (parent: any, child: any) => void;
    querySelector: (selector: any) => any;
    createElement: (tag: any, isSVG: number | boolean) => any;
    parentNode: (node: any) => any;
    nextSibling: (node: any) => any;
    setText: (node: any, text: string) => void;
    insertBefore: (parent: any, child: any, ref: any) => void;
}
export {};

```

## customer render

if wwant to define your self render ,please clone the repo on github and change everything .

```shell
https://github.com/xiaomiwujiecao/maple-render
```
