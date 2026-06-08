<template>
  <div class="page-container">
    <n-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <n-icon size="20" color="#18a058"><ArrowUpCircleOutline /></n-icon>
            <span>出库领料</span>
          </div>
          <n-space>
            <n-tag type="info">先进先出（FIFO）</n-tag>
            <n-button @click="handleBatchOutbound">
              <template #icon><n-icon><DuplicateOutline /></n-icon></template>
              批量出库
            </n-button>
            <n-button type="primary" @click="handleAdd">
              <template #icon><n-icon><AddOutline /></n-icon></template>
              新增出库
            </n-button>
          </n-space>
        </div>
      </template>

      <n-space style="margin-bottom: 16px;">
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

    <n-modal
      v-model:show="showModal"
      preset="card"
      :title="isBatch ? '批量出库' : '新增出库'"
      style="width: 1000px;"
      :mask-closable="false"
      :close-on-esc="false"
    >
      <n-spin :show="submitting">
        <n-alert type="warning" :show-icon="true" style="margin-bottom: 16px;">
          将按先进先出（FIFO）规则扣减库存，优先出库最早入库的批次
        </n-alert>

        <div style="margin-bottom: 12px;">
          <n-button size="small" type="primary" ghost @click="addOutboundRow">
            <template #icon><n-icon><AddOutline /></n-icon></template>
            添加一行
          </n-button>
        </div>

        <div v-for="(row, index) in outboundRows" :key="row._key" class="outbound-row-card">
          <n-card size="small" :bordered="true">
            <template #header>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 600;">明细 {{ index + 1 }}</span>
                <n-button
                  v-if="outboundRows.length > 1"
                  size="tiny"
                  text
                  type="error"
                  @click="removeOutboundRow(index)"
                >
                  <template #icon><n-icon><TrashOutline /></n-icon></template>
                  删除此行
                </n-button>
              </div>
            </template>

            <n-grid :cols="2" :x-gap="16" :y-gap="16">
              <n-grid-item :span="2">
                <n-form-item
                  label="食材"
                  :rule="{ type: 'number', required: true, message: '请选择食材', trigger: ['blur', 'change'] }"
                  :label-placement="labelPlacement"
                  :path="`items.${index}.ingredientId`"
                  :show-label="true"
                >
                  <ingredient-selector v-model:value="row.ingredientId" @change="(v, opt) => handleIngredientChange(index, v, opt)" />
                </n-form-item>
              </n-grid-item>
              <n-grid-item>
                <n-form-item
                  label="出库数量"
                  :rule="{ type: 'number', required: true, message: '请输入出库数量', trigger: ['blur', 'change'] }"
                  :label-placement="labelPlacement"
                  :path="`items.${index}.quantity`"
                  :show-label="true"
                >
                  <n-input-number v-model:value="row.quantity" :min="0.01" :step="1" placeholder="请输入数量" style="width: 100%;" />
                </n-form-item>
              </n-grid-item>
              <n-grid-item>
                <n-form-item
                  label="计量单位"
                  :rule="{ required: true, message: '请选择计量单位', trigger: ['blur', 'change'] }"
                  :label-placement="labelPlacement"
                  :path="`items.${index}.unit`"
                  :show-label="true"
                >
                  <n-select v-model:value="row.unit" :options="unitOptions" placeholder="请选择单位" />
                </n-form-item>
              </n-grid-item>
              <n-grid-item>
                <n-form-item
                  label="用途/领用部门"
                  :rule="{ required: true, message: '请输入用途或领用部门', trigger: ['blur', 'change'] }"
                  :label-placement="labelPlacement"
                  :path="`items.${index}.department`"
                  :show-label="true"
                >
                  <n-input v-model:value="row.department" placeholder="例：后厨、前厅、员工餐等" />
                </n-form-item>
              </n-grid-item>
              <n-grid-item>
                <n-form-item
                  label="领用人"
                  :rule="{ required: true, message: '请输入领用人', trigger: ['blur', 'change'] }"
                  :label-placement="labelPlacement"
                  :path="`items.${index}.operator`"
                  :show-label="true"
                >
                  <n-input v-model:value="row.operator" placeholder="请输入领用人姓名" />
                </n-form-item>
              </n-grid-item>
              <n-grid-item :span="2">
                <n-form-item
                  label="备注"
                  :label-placement="labelPlacement"
                  :path="`items.${index}.remark`"
                  :show-label="true"
                >
                  <n-input v-model:value="row.remark" placeholder="请输入备注信息（选填）" />
                </n-form-item>
              </n-grid-item>
            </n-grid>
          </n-card>
        </div>
      </n-spin>

      <template #footer>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <n-text v-if="outboundRows.length > 0" depth="3">
            共 {{ outboundRows.length }} 条出库明细
          </n-text>
          <n-space>
            <n-button @click="showModal = false">取消</n-button>
            <n-button type="primary" :loading="submitting" @click="handleSubmit">确认出库</n-button>
          </n-space>
        </div>
      </template>
    </n-modal>

    <n-modal
      v-model:show="showDetailModal"
      preset="card"
      title="出库详情"
      style="width: 720px;"
      :mask-closable="false"
    >
      <n-spin :show="detailLoading">
        <n-descriptions v-if="detailData.id" :column="2" bordered size="small">
          <n-descriptions-item label="出库单号">{{ detailData.orderNo }}</n-descriptions-item>
          <n-descriptions-item label="状态">
            <n-tag :type="detailData.status === 1 ? 'success' : 'default'" size="small">
              {{ detailData.status === 1 ? '已出库' : '已取消' }}
            </n-tag>
          </n-descriptions-item>
          <n-descriptions-item label="食材名称">{{ detailData.ingredientName }}</n-descriptions-item>
          <n-descriptions-item label="领用部门">{{ detailData.department || '-' }}</n-descriptions-item>
          <n-descriptions-item label="领用人">{{ detailData.operator || '-' }}</n-descriptions-item>
          <n-descriptions-item label="批次号">{{ detailData.batchNo || '-' }}</n-descriptions-item>
          <n-descriptions-item label="数量">{{ formatNumber(detailData.quantity) }} {{ detailData.unit }}</n-descriptions-item>
          <n-descriptions-item label="单价(元)">{{ formatNumber(detailData.price) }}</n-descriptions-item>
          <n-descriptions-item label="金额(元)">{{ formatNumber(detailData.totalAmount) }}</n-descriptions-item>
          <n-descriptions-item label="出库时间">{{ formatDate(detailData.createdAt) }}</n-descriptions-item>
          <n-descriptions-item label="备注" :span="2">{{ detailData.remark || '-' }}</n-descriptions-item>
        </n-descriptions>
      </n-spin>
      <template #footer>
        <div style="text-align: right;">
          <n-button @click="showDetailModal = false">关闭</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, h } from 'vue'
