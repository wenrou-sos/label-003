<template>
  <div class="page-container">
    <n-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <n-icon size="20" color="#18a058"><ClipboardOutline /></n-icon>
            <span>盘点管理</span>
          </div>
          <n-button type="primary" @click="handleAdd">
            <template #icon><n-icon><AddOutline /></n-icon></template>
            新建盘点单
          </n-button>
        </div>
      </template>

      <n-space style="margin-bottom: 16px;">
        <n-input v-model:value="filters.keyword" placeholder="搜索盘点单号" clearable style="width: 240px;" />
        <n-select v-model:value="filters.status" placeholder="盘点状态" :options="statusOptions" clearable style="width: 160px;" />
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

    <n-modal
      v-model:show="showAddModal"
      preset="dialog"
      title="新建盘点单"
      :mask-closable="false"
      positive-text="确认创建"
      negative-text="取消"
      @positive-click="handleSubmitAdd"
      @negative-click="showAddModal = false"
    >
      <n-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-placement="left"
        label-width="80"
      >
        <n-form-item label="盘点名称" path="name">
          <n-input v-model:value="formData.name" placeholder="请输入盘点名称" maxlength="50" />
        </n-form-item>
        <n-form-item label="备注" path="remark">
          <n-input
            v-model:value="formData.remark"
            type="textarea"
            placeholder="请输入备注（选填）"
            :autosize="{ minRows: 3, maxRows: 5 }"
            maxlength="200"
          />
        </n-form-item>
      </n-form>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, h } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage, useDialog, NButton, NIcon, NTag } from 'naive-ui'
import { ClipboardOutline, AddOutline, EyeOutline, CheckmarkOutline, TrashOutline } from '@vicons/ionicons5'
import { getStocktakeList, submitStocktake, deleteStocktake, createStocktake } from '@/api/stocktake'
import { formatDate } from '@/utils'

const router = useRouter()
const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const dataList = ref([])

const showAddModal = ref(false)
const formRef = ref(null)
const formData = reactive({
  name: '',
  remark: ''
})
const formRules = {
  name: [
    { required: true, message: '请输入盘点名称', trigger: 'blur' },
    { min: 1, max: 50, message: '长度在 1 到 50 个字符', trigger: 'blur' }
  ]
}

const statusOptions = [
  { label: '草稿', value: 0 },
  { label: '已提交', value: 1 },
  { label: '已完成', value: 2 }
]

const filters = reactive({
  keyword: '',
  status: null,
  dateRange: null
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  itemCount: 0
})

const columns = [
  { title: '盘点单号', key: 'orderNo', width: 180 },
  { title: '盘点名称', key: 'name', minWidth: 180 },
  { title: '盘点人', key: 'operator', width: 100 },
  { title: '盘点项数', key: 'itemCount', width: 100, align: 'right' },
  { title: '差异项数', key: 'diffCount', width: 100, align: 'right', render: (row) => row.diffCount > 0 ? h('span', { style: 'color: #d03050; font-weight: 600;' }, row.diffCount) : row.diffCount },
  { title: '创建时间', key: 'createdAt', width: 180, render: (row) => formatDate(row.createdAt) },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => {
      const typeMap = { 0: 'default', 1: 'warning', 2: 'success' }
      const textMap = { 0: '草稿', 1: '已提交', 2: '已完成' }
      return h(NTag, { type: typeMap[row.status] || 'default', size: 'small' }, { default: () => textMap[row.status] || '未知' })
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    render: (row) => h('div', { style: 'display: flex; gap: 8px;' }, [
      h(NButton, { size: 'small', text: true, onClick: () => handleView(row) }, {
        icon: () => h(NIcon, null, { default: () => h(EyeOutline) }),
        default: () => '详情'
      }),
      h(NButton, { size: 'small', text: true, type: 'primary', onClick: () => handleSubmit(row), disabled: row.status !== 0 }, {
        icon: () => h(NIcon, null, { default: () => h(CheckmarkOutline) }),
        default: () => '提交'
      }),
      h(NButton, { size: 'small', text: true, type: 'error', onClick: () => handleDelete(row), disabled: row.status !== 0 }, {
        icon: () => h(NIcon, null, { default: () => h(TrashOutline) }),
        default: () => '删除'
      })
    ])
  }
]

async function fetchData() {
  loading.value = true
  try {
    const res = await getStocktakeList({ ...filters, page: pagination.page, pageSize: pagination.pageSize })
    dataList.value = res.data?.list || res.data || []
    pagination.itemCount = res.data?.total || 0
  } catch (e) {
    dataList.value = []
    pagination.itemCount = 0
    console.error('fetch stocktake list error:', e)
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.keyword = ''
  filters.status = null
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

function handleAdd() {
  formData.name = ''
  formData.remark = ''
  showAddModal.value = true
}

async function handleSubmitAdd(e) {
  try {
    await formRef.value.validate()
  } catch (err) {
    e.preventDefault()
    return
  }
  try {
    const res = await createStocktake({ name: formData.name, remark: formData.remark })
    message.success('创建成功')
    showAddModal.value = false
    fetchData()
    if (res.data?.id) {
      router.push({ name: 'StocktakeDetail', params: { id: res.data.id } })
    }
  } catch (e) {
    console.error('create stocktake error:', e)
  }
}

function handleView(row) {
  router.push({ name: 'StocktakeDetail', params: { id: row.id } })
}

async function handleSubmit(row) {
  try {
    await submitStocktake(row.id)
    message.success('提交成功')
    fetchData()
  } catch (e) {
    console.error('submit stocktake error:', e)
  }
}

async function handleDelete(row) {
  try {
    await deleteStocktake(row.id)
    message.success('删除成功')
    fetchData()
  } catch (e) {
    console.error('delete stocktake error:', e)
  }
}

onMounted(fetchData)
</script>

<style scoped>
.page-container {
  padding: 0;
}
</style>
