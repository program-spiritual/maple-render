import Component from "@/components/Component";
import {h} from "@/h";

export class Component1 extends Component {
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
