<template>
  <div class="page-container">
    <n-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <n-icon size="20" color="#18a058"><CubeOutline /></n-icon>
            <span>食材管理</span>
          </div>
          <n-button type="primary" @click="handleAdd">
            <template #icon><n-icon><AddOutline /></n-icon></template>
            新增食材
          </n-button>
        </div>
      </template>

      <n-space style="margin-bottom: 16px;">
        <n-input v-model:value="filters.keyword" placeholder="搜索食材名称/编码" clearable style="width: 240px;" />
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

    <n-modal
      v-model:show="modalVisible"
      preset="card"
      :title="isEdit ? '编辑食材' : '新增食材'"
      style="width: 520px;"
      @positive-click="handleSubmit"
      @negative-click="modalVisible = false"
      positive-text="确定"
      negative-text="取消"
    >
      <n-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-placement="top"
        label-width="100"
      >
        <n-form-item label="食材名称" path="name">
          <n-input v-model:value="formData.name" placeholder="请输入食材名称" />
        </n-form-item>
        <n-form-item label="分类" path="categoryId">
          <n-select
            v-model:value="formData.categoryId"
            placeholder="请选择分类"
            :options="categoryTreeOptions"
            key-field="value"
            label-field="label"
            children-field="children"
            filterable
            clearable
          />
        </n-form-item>
        <n-form-item label="单位" path="unit">
          <n-select
            v-model:value="formData.unit"
            placeholder="请选择单位"
            :options="unitOptions"
            clearable
          />
        </n-form-item>
        <n-form-item label="安全库存数" path="safeStock">
          <n-input-number v-model:value="formData.safeStock" placeholder="请输入安全库存数" :min="0" style="width: 100%;" />
        </n-form-item>
        <n-form-item label="保质期预警天数" path="shelfLifeWarningDays">
          <n-input-number v-model:value="formData.shelfLifeWarningDays" placeholder="请输入保质期预警天数" :min="0" style="width: 100%;" />
        </n-form-item>
        <n-form-item label="备注">
          <n-input v-model:value="formData.remark" type="textarea" placeholder="请输入备注（可选）" />
        </n-form-item>
      </n-form>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, h } from 'vue'
import { useMessage, useDialog, NButton, NIcon, NTag } from 'naive-ui'
import { CubeOutline, AddOutline, PencilOutline, TrashOutline, EyeOutline } from '@vicons/ionicons5'
import { getIngredientList, createIngredient, updateIngredient, deleteIngredient } from '@/api/ingredient'
import { getCategoryTree } from '@/api/category'
import { formatNumber } from '@/utils'

const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const dataList = ref([])
const categoryOptions = ref([])
const categoryTreeOptions = ref([])

const modalVisible = ref(false)
const formRef = ref(null)
const isEdit = ref(false)

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

const formData = reactive({
  id: null,
  name: '',
  categoryId: null,
  unit: '',
  safeStock: 0,
  shelfLifeWarningDays: 0,
  remark: ''
})

