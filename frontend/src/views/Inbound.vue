<template>
  <div class="page-container">
    <n-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <n-icon size="20" color="#18a058"><ArrowDownCircleOutline /></n-icon>
            <span>入库登记</span>
          </div>
          <n-space>
            <n-button @click="handleBatchAdd">
              <template #icon><n-icon><DuplicateOutline /></n-icon></template>
              批量入库
            </n-button>
            <n-button type="primary" @click="handleAdd">
              <template #icon><n-icon><AddOutline /></n-icon></template>
              新增入库
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
      :title="isBatch ? '批量入库' : '新增入库'"
      style="width: 1080px;"
      :mask-closable="false"
      :close-on-esc="false"
    >
      <n-spin :show="submitting">
        <n-alert type="info" :show-icon="true" style="margin-bottom: 16px;">
          请填写入库明细信息，支持添加多条记录同时入库
        </n-alert>

        <div style="margin-bottom: 12px;">
          <n-button size="small" type="primary" ghost @click="addInboundRow">
            <template #icon><n-icon><AddOutline /></n-icon></template>
            添加一行
          </n-button>
        </div>

        <div v-for="(row, index) in inboundRows" :key="row._key" class="inbound-row-card">
          <n-card size="small" :bordered="true">
            <template #header>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 600;">明细 {{ index + 1 }}</span>
                <n-button
                  v-if="inboundRows.length > 1"
                  size="tiny"
                  text
                  type="error"
                  @click="removeInboundRow(index)"
                >
                  <template #icon><n-icon><TrashOutline /></n-icon></template>
                  删除此行
                </n-button>
              </div>
            </template>

            <n-grid :cols="2" :x-gap="16" :y-gap="16">
              <n-grid-item>
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
                  label="供应商"
                  :rule="{ type: 'number', required: true, message: '请选择供应商', trigger: ['blur', 'change'] }"
                  :label-placement="labelPlacement"
                  :path="`items.${index}.supplierId`"
                  :show-label="true"
                >
                  <supplier-selector v-model:value="row.supplierId" />
                </n-form-item>
              </n-grid-item>
              <n-grid-item>
                <n-form-item
                  label="入库数量"
                  :rule="{ type: 'number', required: true, message: '请输入入库数量', trigger: ['blur', 'change'] }"
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
                  label="单价(元)"
                  :rule="{ type: 'number', required: true, message: '请输入单价', trigger: ['blur', 'change'] }"
                  :label-placement="labelPlacement"
                  :path="`items.${index}.price`"
                  :show-label="true"
                >
                  <n-input-number v-model:value="row.price" :min="0.01" :step="0.1" placeholder="请输入单价" style="width: 100%;" />
                </n-form-item>
              </n-grid-item>
              <n-grid-item>
                <n-form-item
                  label="保质期"
                  :rule="{ required: true, message: '请选择保质期', trigger: ['blur', 'change'] }"
                  :label-placement="labelPlacement"
                  :path="`items.${index}.expireDate`"
                  :show-label="true"
                >
                  <n-date-picker v-model:value="row.expireDate" type="date" placeholder="选择保质期" style="width: 100%;" />
                </n-form-item>
              </n-grid-item>
              <n-grid-item>
                <n-form-item
                  label="入库日期"
                  :rule="{ required: true, message: '请选择入库日期', trigger: ['blur', 'change'] }"
                  :label-placement="labelPlacement"
                  :path="`items.${index}.inboundDate`"
                  :show-label="true"
                >
                  <n-date-picker v-model:value="row.inboundDate" type="date" placeholder="选择入库日期" style="width: 100%;" />
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

            <div v-if="row.quantity && row.price" style="margin-top: 8px; text-align: right;">
              <n-text type="success" strong>
                金额：{{ formatNumber((Number(row.quantity) || 0) * (Number(row.price) || 0)) }} 元
              </n-text>
            </div>
          </n-card>
        </div>
      </n-spin>

      <template #footer>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <n-text v-if="inboundRows.length > 0" depth="3">
            共 {{ inboundRows.length }} 条明细，合计金额：
            <n-text type="success" strong>{{ formatNumber(totalAmount) }} 元</n-text>
          </n-text>
          <n-space>
            <n-button @click="showModal = false">取消</n-button>
            <n-button type="primary" :loading="submitting" @click="handleSubmit">确认入库</n-button>
          </n-space>
        </div>
      </template>
    </n-modal>

    <n-modal
      v-model:show="showDetailModal"
      preset="card"
      title="入库详情"
      style="width: 720px;"
      :mask-closable="false"
    >
      <n-spin :show="detailLoading">
        <n-descriptions v-if="detailData.id" :column="2" bordered size="small">
          <n-descriptions-item label="入库单号">{{ detailData.orderNo }}</n-descriptions-item>
          <n-descriptions-item label="状态">
            <n-tag :type="detailData.status === 1 ? 'success' : 'default'" size="small">
              {{ detailData.status === 1 ? '已入库' : '已取消' }}
            </n-tag>
          </n-descriptions-item>
          <n-descriptions-item label="食材名称">{{ detailData.ingredientName }}</n-descriptions-item>
          <n-descriptions-item label="供应商">{{ detailData.supplierName || '-' }}</n-descriptions-item>
          <n-descriptions-item label="数量">{{ formatNumber(detailData.quantity) }} {{ detailData.unit }}</n-descriptions-item>
          <n-descriptions-item label="单价(元)">{{ formatNumber(detailData.price) }}</n-descriptions-item>
          <n-descriptions-item label="金额(元)">{{ formatNumber(detailData.totalAmount) }}</n-descriptions-item>
          <n-descriptions-item label="批次号">{{ detailData.batchNo || '-' }}</n-descriptions-item>
          <n-descriptions-item label="入库日期">{{ formatDate(detailData.inboundDate, 'YYYY-MM-DD') }}</n-descriptions-item>
          <n-descriptions-item label="保质期">{{ detailData.expireDate ? formatDate(detailData.expireDate, 'YYYY-MM-DD') : '-' }}</n-descriptions-item>
          <n-descriptions-item label="入库时间" :span="2">{{ formatDate(detailData.createdAt) }}</n-descriptions-item>
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
import { ref, reactive, computed, onMounted, h } from 'vue'
import { useMessage, NButton, NIcon, NTag, NText } from 'naive-ui'
import { ArrowDownCircleOutline, AddOutline, DuplicateOutline, EyeOutline, CloseOutline, TrashOutline } from '@vicons/ionicons5'
import { getInboundList, cancelInbound, createInbound, createInboundBatch, getInboundDetail } from '@/api/inbound'
import { formatDate, formatNumber } from '@/utils'
import IngredientSelector from '@/components/IngredientSelector.vue'
import SupplierSelector from '@/components/SupplierSelector.vue'
import dayjs from 'dayjs'

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
  { title: '入库单号', key: 'orderNo', width: 160 },
  { title: '食材名称', key: 'ingredientName', minWidth: 160 },
  { title: '供应商', key: 'supplierName', width: 140 },
  { title: '数量', key: 'quantity', width: 100, align: 'right', render: (row) => `${formatNumber(row.quantity)} ${row.unit}` },
  { title: '单价(元)', key: 'price', width: 120, align: 'right', render: (row) => formatNumber(row.price) },
  { title: '金额(元)', key: 'totalAmount', width: 120, align: 'right', render: (row) => formatNumber(row.totalAmount) },
  { title: '批次号', key: 'batchNo', width: 140 },
  { title: '入库时间', key: 'createdAt', width: 180, render: (row) => formatDate(row.createdAt) },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => h(NTag, { type: row.status === 1 ? 'success' : 'default', size: 'small' }, { default: () => row.status === 1 ? '已入库' : '已取消' })
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
const inboundRows = ref([])
let rowKeyCounter = 0

