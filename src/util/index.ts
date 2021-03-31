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

function isUndefined(val) {
  return Object.prototype.toString.call(val) ==='[object Undefined]'
}

function isNull(val) {
  return Object.prototype.toString.call(val) ==='[object Null]'
}

function lis(seq) {
  const valueToMax = {}
  let len = seq.length
  for (let i = 0; i < len; i++) {
    valueToMax[seq[i]] = 1
  }

  let i = len - 1
  let last = seq[i]
  let prev = seq[i - 1]
  while (typeof prev !== 'undefined') {
    let j = i
    while (j < len) {
      last = seq[j]
      if (prev < last) {
        const currentMax = valueToMax[last] + 1
        valueToMax[prev] =
          valueToMax[prev] !== 1
            ? valueToMax[prev] > currentMax
            ? valueToMax[prev]
            : currentMax
            : currentMax
      }
      j++
    }
    i--
    last = seq[i]
    prev = seq[i - 1]
  }

  const lis = []
  i = 1
  while (--len >= 0) {
    const n = seq[len]
    if (valueToMax[n] === i) {
      i++
      lis.unshift(len)
    }
  }

  return lis
}

export { isArray, isObject, isFunction, isString, isNumber,isNull,isUndefined,lis }