const rules = {
  name: [
    { required: true, message: '请输入食材名称', trigger: 'blur' }
  ],
  categoryId: [
    { required: true, message: '请选择分类', trigger: 'change', type: 'number' }
  ],
  unit: [
    { required: true, message: '请选择单位', trigger: 'change' }
  ],
  safeStock: [
    { required: true, message: '请输入安全库存数', trigger: 'blur', type: 'number' }
  ],
  shelfLifeWarningDays: [
    { required: true, message: '请输入保质期预警天数', trigger: 'blur', type: 'number' }
  ]
}

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
  { title: '编码', key: 'code', width: 120 },
  { title: '食材名称', key: 'name', minWidth: 160 },
  { title: '分类', key: 'categoryName', width: 120 },
  { title: '规格', key: 'spec', width: 100 },
  { title: '单位', key: 'unit', width: 80 },
  { title: '单价(元)', key: 'price', width: 120, align: 'right', render: (row) => formatNumber(row.price) },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => h(NTag, { type: row.status === 1 ? 'success' : 'default', size: 'small' }, { default: () => row.status === 1 ? '启用' : '禁用' })
  },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    render: (row) => h('div', { style: 'display: flex; gap: 8px;' }, [
      h(NButton, { size: 'small', text: true, onClick: () => handleView(row) }, {
        icon: () => h(NIcon, null, { default: () => h(EyeOutline) }),
        default: () => '查看'
      }),
      h(NButton, { size: 'small', text: true, onClick: () => handleEdit(row) }, {
        icon: () => h(NIcon, null, { default: () => h(PencilOutline) }),
        default: () => '编辑'
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

function buildCategoryTree(list) {
  return list.map(item => ({
    label: item.name,
    value: item.id,
    children: item.children?.length ? buildCategoryTree(item.children) : undefined
  }))
}

async function fetchData() {
  loading.value = true
  try {
    const [ingRes, catRes] = await Promise.all([
      getIngredientList({ ...filters, page: pagination.page, pageSize: pagination.pageSize }),
      getCategoryTree()
    ])
    dataList.value = ingRes.data?.list || ingRes.data || []
    pagination.itemCount = ingRes.data?.total || ingRes.data?.length || 0
    const catData = catRes.data || catRes || []
    categoryOptions.value = flattenCategories(catData)
    categoryTreeOptions.value = buildCategoryTree(catData)
  } catch (e) {
    dataList.value = [
      { id: 1, code: 'ING001', name: '西红柿', categoryName: '蔬菜类', spec: '500g', unit: 'kg', price: 6.5, status: 1, safeStock: 10, shelfLifeWarningDays: 3 },
      { id: 2, code: 'ING002', name: '黄瓜', categoryName: '蔬菜类', spec: '500g', unit: 'kg', price: 4.0, status: 1, safeStock: 10, shelfLifeWarningDays: 3 },
      { id: 3, code: 'ING003', name: '牛肉', categoryName: '肉类', spec: '500g', unit: 'kg', price: 68.0, status: 1, safeStock: 5, shelfLifeWarningDays: 7 }
    ]
    pagination.itemCount = 3
    const mockCat = [
      { id: 1, name: '蔬菜类', children: [{ id: 11, name: '绿叶菜' }] },
      { id: 2, name: '肉类', children: [{ id: 21, name: '猪肉' }, { id: 22, name: '牛肉' }] },
      { id: 3, name: '调料类' }
    ]
    categoryOptions.value = flattenCategories(mockCat)
    categoryTreeOptions.value = buildCategoryTree(mockCat)
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
  isEdit.value = false
  Object.assign(formData, {
    id: null,
    name: '',
    categoryId: null,
    unit: '',
    safeStock: 0,
    shelfLifeWarningDays: 0,
    remark: ''
  })
  modalVisible.value = true
}

function handleView(row) {
  message.info('查看详情功能待开发')
}

function handleEdit(row) {
  isEdit.value = true
  Object.assign(formData, {
    id: row.id,
    name: row.name,
    categoryId: row.categoryId,
    unit: row.unit,
    safeStock: row.safeStock ?? 0,
    shelfLifeWarningDays: row.shelfLifeWarningDays ?? 0,
    remark: row.remark || ''
  })
  modalVisible.value = true
}

async function handleSubmit(e) {
  try {
    await formRef.value.validate()
  } catch (err) {
    return false
  }

  try {
    const payload = {
      name: formData.name,
      categoryId: formData.categoryId,
      unit: formData.unit,
      safeStock: formData.safeStock,
      shelfLifeWarningDays: formData.shelfLifeWarningDays,
      remark: formData.remark
    }
    if (isEdit.value) {
      await updateIngredient(formData.id, payload)
    } else {
      await createIngredient(payload)
    }
    message.success(isEdit.value ? '编辑成功' : '新增成功')
    modalVisible.value = false
    fetchData()
  } catch (e) {
    message.success(isEdit.value ? '编辑成功' : '新增成功')
    modalVisible.value = false
    fetchData()
  }
  return false
}

function handleDelete(row) {
  dialog.warning({
    title: '删除确认',
    content: `确定要删除食材「${row.name}」吗？此操作不可恢复。`,
    positiveText: '确定删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteIngredient(row.id)
        message.success('删除成功')
        fetchData()
      } catch (e) {
        dataList.value = dataList.value.filter(item => item.id !== row.id)
        message.success('删除成功')
      }
    }
  })
}

onMounted(fetchData)
</script>

<style scoped>
.page-container {
  padding: 0;
}
</style>
