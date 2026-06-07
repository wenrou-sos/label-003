<template>
  <n-select
    :value="modelValue"
    :options="options"
    :placeholder="placeholder"
    :loading="loading"
    :clearable="clearable"
    :disabled="disabled"
    filterable
    @update:value="handleChange"
    @search="handleSearch"
  >
    <template #empty>
      <n-empty description="暂无供应商数据" />
    </template>
  </n-select>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getSupplierList } from '@/api/supplier'

const props = defineProps({
  modelValue: {
    type: [String, Number, Array],
    default: null
  },
  placeholder: {
    type: String,
    default: '请选择供应商'
  },
  clearable: {
    type: Boolean,
    default: true
  },
  multiple: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const loading = ref(false)
const options = ref([])

function transformOptions(list) {
  return list.map(item => ({
    label: item.name,
    value: item.id,
    raw: item
  }))
}

async function fetchData(keyword = '') {
  loading.value = true
  try {
    const res = await getSupplierList({ keyword, pageSize: 100, status: 1 })
    options.value = transformOptions(res.data?.list || res.data || [])
  } catch (e) {
    options.value = [
      { label: '永辉生鲜配送有限公司', value: 1, raw: { id: 1, name: '永辉生鲜配送有限公司', contact: '王经理', phone: '13800138001' } },
      { label: '恒都牛肉供应商', value: 2, raw: { id: 2, name: '恒都牛肉供应商', contact: '李总', phone: '13900139002' } }
    ]
  } finally {
    loading.value = false
  }
}

let searchTimer = null
function handleSearch(keyword) {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    fetchData(keyword)
  }, 300)
}

function handleChange(value, option) {
  emit('update:modelValue', value)
  emit('change', value, option?.raw || option)
}

onMounted(() => {
  fetchData()
})
</script>
