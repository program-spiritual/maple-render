import createRenderer from '@/createRender'
import nodeOps from "@/customer-render/nodeOps";
import {patchData} from "@/customer-render/patchData";

const {render} = createRenderer({
  nodeOps: nodeOps,
  patchData
})

export default render
