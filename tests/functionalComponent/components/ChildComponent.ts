import {h} from "@/h";

export class ChildComponent {
  $props: any;
  render() {
    return h('div', null, this.$props.text)
  }
}
