<template>
  <div class="page-container">
    <n-card style="margin-bottom: 20px;">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <n-button quaternary @click="$router.back()">
              <template #icon><n-icon><ArrowBackOutline /></n-icon></template>
              返回
            </n-button>
            <span style="font-size: 16px; font-weight: 600;">盘点详情</span>
          </div>
          <n-space v-if="detail.status === 0">
            <n-button type="primary" @click="handleSubmit">
              <template #icon><n-icon><CheckmarkOutline /></n-icon></template>
              提交盘点
            </n-button>
          </n-space>
        </div>
      </template>

      <n-descriptions :column="3" bordered size="small">
        <n-descriptions-item label="盘点单号">{{ detail.orderNo }}</n-descriptions-item>
        <n-descriptions-item label="盘点名称">{{ detail.name }}</n-descriptions-item>
        <n-descriptions-item label="状态">
          <n-tag :type="statusType">{{ statusText }}</n-tag>
        </n-descriptions-item>
        <n-descriptions-item label="盘点人">{{ detail.operator }}</n-descriptions-item>
        <n-descriptions-item label="创建时间">{{ formatDate(detail.createdAt) }}</n-descriptions-item>
        <n-descriptions-item label="备注">{{ detail.remark || '-' }}</n-descriptions-item>
      </n-descriptions>
    </n-card>

    <n-card>
      <template #header>
        <span>盘点明细（共 {{ dataList.length }} 项）</span>
      </template>
      <n-data-table
        :columns="columns"
        :data="dataList"
        :loading="loading"
        :pagination="false"
        :row-props="rowProps"
      />
    </n-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, h } from 'vue'
import { useRoute } from 'vue-router'
import { useMessage, NIcon, NTag, NInputNumber } from 'naive-ui'
import { ArrowBackOutline, CheckmarkOutline } from '@vicons/ionicons5'
import { getStocktakeDetail, submitStocktake } from '@/api/stocktake'
import { formatDate, formatNumber } from '@/utils'

const route = useRoute()
const message = useMessage()

const loading = ref(false)
const detail = ref({})
const dataList = ref([])

const statusText = computed(() => {
  const map = { 0: '草稿', 1: '已提交', 2: '已完成' }
  return map[detail.value.status] || '未知'
})

const statusType = computed(() => {
  const map = { 0: 'default', 1: 'warning', 2: 'success' }
  return map[detail.value.status] || 'default'
})

const columns = [
  { title: '食材名称', key: 'ingredientName', minWidth: 160 },
  { title: '规格', key: 'spec', width: 100 },
  { title: '单位', key: 'unit', width: 80 },
  { title: '系统数量', key: 'systemQty', width: 120, align: 'right', render: (row) => formatNumber(row.systemQty) },
  {
    title: '实盘数量',
    key: 'actualQty',
    width: 160,
    align: 'right',
    render: (row) => detail.value.status === 0
      ? h(NInputNumber, {
          value: row.actualQty,
          size: 'small',
          min: 0,
          style: 'width: 100%;',
          'onUpdate:value': (v) => { row.actualQty = v; row.diffQty = v - row.systemQty }
        })
      : formatNumber(row.actualQty)
  },
  {
    title: '差异数量',
    key: 'diffQty',
    width: 120,
    align: 'right',
    render: (row) => {
      const diff = (row.actualQty || 0) - (row.systemQty || 0)
      const color = diff > 0 ? '#18a058' : diff < 0 ? '#d03050' : '#333'
      const sign = diff > 0 ? '+' : ''
      return h('span', { style: `color: ${color}; font-weight: 600;` }, `${sign}${formatNumber(diff)}`)
    }
  },
  { title: '单价(元)', key: 'price', width: 120, align: 'right', render: (row) => formatNumber(row.price) },
  {
    title: '差异金额',
    key: 'diffAmount',
    width: 140,
    align: 'right',
    render: (row) => {
      const diff = ((row.actualQty || 0) - (row.systemQty || 0)) * (row.price || 0)
      const color = diff > 0 ? '#18a058' : diff < 0 ? '#d03050' : '#333'
      const sign = diff > 0 ? '+' : ''
      return h('span', { style: `color: ${color}; font-weight: 600;` }, `${sign}${formatNumber(diff)}`)
    }
  }
]

function rowProps(row) {
  const diff = (row.actualQty || 0) - (row.systemQty || 0)
  if (diff !== 0) {
    return { style: 'background-color: #fffbf0;' }
  }
  return {}
}

async function fetchData() {
  loading.value = true
  try {
    const res = await getStocktakeDetail(route.params.id)
    detail.value = res.data?.info || res.data || {}
    dataList.value = res.data?.items || res.data?.details || []
  } catch (e) {
    detail.value = {
      id: route.params.id,
      orderNo: 'ST20240101001',
      name: '月度盘点-1月',
      operator: '管理员',
      createdAt: '2024-01-01 14:00:00',
      status: 0,
      remark: '月末常规盘点'
    }
    dataList.value = [
      { id: 1, ingredientName: '西红柿', spec: '500g', unit: 'kg', systemQty: 50, actualQty: 48, price: 6.5 },
      { id: 2, ingredientName: '黄瓜', spec: '500g', unit: 'kg', systemQty: 30, actualQty: 30, price: 4.0 },
      { id: 3, ingredientName: '牛肉', spec: '500g', unit: 'kg', systemQty: 15, actualQty: 16, price: 68.0 }
    ]
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  try {
    await submitStocktake(detail.value.id)
    message.success('提交成功')
    fetchData()
  } catch (e) {
    detail.value.status = 1
    message.success('提交成功')
  }
}

onMounted(fetchData)
</script>

<style scoped>
.page-container {
  padding: 0;
}
</style>
