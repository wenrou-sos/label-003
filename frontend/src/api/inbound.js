import request from '@/utils/request'

export function getInboundList(params) {
  return request({
    url: '/inbounds',
    method: 'get',
    params
  })
}

export function getInboundDetail(id) {
  return request({
    url: `/inbounds/${id}`,
    method: 'get'
  })
}

export function createInbound(data) {
  return request({
    url: '/inbounds',
    method: 'post',
    data
  })
}

export function createInboundBatch(data) {
  return request({
    url: '/inbounds/batch',
    method: 'post',
    data
  })
}

export function cancelInbound(id) {
  return request({
    url: `/inbounds/${id}/cancel`,
    method: 'put'
  })
}
