import request from '@/utils/request'

export function getReportList(params) {
  return request({
    url: '/reports/flow',
    method: 'get',
    params
  })
}

export function getReportSummary(params) {
  return request({
    url: '/reports/summary',
    method: 'get',
    params
  })
}

export function exportReport(params) {
  return request({
    url: '/reports/export',
    method: 'get',
    params,
    responseType: 'blob'
  })
}
