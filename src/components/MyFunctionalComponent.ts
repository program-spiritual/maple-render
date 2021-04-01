import { h } from '@/h'

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
