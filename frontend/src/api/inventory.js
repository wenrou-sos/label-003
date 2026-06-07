import request from '@/utils/request'

export function getInventoryList(params) {
  return request({
    url: '/inventory',
    method: 'get',
    params
  })
}

export function getInventoryDetail(id) {
  return request({
    url: `/inventory/${id}`,
    method: 'get'
  })
}

export function getLowStockList(params) {
  return request({
    url: '/inventory/low-stock',
    method: 'get',
    params
  })
}

export function getInventorySummary() {
  return request({
    url: '/inventory/summary',
    method: 'get'
  })
}
