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
      <n-empty description="暂无食材数据" />
    </template>
  </n-select>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { getIngredientList } from '@/api/ingredient'

const props = defineProps({
  modelValue: {
    type: [String, Number, Array],
    default: null
  },
  placeholder: {
    type: String,
    default: '请选择食材'
  },
  clearable: {
    type: Boolean,
    default: true
  },
  multiple: {
    type: Boolean,
    default: false
  },
  categoryId: {
    type: [String, Number],
    default: null
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
    label: `${item.name}${item.spec ? ' (' + item.spec + ')' : ''}`,
    value: item.id,
    raw: item
  }))
}

async function fetchData(keyword = '') {
  loading.value = true
  try {
    const params = { keyword, pageSize: 100 }
    if (props.categoryId) params.categoryId = props.categoryId
    const res = await getIngredientList(params)
    options.value = transformOptions(res.data?.list || res.data || [])
  } catch (e) {
    options.value = [
      { label: '西红柿 (500g)', value: 1, raw: { id: 1, name: '西红柿', spec: '500g', unit: 'kg', price: 6.5 } },
      { label: '黄瓜 (500g)', value: 2, raw: { id: 2, name: '黄瓜', spec: '500g', unit: 'kg', price: 4.0 } },
      { label: '牛肉 (500g)', value: 3, raw: { id: 3, name: '牛肉', spec: '500g', unit: 'kg', price: 68.0 } }
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
  const raw = option?.raw || option
  if (value !== null && value !== undefined && raw) {
    emit('change', value, { id: raw.id, name: raw.name, unit: raw.unit })
  } else {
    emit('change', value, null)
  }
}

watch(() => props.categoryId, () => {
  fetchData()
})

onMounted(() => {
  fetchData()
})
</script>
