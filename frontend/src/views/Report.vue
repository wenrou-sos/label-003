<template>
  <div class="page-container">
    <n-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <n-icon size="20" color="#18a058"><DocumentTextOutline /></n-icon>
            <span>出入库流水</span>
          </div>
          <n-button type="primary" @click="handleExport">
            <template #icon><n-icon><DownloadOutline /></n-icon></template>
            导出Excel
          </n-button>
        </div>
      </template>

      <n-space style="margin-bottom: 16px;">
        <n-select v-model:value="filters.type" placeholder="单据类型" :options="typeOptions" clearable style="width: 140px;" />
        <n-input v-model:value="filters.keyword" placeholder="搜索单号/食材" clearable style="width: 240px;" />
        <n-date-picker v-model:value="filters.dateRange" type="daterange" clearable style="width: 280px;" />
        <n-button @click="fetchData">查询</n-button>
        <n-button @click="resetFilters">重置</n-button>
      </n-space>

      <n-data-table
        :columns="columns"
        :data="dataList"
        :loading="loading"
        :pagination="pagination"
        remote
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      />
    </n-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, h } from 'vue'
import { useMessage, NIcon, NTag } from 'naive-ui'
import { DocumentTextOutline, DownloadOutline } from '@vicons/ionicons5'
import { getReportList, exportReport } from '@/api/report'
import { formatDate, formatNumber } from '@/utils'
import * as XLSX from 'xlsx'

const message = useMessage()

const loading = ref(false)
const dataList = ref([])

const typeOptions = [
  { label: '入库', value: 'inbound' },
  { label: '出库', value: 'outbound' }
]

const filters = reactive({
  type: null,
  keyword: '',
  dateRange: null
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  itemCount: 0
})

const columns = [
  {
    title: '单据类型',
    key: 'type',
    width: 100,
    render: (row) => h(NTag, { type: row.type === 'inbound' ? 'success' : 'warning', size: 'small' }, { default: () => row.type === 'inbound' ? '入库' : '出库' })
  },
  { title: '单号', key: 'orderNo', width: 180 },
  { title: '食材名称', key: 'ingredientName', minWidth: 160 },
  { title: '批次号', key: 'batchNo', width: 140 },
  {
    title: '数量',
    key: 'quantity',
    width: 120,
    align: 'right',
    render: (row) => {
      const sign = row.type === 'inbound' ? '+' : '-'
      const color = row.type === 'inbound' ? '#18a058' : '#8a2d0b'
      return h('span', { style: `color: ${color}; font-weight: 600;` }, `${sign}${formatNumber(row.quantity)} ${row.unit}`)
    }
  },
  { title: '单价(元)', key: 'price', width: 120, align: 'right', render: (row) => formatNumber(row.price) },
  { title: '金额(元)', key: 'totalAmount', width: 120, align: 'right', render: (row) => formatNumber(row.totalAmount) },
  { title: '操作人', key: 'operator', width: 100 },
  { title: '时间', key: 'createdAt', width: 180, render: (row) => formatDate(row.createdAt) }
]

async function fetchData() {
  loading.value = true
  try {
    const res = await getReportList({ ...filters, page: pagination.page, pageSize: pagination.pageSize })
    dataList.value = res.data?.list || res.data || []
    pagination.itemCount = res.data?.total || 0
  } catch (e) {
    dataList.value = [
      { id: 1, type: 'inbound', orderNo: 'IN20240101001', ingredientName: '西红柿', batchNo: 'B20240101', quantity: 50, unit: 'kg', price: 6.5, totalAmount: 325, operator: '管理员', createdAt: '2024-01-01 09:30:00' },
      { id: 2, type: 'outbound', orderNo: 'OUT20240101001', ingredientName: '西红柿', batchNo: 'B20240101', quantity: 10, unit: 'kg', price: 6.5, totalAmount: 65, operator: '张师傅', createdAt: '2024-01-01 11:00:00' },
      { id: 3, type: 'inbound', orderNo: 'IN20240101002', ingredientName: '牛肉', batchNo: 'B20240102', quantity: 20, unit: 'kg', price: 68, totalAmount: 1360, operator: '管理员', createdAt: '2024-01-01 10:15:00' }
    ]
    pagination.itemCount = 3
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.type = null
  filters.keyword = ''
  filters.dateRange = null
  fetchData()
}

function handlePageChange(page) {
  pagination.page = page
  fetchData()
}

function handlePageSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
  fetchData()
}

async function handleExport() {
  try {
    const res = await exportReport(filters)
    downloadBlob(res, `出入库流水_${formatDate(new Date(), 'YYYYMMDD')}.xlsx`)
    message.success('导出成功')
  } catch (e) {
    const exportData = dataList.value.map(item => ({
      '单据类型': item.type === 'inbound' ? '入库' : '出库',
      '单号': item.orderNo,
      '食材名称': item.ingredientName,
      '批次号': item.batchNo,
      '数量': (item.type === 'inbound' ? '+' : '-') + item.quantity + ' ' + item.unit,
      '单价(元)': item.price,
      '金额(元)': item.totalAmount,
      '操作人': item.operator,
      '时间': item.createdAt
    }))
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '出入库流水')
    XLSX.writeFile(wb, `出入库流水_${formatDate(new Date(), 'YYYYMMDD')}.xlsx`)
    message.success('导出成功')
  }
}

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(new Blob([blob]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
}

onMounted(fetchData)
</script>

<style scoped>
.page-container {
  padding: 0;
}
</style>