import { useMessage, NButton, NIcon, NTag, NText } from 'naive-ui'
import { ArrowUpCircleOutline, AddOutline, DuplicateOutline, EyeOutline, CloseOutline, TrashOutline } from '@vicons/ionicons5'
import { getOutboundList, cancelOutbound, createOutbound, createOutboundBatch, getOutboundDetail } from '@/api/outbound'
import { formatDate, formatNumber } from '@/utils'
import IngredientSelector from '@/components/IngredientSelector.vue'

const message = useMessage()

const loading = ref(false)
const dataList = ref([])

const filters = reactive({
  keyword: '',
  dateRange: null
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  itemCount: 0
})

const columns = [
  { title: '出库单号', key: 'orderNo', width: 160 },
  { title: '食材名称', key: 'ingredientName', minWidth: 160 },
  { title: '领用部门', key: 'department', width: 120 },
  { title: '领用人', key: 'operator', width: 100 },
  { title: '数量', key: 'quantity', width: 100, align: 'right', render: (row) => `${formatNumber(row.quantity)} ${row.unit}` },
  { title: '单价(元)', key: 'price', width: 120, align: 'right', render: (row) => formatNumber(row.price) },
  { title: '金额(元)', key: 'totalAmount', width: 120, align: 'right', render: (row) => formatNumber(row.totalAmount) },
  { title: '批次号', key: 'batchNo', width: 140 },
  { title: '出库时间', key: 'createdAt', width: 180, render: (row) => formatDate(row.createdAt) },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => h(NTag, { type: row.status === 1 ? 'success' : 'default', size: 'small' }, { default: () => row.status === 1 ? '已出库' : '已取消' })
  },
  {
    title: '操作',
    key: 'actions',
    width: 160,
    render: (row) => h('div', { style: 'display: flex; gap: 8px;' }, [
      h(NButton, { size: 'small', text: true, onClick: () => handleView(row) }, {
        icon: () => h(NIcon, null, { default: () => h(EyeOutline) }),
        default: () => '详情'
      }),
      h(NButton, { size: 'small', text: true, type: 'error', onClick: () => handleCancel(row), disabled: row.status !== 1 }, {
        icon: () => h(NIcon, null, { default: () => h(CloseOutline) }),
        default: () => '取消'
      })
    ])
  }
]

