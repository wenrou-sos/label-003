import dayjs from 'dayjs'

export function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!date) return ''
  return dayjs(date).format(format)
}

export function formatNumber(num, decimals = 2) {
  if (num === null || num === undefined) return ''
  return Number(num).toFixed(decimals)
}

export function debounce(fn, delay = 300) {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}
