function isObject(obj: Object) {
  return Object.prototype.toString.call(obj) === '[object Object]'
}

function isArray(array: Array<any>) {
  return Object.prototype.toString.call(array) === '[object Array]'
}

function isFunction(func: Function) {
  return Object.prototype.toString.call(func) === '[object Function]'
}

function isString(str: string) {
  return Object.prototype.toString.call(str) === '[object String]'
}

function isNumber(num: number) {
  return Object.prototype.toString.call(num) === '[object Number]'
}

export { isArray, isObject, isFunction, isString, isNumber }
