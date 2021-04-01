import createRenderer from '@/createRender'
import nodeOps from './nodeOps'
import { patchData } from './patchData'

const { render } = createRenderer({
  nodeOps,
  patchData
})

export default render
