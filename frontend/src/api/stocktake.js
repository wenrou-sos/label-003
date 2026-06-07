import request from '@/utils/request'

export function getStocktakeList(params) {
  return request({
    url: '/stocktakes',
    method: 'get',
    params
  })
}

export function getStocktakeDetail(id) {
  return request({
    url: `/stocktakes/${id}`,
    method: 'get'
  })
}

export function createStocktake(data) {
  return request({
    url: '/stocktakes',
    method: 'post',
    data
  })
}

export function updateStocktake(id, data) {
  return request({
    url: `/stocktakes/${id}`,
    method: 'put',
    data
  })
}

export function submitStocktake(id) {
  return request({
    url: `/stocktakes/${id}/confirm`,
    method: 'post'
  })
}

export function deleteStocktake(id) {
  return request({
    url: `/stocktakes/${id}`,
    method: 'delete'
  })
}
