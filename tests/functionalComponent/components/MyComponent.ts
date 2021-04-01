import Component from "@/components/Component";
import {h} from "@/h";
class MyComponent extends Component{
  // 自身状态 or 本地状态
  localState = 'one'

  // mounted 钩子
  mounted() {
    // 两秒钟之后修改本地状态的值，并重新调用 _update() 函数更新组件
    setTimeout(() => {
      this.localState = 'two'
      this._update()
    }, 2000)
  }

  _update() {
        throw new Error("Method not implemented.")
    }

  render() {
    return h('div', null, this.localState)
  }
}

export {MyComponent}
