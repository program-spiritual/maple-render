import {h} from "@/core";

export class ChildComponent {
  $props: any;
  render() {
    return h('div', null, this.$props.text)
  }
}
