import {Component1} from './component1'
import {h, render} from "@/core";

const functionalComponent = h(Component1)
render(functionalComponent, document.getElementById('app'))