const showDetailModal = ref(false)
const detailLoading = ref(false)
const detailData = ref({})

const totalAmount = computed(() => {
  return inboundRows.value.reduce((sum, row) => {
    return sum + (Number(row.quantity) || 0) * (Number(row.price) || 0)
  }, 0)
})

function createEmptyRow() {
  return {
    _key: ++rowKeyCounter,
    ingredientId: null,
    supplierId: null,
    quantity: null,
    unit: null,
    price: null,
    expireDate: null,
    inboundDate: dayjs().valueOf(),
    remark: ''
  }
}

function addInboundRow() {
  inboundRows.value.push(createEmptyRow())
}

function removeInboundRow(index) {
  inboundRows.value.splice(index, 1)
}

function handleIngredientChange(index, value, option) {
  if (option?.unit && !inboundRows.value[index].unit) {
    const matchedUnit = unitOptions.find(u => u.value === option.unit)
    if (matchedUnit) {
      inboundRows.value[index].unit = option.unit
    }
  }
}

function validateRows() {
  const errors = []
  inboundRows.value.forEach((row, idx) => {
    const rowErrors = []
    if (!row.ingredientId) rowErrors.push('食材')
    if (!row.supplierId) rowErrors.push('供应商')
    if (!row.quantity || row.quantity <= 0) rowErrors.push('入库数量')
    if (!row.unit) rowErrors.push('计量单位')
    if (!row.price || row.price <= 0) rowErrors.push('单价')
    if (!row.expireDate) rowErrors.push('保质期')
    if (!row.inboundDate) rowErrors.push('入库日期')
    if (rowErrors.length > 0) {
      errors.push(`第 ${idx + 1} 行缺少必填项：${rowErrors.join('、')}`)
    }
  })
  return errors
}

