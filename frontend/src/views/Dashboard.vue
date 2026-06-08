<template>
  <div class="dashboard">
    <n-card style="margin-bottom: 20px;">
      <template #header>
        <div style="display: flex; align-items: center; gap: 8px;">
          <n-icon size="20" color="#18a058"><BarChartOutline /></n-icon>
          <span>库存概览</span>
        </div>
      </template>
      <n-grid :cols="4" :x-gap="20">
        <n-gi>
          <n-card embedded>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <n-text depth="3" style="font-size: 13px;">食材总数</n-text>
                <div style="font-size: 28px; font-weight: 600; margin-top: 4px;">{{ summary.total || 0 }}</div>
              </div>
              <n-icon size="32" color="#18a058"><CubeOutline /></n-icon>
            </div>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card embedded>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <n-text depth="3" style="font-size: 13px;">今日入库</n-text>
                <div style="font-size: 28px; font-weight: 600; margin-top: 4px;">{{ summary.todayInbound || 0 }}</div>
              </div>
              <n-icon size="32" color="#2080f0"><ArrowDownCircleOutline /></n-icon>
            </div>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card embedded>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <n-text depth="3" style="font-size: 13px;">今日出库</n-text>
                <div style="font-size: 28px; font-weight: 600; margin-top: 4px;">{{ summary.todayOutbound || 0 }}</div>
              </div>
              <n-icon size="32" color="#8a2d0b"><ArrowUpCircleOutline /></n-icon>
            </div>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card embedded>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <n-text depth="3" style="font-size: 13px;">低库存预警</n-text>
                <div style="font-size: 28px; font-weight: 600; margin-top: 4px; color: #d03050;">{{ summary.lowStock || 0 }}</div>
              </div>
              <n-icon size="32" color="#d03050"><AlertCircleOutline /></n-icon>
            </div>
          </n-card>
        </n-gi>
      </n-grid>
    </n-card>

    <n-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <n-icon size="20" color="#18a058"><FolderOutline /></n-icon>
            <span>库存明细</span>
          </div>
          <n-space>
            <n-select
              v-model:value="filters.categoryId"
              placeholder="选择分类"
              :options="categoryOptions"
              clearable
              style="width: 160px;"
            />
            <n-input
              v-model:value="filters.keyword"
              placeholder="搜索食材名称"
              clearable
              style="width: 200px;"
            >
              <template #prefix>
                <n-icon><SearchOutline /></n-icon>
              </template>
            </n-input>
            <n-button @click="fetchData">
              <template #icon>
                <n-icon><RefreshOutline /></n-icon>
              </template>
              刷新
            </n-button>
          </n-space>
        </div>
      </template>

      <n-data-table
        :columns="columns"
        :data="displayData"
        :loading="loading"
        :pagination="pagination"
        :row-props="rowProps"
        remote
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      />
    </n-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, h } from 'vue'
import { useMessage, NTag, NButton, NIcon } from 'naive-ui'
import {
  BarChartOutline,
  CubeOutline,
  ArrowDownCircleOutline,
  ArrowUpCircleOutline,
  AlertCircleOutline,
  FolderOutline,
  SearchOutline,
  RefreshOutline,
  EyeOutline
} from '@vicons/ionicons5'
import { getInventoryList, getInventorySummary, getLowStockList } from '@/api/inventory'
import { getCategoryTree } from '@/api/category'
import { formatDate, formatNumber } from '@/utils'

const message = useMessage()

const loading = ref(false)
const dataList = ref([])
const summary = ref({})
const categoryOptions = ref([])

const filters = reactive({
  keyword: '',
  categoryId: null
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  itemCount: 0
})

const displayData = computed(() => {
  let list = [...dataList.value]
  if (filters.keyword) {
    const kw = filters.keyword.toLowerCase()
    list = list.filter(item => item.name?.toLowerCase().includes(kw))
  }
  if (filters.categoryId) {
    list = list.filter(item => item.categoryId === filters.categoryId)
  }
  pagination.itemCount = list.length
  const start = (pagination.page - 1) * pagination.pageSize
  return list.slice(start, start + pagination.pageSize)
})

const columns = [
  {
    title: '食材名称',
    key: 'name',
    minWidth: 160,
    sorter: (a, b) => (a.name || '').localeCompare(b.name || '')
  },
  {
    title: '分类',
    key: 'categoryName',
    minWidth: 120
  },
  {
    title: '规格',
    key: 'spec',
    minWidth: 100
  },
  {
    title: '单位',
    key: 'unit',
    width: 80
  },
  {
    title: '库存数量',
    key: 'quantity',
    width: 120,
    align: 'right',
    sorter: (a, b) => (a.quantity || 0) - (b.quantity || 0),
    render: (row) => formatNumber(row.quantity)
  },
  {
    title: '单价(元)',
    key: 'price',
    width: 120,
    align: 'right',
    render: (row) => formatNumber(row.price)
  },
  {
    title: '库存金额(元)',
    key: 'totalValue',
    width: 140,
    align: 'right',
    render: (row) => formatNumber((row.quantity || 0) * (row.price || 0))
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => {
      if ((row.quantity || 0) <= 0) {
        return h(NTag, { type: 'error', size: 'small' }, { default: () => '缺货' })
      }
      if (row.isLowStock || (row.warningThreshold && (row.quantity || 0) <= row.warningThreshold)) {
        return h(NTag, { type: 'warning', size: 'small' }, { default: () => '低库存' })
      }
      return h(NTag, { type: 'success', size: 'small' }, { default: () => '正常' })
    }
  },
  {
    title: '最后更新',
    key: 'updatedAt',
    width: 180,
    render: (row) => formatDate(row.updatedAt)
  }
]

function rowProps(row) {
  if ((row.quantity || 0) <= 0 || (row.warningThreshold && (row.quantity || 0) <= row.warningThreshold)) {
    return { style: 'background-color: #fff7f7;' }
  }
  return {}
}

async function fetchData() {
  loading.value = true
  try {
    const [inventoryRes, summaryRes, categoryRes] = await Promise.all([
      getInventoryList(),
      getInventorySummary(),
      getCategoryTree()
    ])
    dataList.value = inventoryRes.data?.list || inventoryRes.data || inventoryRes || []
    const rawSummary = summaryRes.data || summaryRes || {}
    summary.value = {
      total: rawSummary.totalItems || 0,
      todayInbound: 0,
      todayOutbound: 0,
      lowStock: rawSummary.expireWarningCount || 0,
      totalQuantity: rawSummary.totalQuantity || 0,
      totalAmount: rawSummary.totalAmount || 0,
      batchCount: rawSummary.batchCount || 0
    }
    categoryOptions.value = flattenCategories(categoryRes.data || categoryRes || [])
  } catch (e) {
    dataList.value = []
    summary.value = {}
    categoryOptions.value = []
    console.error('fetch dashboard data error:', e)
  } finally {
    loading.value = false
  }
}

function flattenCategories(list, result = []) {
  list.forEach(item => {
    result.push({ label: item.name, value: item.id })
    if (item.children?.length) {
      flattenCategories(item.children, result)
    }
  })
  return result
}

function handlePageChange(page) {
  pagination.page = page
}

function handlePageSizeChange(size) {
  pagination.pageSize = size
  pagination.page = 1
}

onMounted(fetchData)
</script>

<style scoped>
.dashboard {
  padding: 0;
}
</style>
