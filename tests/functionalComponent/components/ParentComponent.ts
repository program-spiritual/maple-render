import Component from "@/components/Component";
import {h} from "@/core";
import {ChildComponent} from "./ChildComponent";
import {MyFunctionalComp} from "./MyFunctionalComp";

class ParentComponent extends Component{

  // 本地状态
  localState = 'one'
  mounted() {
    // 两秒钟后将 localState 的值修改为 'two'
    setTimeout(() => {
      this.localState = 'two'
      this._update()
    }, 2000)
  }

  _update() {
        throw new Error("Method not implemented.");
    }
  render() {
    return h(MyFunctionalComp, {
      text: this.localState
    })
  }
}

export {ParentComponent}