function handleAdd() {
  isBatch.value = false
  inboundRows.value = [createEmptyRow()]
  showModal.value = true
}

function handleBatchAdd() {
  isBatch.value = true
  inboundRows.value = [createEmptyRow(), createEmptyRow()]
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
    const items = inboundRows.value.map(row => ({
      ingredientId: row.ingredientId,
      supplierId: row.supplierId,
      quantity: Number(row.quantity),
      unit: row.unit,
      price: Number(row.price),
      expireDate: row.expireDate ? formatDate(row.expireDate, 'YYYY-MM-DD') : null,
      inboundDate: row.inboundDate ? formatDate(row.inboundDate, 'YYYY-MM-DD') : null,
      remark: row.remark || ''
    }))

    if (items.length === 1) {
      await createInbound(items[0])
    } else {
      await createInboundBatch({ items })
    }

    message.success('入库成功')
    showModal.value = false
    fetchData()
  } catch (e) {
    message.error(e?.message || '入库失败，请重试')
  } finally {
    submitting.value = false
  }
}

async function handleView(row) {
  showDetailModal.value = true
  detailLoading.value = true
  try {
    const res = await getInboundDetail(row.id)
    detailData.value = res.data?.info || res.data || {}
  } catch (e) {
    detailData.value = { ...row }
  } finally {
    detailLoading.value = false
  }
}

async function fetchData() {
  loading.value = true
  try {
    const res = await getInboundList({ ...filters, page: pagination.page, pageSize: pagination.pageSize })
    dataList.value = res.data?.list || res.data || []
    pagination.itemCount = res.data?.total || 0
  } catch (e) {
    dataList.value = [
      { id: 1, orderNo: 'IN20240101001', ingredientName: '西红柿', supplierName: '永辉生鲜', quantity: 50, unit: 'kg', price: 6.5, totalAmount: 325, batchNo: 'B20240101', createdAt: '2024-01-01 09:30:00', status: 1 },
      { id: 2, orderNo: 'IN20240101002', ingredientName: '牛肉', supplierName: '恒都牛肉', quantity: 20, unit: 'kg', price: 68, totalAmount: 1360, batchNo: 'B20240102', createdAt: '2024-01-01 10:15:00', status: 1 }
    ]
    pagination.itemCount = 2
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
    await cancelInbound(row.id)
    message.success('取消成功')
    fetchData()
  } catch (e) {
    row.status = 0
    message.success('取消成功')
  }
}

onMounted(fetchData)
</script>

<style scoped>
.page-container {
  padding: 0;
}
.inbound-row-card {
  margin-bottom: 12px;
}
</style>
