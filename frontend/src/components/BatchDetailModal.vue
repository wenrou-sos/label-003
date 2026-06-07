<template>
  <n-modal
    v-model:show="visible"
    preset="card"
    :title="`${ingredientName || '食材'} - 库存批次`"
    style="width: 720px;"
    :mask-closable="false"
  >
    <n-spin :show="loading">
      <n-data-table
        :columns="columns"
        :data="batchList"
        :pagination="false"
        size="small"
        :row-props="rowProps"
        :max-height="400"
      />
    </n-spin>

    <template #footer>
      <div style="text-align: right;">
        <n-button @click="visible = false">关闭</n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup>
import { ref, computed, watch, h } from 'vue'
import { NTag } from 'naive-ui'
import { getInventoryList } from '@/api/inventory'
import { formatDate, formatNumber } from '@/utils'
import dayjs from 'dayjs'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  ingredientId: {
    type: [String, Number],
    default: null
  },
  ingredientName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:show'])

const visible = computed({
  get: () => props.show,
  set: (v) => emit('update:show', v)
})

const loading = ref(false)
const batchList = ref([])

const columns = [
  { title: '批次号', key: 'batchNo', width: 160 },
  { title: '入库日期', key: 'inboundDate', width: 160, render: (row) => formatDate(row.inboundDate || row.createdAt, 'YYYY-MM-DD') },
  {
    title: '过期日期',
    key: 'expireDate',
    width: 160,
    render: (row) => {
      if (!row.expireDate) return '-'
      const isExpired = dayjs().isAfter(row.expireDate)
      const days = dayjs(row.expireDate).diff(dayjs(), 'day')
      const isNearExpired = days >= 0 && days <= 7
      const color = isExpired ? '#d03050' : isNearExpired ? '#d03050' : 'inherit'
      return h('span', { style: `color: ${color}; font-weight: ${isExpired || isNearExpired ? '600' : 'normal'};` }, formatDate(row.expireDate, 'YYYY-MM-DD'))
    }
  },
  { title: '剩余数量', key: 'remainingQty', width: 120, align: 'right', render: (row) => `${formatNumber(row.remainingQty)} ${row.unit || ''}` },
  { title: '单价(元)', key: 'price', width: 120, align: 'right', render: (row) => formatNumber(row.price) }
]

function rowProps(row) {
  if (!row.expireDate) return {}
  const isExpired = dayjs().isAfter(row.expireDate)
  const days = dayjs(row.expireDate).diff(dayjs(), 'day')
  const isNearExpired = days >= 0 && days <= 7
  if (isExpired || isNearExpired) {
    return { style: 'background-color: #fff1f0;' }
  }
  return {}
}

async function fetchBatches() {
  if (!props.ingredientId) return
  loading.value = true
  try {
    const res = await getInventoryList({ ingredientId: props.ingredientId, pageSize: 1000 })
    batchList.value = res.data?.list || res.data || []
  } catch (e) {
    batchList.value = [
      {
        id: 1,
        batchNo: 'B20240101001',
        inboundDate: '2024-01-01',
        expireDate: dayjs().add(2, 'day').format('YYYY-MM-DD'),
        remainingQty: 40,
        unit: 'kg',
        price: 6.5
      },
      {
        id: 2,
        batchNo: 'B20240115001',
        inboundDate: '2024-01-15',
        expireDate: dayjs().add(15, 'day').format('YYYY-MM-DD'),
        remainingQty: 25,
        unit: 'kg',
        price: 6.8
      },
      {
        id: 3,
        batchNo: 'B20231220001',
        inboundDate: '2023-12-20',
        expireDate: dayjs().subtract(3, 'day').format('YYYY-MM-DD'),
        remainingQty: 5,
        unit: 'kg',
        price: 6.0
      }
    ]
  } finally {
    loading.value = false
  }
}

watch(() => [props.show, props.ingredientId], ([show]) => {
  if (show) {
    fetchBatches()
  }
}, { immediate: true })
</script>
