import request from '@/utils/request'

export function getWarningConfigList(params) {
  return request({
    url: '/warnings/configs',
    method: 'get',
    params
  })
}

export function getWarningConfig(id) {
  return request({
    url: `/warnings/configs/${id}`,
    method: 'get'
  })
}

export function createWarningConfig(data) {
  return request({
    url: '/warnings/configs',
    method: 'post',
    data
  })
}

export function updateWarningConfig(id, data) {
  return request({
    url: `/warnings/configs/${id}`,
    method: 'put',
    data
  })
}

export function deleteWarningConfig(id) {
  return request({
    url: `/warnings/configs/${id}`,
    method: 'delete'
  })
}

export function batchUpdateWarningConfigs(data) {
  return request({
    url: '/warnings/configs/batch/update',
    method: 'put',
    data
  })
}

export function getWarningList(params) {
  return request({
    url: '/warnings/logs',
    method: 'get',
    params
  })
}

export function getPendingStockWarnings() {
  return request({
    url: '/warnings/pending-stock',
    method: 'get'
  })
}

export function handleWarningLog(id, data) {
  return request({
    url: `/warnings/logs/${id}`,
    method: 'put',
    data
  })
}

export function batchHandleWarningLogs(data) {
  return request({
    url: '/warnings/logs/batch/handle',
    method: 'put',
    data
  })
}
