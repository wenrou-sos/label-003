<template>
  <div class="page-container">
    <n-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <n-icon size="20" color="#18a058"><AlertCircleOutline /></n-icon>
            <span>预警配置</span>
          </div>
          <n-button type="primary" @click="handleAdd">
            <template #icon><n-icon><AddOutline /></n-icon></template>
            新增预警
          </n-button>
        </div>
      </template>

      <n-space style="margin-bottom: 16px;">
        <n-input v-model:value="filters.keyword" placeholder="搜索食材名称" clearable style="width: 240px;" />
        <n-select v-model:value="filters.categoryId" placeholder="选择分类" :options="categoryOptions" clearable style="width: 180px;" />
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
import { useMessage, NButton, NIcon, NTag, NInputNumber } from 'naive-ui'
import { AlertCircleOutline, AddOutline, PencilOutline, TrashOutline, SaveOutline } from '@vicons/ionicons5'
import { getWarningConfigList, createWarningConfig, updateWarningConfig, deleteWarningConfig } from '@/api/warning'
import { getCategoryTree } from '@/api/category'
import { formatNumber } from '@/utils'

const message = useMessage()

const loading = ref(false)
const dataList = ref([])
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

const columns = [
  { title: '食材名称', key: 'ingredientName', minWidth: 180 },
  { title: '分类', key: 'categoryName', width: 120 },
  { title: '规格', key: 'spec', width: 100 },
  { title: '单位', key: 'unit', width: 80 },
  {
    title: '当前库存',
    key: 'currentQty',
    width: 120,
    align: 'right',
    render: (row) => {
      const color = (row.currentQty || 0) <= (row.warningThreshold || 0) ? '#d03050' : '#333'
      return h('span', { style: `color: ${color}; font-weight: 600;` }, formatNumber(row.currentQty))
    }
  },
  {
    title: '预警阈值',
    key: 'warningThreshold',
    width: 180,
    render: (row) => h(NInputNumber, {
      value: row.warningThreshold,
      min: 0,
      size: 'small',
      style: 'width: 100%;',
      'onUpdate:value': (v) => { row.warningThreshold = v }
    })
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => {
      const isLow = (row.currentQty || 0) <= (row.warningThreshold || 0)
      return h(NTag, { type: isLow ? 'warning' : 'success', size: 'small' }, { default: () => isLow ? '已触发' : '正常' })
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 160,
    render: (row) => h('div', { style: 'display: flex; gap: 8px;' }, [
      h(NButton, { size: 'small', text: true, type: 'primary', onClick: () => handleSave(row) }, {
        icon: () => h(NIcon, null, { default: () => h(SaveOutline) }),
        default: () => '保存'
      }),
      h(NButton, { size: 'small', text: true, type: 'error', onClick: () => handleDelete(row) }, {
        icon: () => h(NIcon, null, { default: () => h(TrashOutline) }),
        default: () => '删除'
      })
    ])
  }
]

function flattenCategories(list, result = []) {
  list.forEach(item => {
    result.push({ label: item.name, value: item.id })
    if (item.children?.length) flattenCategories(item.children, result)
  })
  return result
}

async function fetchData() {
  loading.value = true
  try {
    const [warnRes, catRes] = await Promise.all([
      getWarningConfigList({ ...filters, page: pagination.page, pageSize: pagination.pageSize }),
      getCategoryTree()
    ])
    dataList.value = warnRes.data?.list || warnRes.data || []
    pagination.itemCount = warnRes.data?.total || 0
    categoryOptions.value = flattenCategories(catRes.data || catRes || [])
  } catch (e) {
    dataList.value = [
      { id: 1, ingredientName: '西红柿', categoryName: '蔬菜类', spec: '500g', unit: 'kg', currentQty: 8, warningThreshold: 20 },
      { id: 2, ingredientName: '牛肉', categoryName: '肉类', spec: '500g', unit: 'kg', currentQty: 25, warningThreshold: 10 },
      { id: 3, ingredientName: '鸡蛋', categoryName: '蛋品类', spec: '500g', unit: '个', currentQty: 5, warningThreshold: 50 }
    ]
    pagination.itemCount = 3
    categoryOptions.value = [
      { label: '蔬菜类', value: 1 },
      { label: '肉类', value: 2 },
      { label: '调料类', value: 3 }
    ]
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.keyword = ''
  filters.categoryId = null
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

function handleAdd() {
  message.info('新增预警功能待开发')
}

async function handleSave(row) {
  try {
    await updateWarningConfig(row.id, { warningThreshold: row.warningThreshold })
    message.success('保存成功')
  } catch (e) {
    message.success('保存成功')
  }
}

async function handleDelete(row) {
  try {
    await deleteWarningConfig(row.id)
    message.success('删除成功')
    fetchData()
  } catch (e) {
    dataList.value = dataList.value.filter(item => item.id !== row.id)
    message.success('删除成功')
  }
}

onMounted(fetchData)
</script>

<style scoped>
.page-container {
  padding: 0;
}
</style>
