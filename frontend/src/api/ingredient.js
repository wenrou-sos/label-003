import request from '@/utils/request'

export function getIngredientList(params) {
  return request({
    url: '/ingredients',
    method: 'get',
    params
  })
}

export function getIngredient(id) {
  return request({
    url: `/ingredients/${id}`,
    method: 'get'
  })
}

export function createIngredient(data) {
  return request({
    url: '/ingredients',
    method: 'post',
    data
  })
}

export function updateIngredient(id, data) {
  return request({
    url: `/ingredients/${id}`,
    method: 'put',
    data
  })
}

export function deleteIngredient(id) {
  return request({
    url: `/ingredients/${id}`,
    method: 'delete'
  })
}
