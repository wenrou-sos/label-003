import request from '@/utils/request'

export function getOutboundList(params) {
  return request({
    url: '/outbounds',
    method: 'get',
    params
  })
}

export function getOutboundDetail(id) {
  return request({
    url: `/outbounds/${id}`,
    method: 'get'
  })
}

export function createOutbound(data) {
  return request({
    url: '/outbounds',
    method: 'post',
    data
  })
}

export function createOutboundBatch(data) {
  return request({
    url: '/outbounds/batch',
    method: 'post',
    data
  })
}

export function cancelOutbound(id) {
  return request({
    url: `/outbounds/${id}/cancel`,
    method: 'put'
  })
}