const unitOptions = [
  { label: 'kg', value: 'kg' },
  { label: '斤', value: '斤' },
  { label: 'g', value: 'g' },
  { label: '个', value: '个' },
  { label: '包', value: '包' },
  { label: '瓶', value: '瓶' },
  { label: '盒', value: '盒' },
  { label: '袋', value: '袋' }
]

const labelPlacement = 'left'

const showModal = ref(false)
const isBatch = ref(false)
const submitting = ref(false)
const outboundRows = ref([])
let rowKeyCounter = 0

const showDetailModal = ref(false)
const detailLoading = ref(false)
const detailData = ref({})

function createEmptyRow() {
  return {
    _key: ++rowKeyCounter,
    ingredientId: null,
    quantity: null,
    unit: null,
    department: '',
    operator: '',
    remark: ''
  }
}

function addOutboundRow() {
  outboundRows.value.push(createEmptyRow())
}

function removeOutboundRow(index) {
  outboundRows.value.splice(index, 1)
}

function handleIngredientChange(index, value, option) {
  if (option?.unit && !outboundRows.value[index].unit) {
    const matchedUnit = unitOptions.find(u => u.value === option.unit)
    if (matchedUnit) {
      outboundRows.value[index].unit = option.unit
    }
  }
}

function validateRows() {
  const errors = []
  outboundRows.value.forEach((row, idx) => {
    const rowErrors = []
    if (!row.ingredientId) rowErrors.push('食材')
    if (!row.quantity || row.quantity <= 0) rowErrors.push('出库数量')
    if (!row.unit) rowErrors.push('计量单位')
    if (!row.department?.trim()) rowErrors.push('用途/领用部门')
    if (!row.operator?.trim()) rowErrors.push('领用人')
    if (rowErrors.length > 0) {
      errors.push(`第 ${idx + 1} 行缺少必填项：${rowErrors.join('、')}`)
    }
  })
  return errors
}

function handleAdd() {
  isBatch.value = false
  outboundRows.value = [createEmptyRow()]
  showModal.value = true
}

function handleBatchOutbound() {
  isBatch.value = true
  outboundRows.value = [createEmptyRow(), createEmptyRow()]
  showModal.value = true
}

async function handleSubmit() {
  const errors = validateRows()
  if (errors.length > 0) {
    message.error(errors.join('\n'))
    return
  }

  submitting.value = true
  try {
    const items = outboundRows.value.map(row => ({
      ingredientId: row.ingredientId,
      quantity: Number(row.quantity),
      unit: row.unit,
      department: row.department?.trim() || '',
      operator: row.operator?.trim() || '',
      remark: row.remark || ''
    }))

    if (items.length === 1) {
      await createOutbound(items[0])
    } else {
      await createOutboundBatch({ items })
    }

    message.success('出库成功')
    showModal.value = false
    fetchData()
  } catch (e) {
    message.error(e?.message || '出库失败，请重试')
  } finally {
    submitting.value = false
  }
}

async function handleView(row) {
  showDetailModal.value = true
  detailLoading.value = true
  try {
    const res = await getOutboundDetail(row.id)
    detailData.value = res.data?.info || res.data || {}
  } catch (e) {
    detailData.value = {}
    console.error('fetch outbound detail error:', e)
  } finally {
    detailLoading.value = false
  }
}

async function fetchData() {
  loading.value = true
  try {
    const res = await getOutboundList({ ...filters, page: pagination.page, pageSize: pagination.pageSize })
    dataList.value = res.data?.list || res.data || []
    pagination.itemCount = res.data?.total || 0
  } catch (e) {
    dataList.value = []
    pagination.itemCount = 0
    console.error('fetch outbound list error:', e)
  } finally {
    loading.value = false
  }
}

function resetFilters() {
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

async function handleCancel(row) {
  try {
    await cancelOutbound(row.id)
    message.success('取消成功')
    fetchData()
  } catch (e) {
    console.error('cancel outbound error:', e)
  }
}

onMounted(fetchData)
</script>

<style scoped>
.page-container {
  padding: 0;
}
.outbound-row-card {
  margin-bottom: 12px;
}
</style>
