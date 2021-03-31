export  interface IFunctionalComponentHandle {
  prev: VNode;
  next: VNode;
  container: HTMLElement;
  update: Function
}

export interface VNode {
  handle?: IFunctionalComponentHandle;
  data: any;
  _isVNode: boolean;
  tag: any;
  children: any;
  flags: number;
  childFlags: number;
  el: any;
}
