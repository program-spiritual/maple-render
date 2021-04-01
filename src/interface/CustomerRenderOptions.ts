export interface CustomerRenderOptions {
  nodeOps: NodeOps;
  patchData: (el, key, prevValue, nextValue) => void
}

interface NodeOps {
  appendChild: (parent, child) => void;
  createText: (text: string) => any;
  removeChild: (parent, child) => void;
  querySelector: (selector) => any;
  createElement: (tag: any, isSVG: number | boolean) => any;
  parentNode: (node) => any;
  nextSibling: (node) => any;
  setText: (node, text: string) => void;
  insertBefore: (parent, child, ref) => void
}

